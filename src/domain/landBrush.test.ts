import { describe, expect, it } from 'vitest'
import { applyLandStroke, defaultLandBrush, landFootprint, LAND_SHAPES, resampleLandStroke, type LandBrush, type LandBrushInput } from './landBrush'
import { allRings, createArea, geometryBounds, rectangleGeometry, signedArea, validateArea } from './areas'
import { defaultLandArea } from './landAreas'
import { mapToScreen, screenToMap } from '../canvas/viewport'
import { generateWorld } from '../world/generate'
import { WORLD_DEFAULTS } from '../world/model'
import { isLandmass, validateLandEditing } from './landEditing'
import { canCreateWithTool } from './mapCapabilities'
const land=()=>({...createArea(rectangleGeometry({x:100,y:100,width:600,height:500})),id:'land',land:defaultLandArea('landmass')})
const input=(patch:Partial<LandBrushInput>={}):LandBrushInput=>({lands:[land()],editable:['land'],map:{width:1200,height:800},brush:{...defaultLandBrush,shape:'round',size:120,softness:0,roughness:0},points:[{x:700,y:300},{x:850,y:300}],seed:1,newId:'island',...patch})
const totalArea=(g:ReturnType<typeof land>['geometry'])=>g.polygons.reduce((s,p)=>s+Math.abs(signedArea(p.outer))-p.holes.reduce((n,h)=>n+Math.abs(signedArea(h)),0),0)
describe('semantic land brush',()=>{
 it('adds an island in water with styled semantic land',()=>{const r=applyLandStroke(input({points:[{x:1000,y:600}]}));expect(r.added).toHaveLength(1);expect(r.replacements).toHaveLength(0);expect(r.added[0].land?.role).toBe('landmass');expect(r.added[0].land?.appearance?.coast).toBe('fantasy');validateArea(r.added[0])})
 it('makes a continuous peninsula while preserving source identity/style',()=>{const i=input(),r=applyLandStroke(i);expect(r.added).toHaveLength(0);expect(r.replacements[0].id).toBe('land');expect(r.replacements[0].geometry.polygons).toHaveLength(1);expect(r.replacements[0].width).toBeGreaterThan(750);expect(r.replacements[0].fill).toEqual(i.lands[0].fill);expect(i.lands[0].width).toBe(600)})
 it('cuts a bay, creates an inland hole, and can remove a whole island',()=>{
  const i=input(),bay=applyLandStroke({...i,brush:{...i.brush,action:'remove'},points:[{x:700,y:300},{x:600,y:300}]}).replacements[0]
  expect(totalArea(bay.geometry)).toBeLessThan(totalArea(i.lands[0].geometry));expect(bay.geometry.polygons[0].holes).toHaveLength(0)
  const lake=applyLandStroke({...i,brush:{...i.brush,action:'remove'},points:[{x:400,y:350}]}).replacements[0];expect(lake.geometry.polygons[0].holes).toHaveLength(1)
  const island=applyLandStroke({...i,lands:[],points:[{x:400,y:350}]}).added[0]
  expect(applyLandStroke({...i,lands:[island],editable:[island.id],brush:{...i.brush,action:'remove',size:250},points:[{x:400,y:350}]}).removed).toEqual([island.id])
 })
 it('joins connected landmasses, keeping the first identity',()=>{
  const a=land(),z={...createArea(rectangleGeometry({x:800,y:100,width:200,height:300})),id:'second',land:defaultLandArea('landmass')}
  const r=applyLandStroke(input({lands:[a,z],editable:['land','second']}));expect(r.removed).toEqual(['second']);expect(r.replacements[0].id).toBe('land');expect(r.replacements[0].geometry.polygons).toHaveLength(1)
 })
 it('rejects touched locked land and leaves unrelated land untouched',()=>{
  expect(()=>applyLandStroke(input({editable:[]}))).toThrow('unlock')
  expect(applyLandStroke(input({editable:[],points:[{x:1000,y:700}]})).added).toHaveLength(1)
 })
 it.each(Object.keys(LAND_SHAPES) as LandBrush['shape'][])('produces valid %s geometry',shape=>{
  const r=applyLandStroke(input({lands:[],brush:{...defaultLandBrush,shape},points:[{x:500,y:400}]}));expect(r.added).toHaveLength(1);validateArea(r.added[0]);expect(allRings(r.added[0].geometry).flat().length).toBeLessThanOrEqual(512)
 })
 it('uses one framework with distinct silhouettes and elongated peninsula',()=>{
  const shapes=Object.keys(LAND_SHAPES) as LandBrush['shape'][]
  expect(new Set(shapes.map(shape=>JSON.stringify(landFootprint({x:0,y:0},{...defaultLandBrush,shape})))).size).toBe(Object.keys(LAND_SHAPES).length)
  const p=geometryBounds({polygons:[{outer:landFootprint({x:0,y:0},{...defaultLandBrush,shape:'peninsula'}),holes:[]}]});expect(p.width/p.height).toBeGreaterThan(2)
 })
 it('keeps interpolated fast and subdivided straight strokes equivalent',()=>{
  const a=input({lands:[],points:[{x:100,y:100},{x:900,y:100}]})
  expect(applyLandStroke(a)).toEqual(applyLandStroke({...a,points:Array.from({length:81},(_,i)=>({x:100+i*10,y:100}))}))
  expect(applyLandStroke(a).added[0].geometry.polygons).toHaveLength(1)
  expect(()=>resampleLandStroke([{x:0,y:0},{x:100000,y:0}],12)).toThrow('shorter')
 })
 it.each([.5,1,2,4])('keeps geometry independent of zoom %s',zoom=>{
  const i=input(),v={zoom,pan:{x:15,y:40}};expect(applyLandStroke({...i,points:i.points.map(p=>screenToMap(mapToScreen(p,v),v))})).toEqual(applyLandStroke(i))
 })
 it('softness changes threshold coverage but keeps binary valid contours',()=>{
  const sizes=[0,.5,1].map(softness=>totalArea(applyLandStroke(input({lands:[],brush:{...defaultLandBrush,softness},points:[{x:500,y:400}]})).added[0].geometry))
  expect(sizes[0]).toBeGreaterThan(sizes[1]);expect(sizes[1]).toBeGreaterThan(sizes[2])
 })
 it('roughens and smooths real coast geometry deterministically within area/node bounds',()=>{
  const i=input(),rough=applyLandStroke({...i,brush:{...i.brush,action:'roughen',roughness:.7},points:[{x:700,y:240},{x:700,y:450}]}).replacements[0]
  expect(rough.geometry).not.toEqual(i.lands[0].geometry);validateArea(rough)
  const smooth=applyLandStroke({...i,lands:[rough],brush:{...i.brush,action:'smooth',smoothing:'high',size:240},points:[{x:700,y:240},{x:700,y:450}]}).replacements[0]
  expect(smooth.geometry).not.toEqual(rough.geometry);expect(Math.abs(totalArea(smooth.geometry)-totalArea(rough.geometry))/totalArea(rough.geometry)).toBeLessThan(.03);validateArea(smooth)
  const high=landFootprint({x:0,y:0},{...defaultLandBrush,roughness:1}),low=landFootprint({x:0,y:0},{...defaultLandBrush,roughness:0});expect(high).not.toEqual(low)
 })
 it('edits generated geometry and accepts bounded manual override metadata',()=>{
  const generated=generateWorld({...WORLD_DEFAULTS,width:1200,height:800,seed:'coast-brush'}),lands=generated.objects.filter(isLandmass),first=lands[0],point=first.geometry.polygons[0].outer[0]
  const r=applyLandStroke(input({lands,editable:lands.map(o=>o.id),points:[point],brush:{...defaultLandBrush,size:100}}));r.replacements.forEach(validateArea)
  expect(validateLandEditing({version:1,manual:true,revision:2}).revision).toBe(2);expect(()=>validateLandEditing({version:2,manual:true,revision:1})).toThrow()
  expect(canCreateWithTool('battlemap','landBrush')).toBe(false)
 })
})
