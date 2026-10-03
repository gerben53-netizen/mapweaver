import { defaultGeography } from '../src/domain/geography'
import { expect,it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { Storage } from './storage'
import { generatedDefinition,generatedWallStyle } from '../src/domain/generatedWalls'
import { createWall,SIMPLE_WALL } from '../src/domain/walls'
import { generatedPlacements } from '../src/domain/generatedWallGeometry'
import { defaultMapStyle } from '../src/domain/mapSettings'
it.each([['cave-rock','dev-1'],['living-root','production-1'],['pale-palace-stone','production-1'],['marble','production-1'],['masonry-dressed','dev-1'],['masonry-rough','dev-1']])('keeps %s generated wall recipes through SQLite reopen and project ZIP transfer without scene assets',async(id,revision)=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-generated-')),target=new Storage(path.join(root,'target'));let source=new Storage(path.join(root,'source'))
 try{const map={...defaultMapStyle(),mapType:'battlemap' as const,geography:defaultGeography(),width:800,height:600,background:null},wall=createWall([{id:'a',x:80,y:100,mode:'corner'},{id:'b',x:700,y:100,mode:'corner'}],false,generatedWallStyle(SIMPLE_WALL,map,id,revision)),now=new Date().toISOString(),doc={formatVersion:12,id:crypto.randomUUID(),name:'Generated wall',createdAt:now,modifiedAt:now,map,objects:[wall],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[wall.id]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]};const saved=source.writeProject(doc);source.close();source=new Storage(path.join(root,'source'));const read=source.project(saved.id);expect(read.document.objects).toEqual(JSON.parse(JSON.stringify([wall])));const imported=await target.importProject(await source.exportProject(saved.id));expect(imported.document.objects).toEqual(read.document.objects);expect(imported.document.assets).toEqual([]);const loaded=imported.document.objects[0];if(loaded.kind!=='path')throw Error('Expected native wall');expect(generatedPlacements(loaded)).toEqual(generatedPlacements(wall))}finally{source.close();target.close()}
})
it('bundles decodable transparent PNG development components for every registered role',async()=>{
 const d=generatedDefinition({id:'living-root',revision:'dev-1'});let total=0
 for(const c of d.components){const image=sharp(path.join('public',c.image)),m=await image.metadata();expect(m.format).toBe('png');expect(m.hasAlpha).toBe(true);expect(m.width).toBeLessThanOrEqual(2048);const stats=await image.stats();expect(stats.channels[3].min).toBe(0);expect(stats.channels[3].max).toBe(255);total+=m.width*m.height}expect(total).toBeLessThan(16777216)
})

it('ships all 28 production PNGs with the unchanged canvas and clear two-pixel alpha gutter',async()=>{
 const production=generatedDefinition({id:'living-root',revision:'production-1'}),old=generatedDefinition({id:'living-root',revision:'dev-1'});let pixels=0
 for(const [i,c] of production.components.entries()){
  const image=sharp(path.join('public',c.image)),m=await image.metadata(),legacy=await sharp(path.join('public',old.components[i].image)).metadata()
  expect([m.width,m.height]).toEqual([legacy.width,legacy.height]);expect(m.format).toBe('png');expect(m.depth).toBe('uchar');expect(m.hasAlpha).toBe(true)
  const {data,info}=await image.ensureAlpha().raw().toBuffer({resolveWithObject:true});let opaque=0,edge=0
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a===255)opaque++;if((x<2||y<2||x>=info.width-2||y>=info.height-2)&&a)edge++}
  expect(opaque).toBeGreaterThan(0);expect(edge).toBe(0);pixels+=info.width*info.height
 }
 expect(pixels).toBe(1843200);expect(pixels*2).toBeLessThan(16777216)
})

it.each(['pale-palace-stone','marble'])('admits byte-identical production %s PNGs with exact footprints and safe straight-alpha gutters',async id=>{
 const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto');const provenance=JSON.parse(readFileSync('docs/wall-sets/'+id+'-production-provenance.json','utf8')),d=generatedDefinition({id,revision:'production-1'});
 for(const c of d.components){const bytes=readFileSync(path.join('public',c.image)),m=await sharp(bytes).metadata();expect(m.format).toBe('png');expect(m.depth).toBe('uchar');expect([m.width,m.height,m.channels]).toEqual([c.nominalLengthFt*256,128,4]);expect(createHash('sha256').update(bytes).digest('hex')).toBe(provenance.components.find((v:{id:string})=>v.id===c.id).sha256);const{data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});let opaque=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4,a=data[i+3];if(x<2||y<2||x>=info.width-2||y>=info.height-2)expect(a).toBe(0);if(a===0)expect([...data.subarray(i,i+3)]).toEqual([0,0,0]);if(a===255)opaque++}expect(opaque).toBeGreaterThan(info.width*info.height*.85)}
})

it('registers Marble through the existing default generated-walls content allowlist with provenance',async()=>{
 const{readFileSync}=await import('node:fs');const inventory=JSON.parse(readFileSync('docs/distribution/default-content.json','utf8'));expect(inventory.publicDirectories).toContain('generated-walls');expect(inventory.builtIn).toContain('Marmer generated masonry walls: six production-1 components');expect(inventory.attribution).toContain('docs/wall-sets/marble-production-provenance.json');expect(inventory.builtIn).toContain('Bleke paleissteen generated masonry walls: six production-1 components');
})

it('rock PNGs meet the opaque disk coverage contract without matte or unsafe alpha bounds',async()=>{
 const d=generatedDefinition({id:'cave-rock',revision:'dev-1'});for(const c of d.components){const{data,info}=await sharp(path.join('public',c.image)).ensureAlpha().raw().toBuffer({resolveWithObject:true});expect(info.width).toBe(c.nominalWidthFt*256);expect(info.height).toBe(info.width);let missingCore=0,unsafeEdge=0,opaqueOverscan=0,fringeOverscan=0,matte=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const r=Math.hypot(x+.5-info.width/2,y+.5-info.height/2)/info.width,i=(y*info.width+x)*4,a=data[i+3];if(r<.39&&a!==255)missingCore++;if(a===255&&r>.47)opaqueOverscan++;if(a>0&&r>.47+1/info.width)fringeOverscan++;if((x<2||y<2||x>=info.width-2||y>=info.height-2)&&a)unsafeEdge++;if(a===0&&(data[i]||data[i+1]||data[i+2]))matte++}expect({missingCore,unsafeEdge,opaqueOverscan,fringeOverscan,matte},c.id).toEqual({missingCore:0,unsafeEdge:0,opaqueOverscan:0,fringeOverscan:0,matte:0})}
})
