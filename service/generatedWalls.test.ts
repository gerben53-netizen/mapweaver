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
it('keeps generated wall recipes through SQLite reopen and project ZIP transfer without scene assets',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'mapweaver-generated-')),target=new Storage(path.join(root,'target'));let source=new Storage(path.join(root,'source'))
 try{const map={...defaultMapStyle(),mapType:'battlemap' as const,geography:defaultGeography(),width:800,height:600,background:null},wall=createWall([{id:'a',x:80,y:100,mode:'corner'},{id:'b',x:700,y:100,mode:'corner'}],false,generatedWallStyle(SIMPLE_WALL,map)),now=new Date().toISOString(),doc={formatVersion:12,id:crypto.randomUUID(),name:'Generated wall',createdAt:now,modifiedAt:now,map,objects:[wall],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[wall.id]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]};const saved=source.writeProject(doc);source.close();source=new Storage(path.join(root,'source'));const read=source.project(saved.id);expect(read.document.objects).toEqual(JSON.parse(JSON.stringify([wall])));const imported=await target.importProject(await source.exportProject(saved.id));expect(imported.document.objects).toEqual(read.document.objects);expect(imported.document.assets).toEqual([]);const loaded=imported.document.objects[0];if(loaded.kind!=='path')throw Error('Expected native wall');expect(generatedPlacements(loaded)).toEqual(generatedPlacements(wall))}finally{source.close();target.close()}
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
