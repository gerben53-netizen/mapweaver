import { expect, it } from 'vitest'
import { createArea, rectangleGeometry, offsetObject, validateArea } from './areas'
import { createPath } from './paths'
import { transformSelection } from './selectionTransform'
import { buildSnapTargets } from './objectSnapping'
import { createLayeredContent } from './layers'
import type { AreaObject } from './models'
it('keeps texture coordinates attached to geometry through rotation, reflection and later dragging', () => {
  const original=createArea(rectangleGeometry({x:40,y:30,width:80,height:50}))
  const changed=transformSelection([original],{scale:2,rotation:35,flipX:true})[0] as AreaObject
  const [a,b,c,d,e,f]=changed.patternTransform!
  for (const point of original.geometry.polygons[0].outer) {
    // Reflection reverses canonical ring winding; compare coordinates, not indices.
    expect(changed.geometry.polygons[0].outer.some(actual=>Math.abs(actual.x-(a*point.x+c*point.y+e))<1e-6&&Math.abs(actual.y-(b*point.x+d*point.y+f))<1e-6)).toBe(true)
  }
  expect(changed.patternFrame).toEqual(original.patternFrame)
  const moved=offsetObject(changed,17,-23)
  expect(moved.patternTransform!.slice(0,4)).toEqual(changed.patternTransform!.slice(0,4))
  expect(moved.patternTransform![4]).toBeCloseTo(e+17);expect(moved.patternTransform![5]).toBeCloseTo(f-23)
  expect(()=>validateArea({...moved,patternTransform:[0,0,0,0,0,0]})).toThrow('pattern transform')
})
it('exposes actual path nodes through the shared screen-tolerance snap targets', () => {
  const path=createPath([{id:'a',x:30,y:40,mode:'corner'},{id:'b',x:147,y:93,mode:'corner'},{id:'c',x:300,y:260,mode:'corner'}])
  const state=createLayeredContent([path]),targets=buildSnapTargets(state.objects,state.layers,[],{width:1000,height:800})
  expect(targets.x.some(t=>t.position===147)).toBe(true);expect(targets.y.some(t=>t.position===93)).toBe(true)
})
