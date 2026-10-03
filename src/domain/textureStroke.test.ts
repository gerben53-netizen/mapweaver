import { expect, it } from 'vitest'
import { TextureStroke } from './textureStroke'
import { defaultTerrainBrush, type TerrainBrush } from './terrainBrush'
import { decodeMask, remapTexturePaint, textureMaterialKey, validateTexturePaint, type TerrainPaint } from './terrainPaint'
import { createArea, rectangleGeometry } from './areas'
import { defaultMapStyle } from './mapSettings'
import { exportScene } from '../export/scene'
const map={...defaultMapStyle(),width:257,height:257,background:null}
const brush={...defaultTerrainBrush,assetId:'wood',size:40,softness:0,strength:1,textureScale:1}
const floor=createArea(rectangleGeometry({x:100,y:100,width:100,height:100}))
function draw(base?:TerrainPaint,patch:Partial<TerrainBrush>={},points=[{x:60,y:60}],floors:typeof floor[]=[],hasFloors=floors.length>0){const s=new TextureStroke(base,{...brush,...patch},map,floors,hasFloors);points.forEach(p=>s.add(p));return s.finish()}
function alpha(p:TerrainPaint,x:number,y:number,base=true){const mask=(base?p.baseTiles:p.tiles)?.[`${Math.floor(x/64)},${Math.floor(y/64)}`]?.[textureMaterialKey('wood',1)];return mask?decodeMask(mask)[y%64*64+x%64]:0}
it('paints sparse base tiles without an Area; erases and blends independently of background',()=>{
 const p=draw();expect(p.tiles).toEqual({});expect(Object.keys(p.baseTiles!).length).toBe(4);expect(alpha(p,60,60)).toBe(255)
 const blend=draw(p,{mode:'blend',size:80});expect(alpha(blend,80,60)).toBeGreaterThan(0);expect(alpha(blend,79,60)).toBeLessThan(255)
 const erased=draw(p,{mode:'erase'});expect(erased.baseTiles).toEqual({});expect(erased.materials).toEqual({});expect(alpha(p,60,60)).toBe(255)
 expect(validateTexturePaint(JSON.parse(JSON.stringify(blend)))).toEqual(blend)
})
it('routes a single gesture across explicit floors and implicit base without changing Areas',()=>{
 const before=structuredClone(floor),p=draw(undefined,{},[{x:60,y:150},{x:150,y:150}],[floor]);expect(alpha(p,60,150)).toBe(255);expect(alpha(p,150,150)).toBe(0);expect(alpha(p,150,150,false)).toBe(255);expect(alpha(p,60,150,false)).toBe(0);expect(floor).toEqual(before)
 expect(alpha(draw(undefined,{},[{x:150,y:150}],[],true),150,150)).toBe(255)
})
it('preserves legacy masks including hidden paint outside explicit Areas',()=>{
 const base=draw(),legacy={...base,tiles:base.baseTiles!,baseTiles:undefined};const next=draw(legacy,{},[{x:230,y:230}],[floor]);expect(next.tiles).toEqual(legacy.tiles);expect(alpha(next,60,60)).toBe(0);expect(alpha(next,230,230)).toBe(255)
 const oldMap=draw(legacy,{mode:'erase'});expect(oldMap.tiles).toEqual({});expect(oldMap.baseTiles).toEqual({})
})
it('ignores outside starts, clips non-tile-aligned bounds and breaks paths after leaving the map',()=>{
 expect(draw(undefined,{},[{x:-5,y:40}]).baseTiles).toEqual({})
 const p=draw(undefined,{},[{x:250,y:20},{x:280,y:20},{x:280,y:230},{x:250,y:230}]);expect(alpha(p,256,20)).toBe(255);expect(alpha(p,257,20)).toBe(0);expect(alpha(p,250,120)).toBe(0)
 expect(Object.keys(p.baseTiles!).every(k=>k.split(',').every(n=>+n>=0&&+n<=4))).toBe(true)
})
it('validates and remaps both surfaces; exports base after background and before Areas',()=>{
 const p=draw(undefined,{},[{x:60,y:150},{x:150,y:150}],[floor]),remapped=remapTexturePaint(p,new Map([['wood','imported']]));expect(validateTexturePaint(remapped)).toBe(remapped);expect(Object.values(remapped.baseTiles!)[0]).toHaveProperty(textureMaterialKey('imported',1));expect(()=>validateTexturePaint({...p,baseTiles:{'-1,0':Object.values(p.baseTiles!)[0]}})).toThrow()
 const scene=exportScene({map:{...map,texturePaint:p},objects:[floor],layers:[{id:'l',name:'Objects',visible:true,locked:false,objectIds:[floor.id]}]},{scale:1,transparent:false,includeGrid:false});expect(scene.items.filter(i=>i.kind!=='fog').map(i=>i.kind)).toEqual(['color','baseTexturePaint','object','texturePaint'])
})
