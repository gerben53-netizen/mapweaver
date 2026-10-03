import { expect, it } from 'vitest'
import { DEFAULT_HEX, hexFootprint, validateHexSettings } from './hexLandShape'
import { applyLandStroke, defaultLandBrush, landFootprint, type LandBrush } from './landBrush'
import { createArea, rectangleGeometry, geometryBounds, validateArea, signedArea } from './areas'
import { defaultLandArea } from './landAreas'
import { mapToScreen, screenToMap } from '../canvas/viewport'
const center={x:500,y:400}
const brush:LandBrush={...defaultLandBrush,shape:'hexagon',size:200,hex:DEFAULT_HEX}
const input={lands:[],editable:[],map:{width:1200,height:800},brush,points:[center],seed:1,newId:'hex'}
it.each(['flat','pointy'] as const)('creates six equal straight sides with canonical %s dimensions',orientation=>{
  const ring=hexFootprint(center,200,{...DEFAULT_HEX,orientation})
  expect(ring).toHaveLength(6)
  ring.forEach((p,i)=>{expect(Math.hypot(p.x-center.x,p.y-center.y)).toBeCloseTo(100,9);const q=ring[(i+1)%6];expect(Math.hypot(q.x-p.x,q.y-p.y)).toBeCloseTo(100,9)})
  const bounds=geometryBounds({polygons:[{outer:ring,holes:[]}]})
  expect(bounds.width).toBeCloseTo(orientation==='flat'?200:Math.sqrt(3)*100)
  expect(bounds.height).toBeCloseTo(orientation==='flat'?Math.sqrt(3)*100:200)
  const o=applyLandStroke({...input,brush:{...brush,hex:{...DEFAULT_HEX,orientation}}}).added[0]
  expect(o.geometry.polygons[0].outer).toHaveLength(6);validateArea(o)
  expect(o.land?.role).toBe('landmass');expect(o.land?.appearance?.coast).toBe('fantasy')
})
it('rotates explicitly without following stroke heading, noise, softness or smoothing',()=>{
  expect(hexFootprint(center,200,{...DEFAULT_HEX,rotation:30})).toEqual(hexFootprint(center,200,{...DEFAULT_HEX,orientation:'pointy'}))
  expect(landFootprint(center,{...brush,softness:1,roughness:1,smoothing:'high'},123,2)).toEqual(landFootprint(center,brush,1,0))
  for(const rotation of [0,30,60,127,360])expect(Math.abs(signedArea(hexFootprint(center,200,{...DEFAULT_HEX,rotation})))).toBeCloseTo(3*Math.sqrt(3)*10000/2)
  expect(()=>validateHexSettings({...DEFAULT_HEX,rotation:NaN})).toThrow()
})
it.each(['soft','rough'] as const)('keeps all six anchors and bounds %s irregularity',edge=>{
  const exact=hexFootprint(center,200),ring=hexFootprint(center,200,{...DEFAULT_HEX,edge},1,0,'off')
  expect(ring).toHaveLength(96)
  exact.forEach((p,i)=>expect(ring[i*16]).toEqual(p))
  ring.forEach((p,i)=>{const a=exact[Math.floor(i/16)],b=exact[(Math.floor(i/16)+1)%6],t=(i%16)/16;expect(Math.hypot(p.x-(a.x+(b.x-a.x)*t),p.y-(a.y+(b.y-a.y)*t))).toBeLessThanOrEqual(edge==='soft'?3.5:11)})
  expect(Math.abs(signedArea(ring))/Math.abs(signedArea(exact))).toBeGreaterThan(.9)
  const o=applyLandStroke({...input,brush:{...brush,hex:{...DEFAULT_HEX,edge}}}).added[0]
  validateArea(o);expect(o.geometry.polygons[0].outer.length).toBeGreaterThan(6)
  exact.forEach(p=>expect(Math.min(...o.geometry.polygons[0].outer.map(q=>Math.hypot(p.x-q.x,p.y-q.y)))).toBeLessThan(1e-6))
  expect(hexFootprint(center,200,{...DEFAULT_HEX,edge},1,0,'high')).not.toEqual(ring)
})
it.each(['exact','soft','rough'] as const)('removes a %s hex lake, cuts a bay and removes an entire island',edge=>{
  const land={...createArea(rectangleGeometry({x:200,y:100,width:650,height:600})),id:'land',land:defaultLandArea('landmass')}
  const remove={...input,lands:[land],editable:['land'],brush:{...brush,action:'remove' as const,hex:{...DEFAULT_HEX,edge}}}
  const lake=applyLandStroke(remove).replacements[0];expect(lake.geometry.polygons[0].holes[0].length).toBeGreaterThanOrEqual(6);validateArea(lake)
  expect(applyLandStroke({...remove,points:[{x:850,y:400}]}).replacements[0].geometry.polygons[0].holes).toHaveLength(0)
  const island=applyLandStroke(input).added[0]
  expect(applyLandStroke({...remove,lands:[island],editable:['hex'],brush:{...remove.brush,size:400}}).removed).toEqual(['hex'])
})
it.each([.5,1,4])('keeps the same logical footprint at zoom %s',zoom=>{
  const v={zoom,pan:{x:25,y:40}},p=screenToMap(mapToScreen(center,v),v)
  expect(applyLandStroke({...input,points:[p]})).toEqual(applyLandStroke(input))
})
it('joins an exact drag into straight-edged coverage with stable orientation',()=>{
  const r=applyLandStroke({...input,points:[center,{x:700,y:400}]})
  expect(r.added).toHaveLength(1);validateArea(r.added[0]);expect(r.added[0].width).toBeCloseTo(400)
})
