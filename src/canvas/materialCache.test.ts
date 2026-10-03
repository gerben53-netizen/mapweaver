import { expect, it } from 'vitest'
import type { Shape } from 'konva/lib/Shape'
import { cacheMaterial, clearMaterialCache, materialVisible } from './materialCache'
it('caps total cache pixels under repeated material replacement and clears unmounted shapes',()=>{
  const active=new Map<object,number>(),nodes=Array.from({length:100},()=>({cache(options:{width:number;height:number;pixelRatio:number}){active.set(this,Math.ceil(options.width*options.pixelRatio)*Math.ceil(options.height*options.pixelRatio))},clearCache(){active.delete(this)}}))
  for(let cycle=0;cycle<4;cycle++)for(const node of nodes){cacheMaterial(node as unknown as Shape,2600,100,.5);expect([...active.values()].reduce((a,b)=>a+b,0)).toBeLessThanOrEqual(4_000_000)}
  for(const node of nodes)clearMaterialCache(node as unknown as Shape)
  expect(active.size).toBe(0)
})
it('uses expanded material bounds at the viewport boundary, including protrusions',()=>{
  const viewport={zoom:2,pan:{x:-200,y:0}},size={width:500,height:400}
  expect(materialVisible({x:80,y:30,width:30,height:10},viewport,size)).toBe(true)
  expect(materialVisible({x:20,y:30,width:30,height:10},viewport,size)).toBe(false)
})
