import {isDeepStrictEqual} from 'node:util'
import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate'
import {createServer} from 'vite'
import sharp from 'sharp'
const source='deliverables.local/Coastal-Contours/velanth-after.mapweaver',out='deliverables.local/World-Hierarchy',hash=b=>createHash('sha256').update(b).digest('hex'),bytes=await fs.readFile(source),files=unzipSync(bytes),before=JSON.parse(strFromU8(files['project.json']))
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/before.mapweaver',bytes)
const pack=JSON.parse(await fs.readFile('public/world-assets-painterly/mapweaver-assets.json','utf8')),assets=await Promise.all(pack.assets.filter(a=>a.generator).map(async a=>{const meta=await sharp('public/world-assets-painterly/'+a.file).metadata();return {...a,id:'hierarchy-'+a.sha256,name:a.title,width:meta.width,height:meta.height}}))
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {scatterWorld}=await server.ssrLoadModule('/src/world/scatterWorld.ts'),{parseProject}=await server.ssrLoadModule('/src/projects/format.ts')
 const previous=new Set(before.map.generation.scatter.placements.map(p=>p.id)),oldLayers=new Set(before.layers.filter(l=>l.objectIds.length&&l.objectIds.every(id=>previous.has(id))).map(l=>l.id)),base=structuredClone(before)
 base.objects=base.objects.filter(o=>!previous.has(o.id));base.layers=base.layers.filter(l=>!oldLayers.has(l.id));base.map.generation.objectIds=base.map.generation.objectIds.filter(id=>!previous.has(id));base.map.generation.layerIds=base.map.generation.layerIds.filter(id=>!oldLayers.has(id));delete base.map.generation.scatter
 for(const g of base.layerTree.groups)g.children=g.children.filter(id=>!oldLayers.has(id))
 base.layerTree.roots=base.layerTree.roots.filter(id=>!oldLayers.has(id))
 const start=performance.now(),result=scatterWorld({...base,stats:{}},{mountains:'high',forests:'high',details:'high',theme:'painterlyFantasy'},assets),ms=performance.now()-start
 const after={...base,id:'velanth-hierarchy',name:'Velanth — asset hierarchy',map:result.map,objects:result.objects,layers:result.layers,layerTree:result.layerTree},used=new Set(after.objects.filter(o=>o.kind==='stamp').map(o=>o.assetId)),archive={...files}
 after.assets=before.assets.filter(a=>used.has(a.id)||a.kind!=='stamp');for(const a of before.assets)if(a.kind==='stamp'&&!used.has(a.id))delete archive[a.path]
 for(const a of assets.filter(a=>used.has(a.id))){const data=await fs.readFile('public/world-assets-painterly/'+a.file),path='assets/'+a.sha256+'.png';archive[path]=data;after.assets.push({id:a.id,kind:'stamp',fileName:a.title,mimeType:'image/png',width:a.width,height:a.height,hash:a.sha256,path})}
 for(const o of base.objects)if(!isDeepStrictEqual(o,after.objects.find(v=>v.id===o.id)))throw Error('Non-owned artwork changed: '+o.id)
 const mapStyle=m=>Object.fromEntries(Object.entries(m).filter(([key])=>key!=='generation'));if(!isDeepStrictEqual(mapStyle(before.map),mapStyle(after.map)))throw Error('Map style changed')
 after.map.generation.layerIds=after.layers.filter(l=>l.id.startsWith('world-v1-')).map(l=>l.id)
 parseProject(after);archive['project.json']=strToU8(JSON.stringify(after));delete archive['preview.png'];await fs.writeFile(out+'/after.mapweaver',zipSync(archive))
 const tiers={},families={};for(const p of result.map.generation.scatter.placements){tiers[p.hierarchy]=(tiers[p.hierarchy]??0)+1;families[p.group]=(families[p.group]??0)+1}
 const report={source,sha256:hash(bytes),generationMs:ms,before:previous.size,after:result.map.generation.scatter.placements.length,tiers,families,images:after.assets.length,warnings:result.map.generation.scatter.warnings}
 await fs.writeFile(out+'/composition.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(hash(await fs.readFile(source))!==hash(bytes))throw Error('Source changed')
 const {fixture}=await server.ssrLoadModule('/tests/fixtures/worldScatter.ts'),{r,f}=fixture()
 for(const enabled of [false,true]){
  const candidates=enabled?assets:assets.filter(a=>!a.source.includes('hierarchy-provenance')).map(a=>{const copy=structuredClone(a);delete copy.generator.hierarchy;delete copy.generator.ridgeAxis;delete copy.generator.lighting;return copy})
  const result=scatterWorld(r,{mountains:'off',forests:'high',details:'off',theme:'painterlyFantasy'},candidates,f),label=enabled?'conifer-after':'conifer-before',selected=new Set(result.objects.filter(o=>o.kind==='stamp').map(o=>o.assetId)),archive={},resources=[]
  for(const a of assets.filter(a=>selected.has(a.id))){const bytes=await fs.readFile('public/world-assets-painterly/'+a.file),path='assets/'+a.sha256+'.png';archive[path]=bytes;resources.push({id:a.id,kind:'stamp',fileName:a.title,mimeType:'image/png',width:a.width,height:a.height,hash:a.sha256,path})}
  const doc={formatVersion:12,id:label,name:label,createdAt:before.createdAt,modifiedAt:before.modifiedAt,map:result.map,objects:result.objects,layers:result.layers,layerTree:result.layerTree,objectGroups:[],assets:resources}
  parseProject(doc);archive['project.json']=strToU8(JSON.stringify(doc));await fs.writeFile(out+'/'+label+'.mapweaver',zipSync(archive))
 }
}finally{await server.close()}
