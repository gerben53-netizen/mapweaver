import sharp from 'sharp'
import { randomUUID } from 'node:crypto'
import { existsSync, unlinkSync } from 'node:fs'
import { readZip } from '../src/projects/zip'
import { validateWallSet, WALL_SET_LIMITS } from '../src/domain/wallSets'
import type { WallSetManifest, WallSetDefinition, PackedArt, RegisteredWallSet } from '../src/domain/wallSets'
import { Storage, StorageError, hash, managedPath, validateImage } from './storage'

/** Tight convex alpha hull. A bounded support polygon avoids transparent rectangular hits. */
function silhouette(data:Buffer,width:number,height:number) {
  const points:{x:number;y:number}[]=[]
  for(let k=0;k<24;k++){
    const angle=k*Math.PI/12,dx=Math.cos(angle),dy=Math.sin(angle);let best=-Infinity,point={x:0,y:0}
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>64){const value=x*dx+y*dy;if(value>best){best=value;point={x:x+.5,y:y+.5}}}
    if(!Number.isFinite(best))throw new Error('Wall artwork is entirely transparent.')
    points.push(point)
  }
  return points
}
async function prepare(bytes:Uint8Array) {
  if(bytes.length>32*1024*1024)throw new Error('Wall set ZIP exceeds 32 MiB.')
  const files=await readZip(bytes,'wallSet')
  const manifest=validateWallSet(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(files.get('wall-set.json')))) as WallSetManifest
  const all=[...manifest.bodyVariants,...[manifest.cap,manifest.join].filter(a=>!!a)]
  if(files.size!==new Set(all.map(a=>a.file)).size+1)throw new Error('Wall set has missing or unlisted files.')
  const decoded=new Map<string,{bytes:Buffer;hull:{x:number;y:number}[];rect:{x:number;y:number}}>()
  let atlasWidth=0,atlasHeight=0,pixels=0
  for(const art of all){
    if(decoded.has(art.file))continue
    const input=files.get(art.file);if(!input)throw new Error(`Missing wall art: ${art.file}`)
    pixels+=art.width*art.height;if(pixels>WALL_SET_LIMITS.pixels)throw new Error('Wall set exceeds 16 megapixels.')
    const mime=art.file.endsWith('.png')?'image/png':'image/webp'
    const validated=await validateImage(new File([new Uint8Array(input)],art.file.split('/').at(-1)!,{type:mime}))
    if(validated.width!==art.width||validated.height!==art.height)throw new Error(`Incorrect dimensions: ${art.file}`)
    const image=sharp(input),meta=await image.metadata(),raw=await image.ensureAlpha().raw().toBuffer()
    if(manifest.renderingMode!=='continuous'&&(!meta.hasAlpha||!raw.some((v,i)=>i%4===3&&v<255)))throw new Error(`${art.file} needs a real transparent alpha background.`)
    if(manifest.renderingMode!=='continuous'&&manifest.bodyVariants.includes(art)){
      const half=manifest.nominalWidthPx*.325,step=manifest.repeatLengthPx-manifest.overlapPx
      const left=manifest.renderingMode==='strip'?0:art.anchor.x-step/2,right=manifest.renderingMode==='strip'?manifest.repeatLengthPx:art.anchor.x+step/2
      for(let y=Math.ceil(art.anchor.y-half);y<=Math.floor(art.anchor.y+half);y+=2)for(let x=Math.ceil(left);x<Math.floor(right);x+=2){
        if(x<0||x>=art.width||y<0||y>=art.height||raw[(y*art.width+x)*4+3]<240)throw new Error(`${art.file} needs an opaque central core across its placement interval. Increase overlap or repair the artwork.`)
      }
    }
    const margin=manifest.nominalWidthPx/2+manifest.roughnessLimits.maxProtrusionPx
    const hull=silhouette(raw,art.width,art.height)
    if(manifest.renderingMode!=='continuous'&&hull.some(p=>Math.abs(p.y-art.anchor.y)>margin+1))throw new Error(`${art.file} exceeds declared maxProtrusionPx.`)
    decoded.set(art.file,{bytes:await image.png().toBuffer(),hull,rect:{x:0,y:atlasHeight}})
    atlasWidth=Math.max(atlasWidth,art.width);atlasHeight+=art.height+2
  }
  if(atlasHeight>WALL_SET_LIMITS.atlasEdge||atlasWidth*atlasHeight>WALL_SET_LIMITS.pixels)throw new Error('Packed wall set exceeds atlas limits.')
  const atlas=await sharp({create:{width:atlasWidth,height:atlasHeight,channels:4,background:'#00000000'}}).composite([...decoded.values()].map(v=>({input:v.bytes,left:v.rect.x,top:v.rect.y}))).png().toBuffer()
  if(atlas.length>20*1024*1024)throw new Error('Packed wall atlas exceeds the existing 20 MiB image limit. Reduce source artwork size.')
  const pack=(art:typeof all[number]):PackedArt=>({...art,...{rect:decoded.get(art.file)!.rect,hull:decoded.get(art.file)!.hull}})
  // Includes exact source bytes and manifest; fixed revision cannot be silently replaced.
  const revision=hash(Buffer.concat([Buffer.from(JSON.stringify(manifest)),...all.map(a=>Buffer.from(files.get(a.file)!))]))
  const definition:WallSetDefinition={...manifest,atlasWidth,atlasHeight,revision,bodyVariants:manifest.bodyVariants.map(pack),cap:manifest.cap?pack(manifest.cap):undefined,join:manifest.join?pack(manifest.join):undefined}
  validateWallSet(definition,true)
  return {definition,atlas}
}
export async function prepareWallSet(bytes:Uint8Array) {
  try { return await prepare(bytes) } catch(error) {
    throw new StorageError('INVALID_WALL_SET',error instanceof Error?error.message:'Invalid wall set.')
  }
}
export function listWallSets(store:Storage):RegisteredWallSet[] {
  return (store.db.prepare('SELECT definition,assetId FROM wall_sets ORDER BY title,id,version').all() as {definition:string;assetId:string}[]).map(r=>({definition:validateWallSet(JSON.parse(r.definition),true) as WallSetDefinition,assetId:r.assetId}))
}
export function wallSetConflict(store:Storage,d:WallSetDefinition) {
  const old=store.db.prepare('SELECT revision FROM wall_sets WHERE id=? AND version=?').get(d.id,d.version) as {revision:string}|undefined
  return old ? old.revision===d.revision?'Already imported':'Version conflict: increase the manifest version; existing walls will not be replaced.' : null
}
export async function importWallSet(store:Storage,bytes:Uint8Array) {
  const {definition:d,atlas}=await prepareWallSet(bytes),conflict=wallSetConflict(store,d)
  if(conflict==='Already imported')return listWallSets(store).find(r=>r.definition.id===d.id&&r.definition.version===d.version)!
  if(conflict)throw new StorageError('WALL_SET_CONFLICT',conflict,409)
  if((store.db.prepare('SELECT COUNT(*) AS n FROM wall_sets').get() as {n:number}).n>=1000)throw new StorageError('WALL_SET_LIMIT','This library supports at most 1000 wall set revisions.')
  const digest=hash(atlas),originalPath=`assets/originals/${digest}.png`,previewPath=`assets/previews/${digest}.png`
  const thumbnail=await sharp(atlas).extract({left:0,top:0,width:d.bodyVariants[0].width,height:d.bodyVariants[0].height}).resize(192,192,{fit:'inside'}).png().toBuffer()
  const old=store.db.prepare("SELECT id FROM assets WHERE type='fill-pattern' AND sha256=?").get(digest) as {id:string}|undefined
  const created:string[]=[],id=old?.id||randomUUID(),date=new Date().toISOString()
  try {
    if(!old)for(const [relative,data] of [[originalPath,atlas],[previewPath,thumbnail]] as const){const existed=existsSync(managedPath(store.root,relative));if(!existed)created.push(relative);store.atomic(relative,data)}
    store.db.transaction(()=>{
      if(!old)store.db.prepare("INSERT INTO assets(id,type,name,originalName,mimeType,width,height,size,sha256,originalPath,previewPath,categoryId,tags,createdAt,modifiedAt) VALUES(?,'fill-pattern',?,?,'image/png',?,?,?,?,?,?,'uncategorized','[]',?,?)").run(id,d.title,`${d.id}-${d.version}.png`,d.atlasWidth,d.atlasHeight,atlas.length,digest,originalPath,previewPath,date,date)
      store.db.prepare('INSERT INTO wall_sets(id,version,title,revision,definition,assetId) VALUES(?,?,?,?,?,?)').run(d.id,d.version,d.title,d.revision,JSON.stringify(d),id)
      store.failWrite?.()
    })()
  } catch(error){for(const relative of created){const target=managedPath(store.root,relative);if(existsSync(target))unlinkSync(target)}throw error}
  return {definition:d,assetId:id}
}
