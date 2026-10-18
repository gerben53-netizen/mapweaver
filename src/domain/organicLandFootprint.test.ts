import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { allRings, createArea, geometryBounds, normalizeGeometry, rectangleGeometry, validateArea } from './areas'
import { defaultLandArea } from './landAreas'
import { applyLandStroke, defaultLandBrush, landFootprint, type LandBrush, type LandBrushInput } from './landBrush'
import { nextOrganicLandSeed, type OrganicLandShape } from './organicLandFootprint'

const shapes:OrganicLandShape[]=['organicSoft','organicRugged','organicFine']
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const land=()=>({...createArea(rectangleGeometry({x:50,y:50,width:900,height:900})),id:'land',land:defaultLandArea('landmass')})
const input=(shape:LandBrush['shape'],size=120,action:LandBrush['action']='add'):LandBrushInput=>({lands:[land()],editable:['land'],map:{width:1600,height:1400},brush:{...defaultLandBrush,shape,size,action,softness:0,roughness:.65,smoothing:'off'},points:[{x:950,y:450},{x:1000,y:500}],seed:713,newId:'new'})

describe('organic land prototype',()=>{
 it.each(shapes)('%s is deterministic, bounded, closed and valid across sizes and seeds',shape=>{
  for(const size of[12,120,1200])for(const seed of[0,1,713,0xffffffff]){
   const b={...input(shape,size).brush},p={x:1000,y:1000},ring=landFootprint(p,b,seed)
   expect(ring).toEqual(landFootprint(p,b,seed));expect(ring).not.toEqual(landFootprint(p,b,nextOrganicLandSeed(seed)))
   expect(ring).toHaveLength(72);expect(()=>normalizeGeometry({polygons:[{outer:ring,holes:[]}]})).not.toThrow()
   const bounds=geometryBounds({polygons:[{outer:ring,holes:[]}]})
   expect(bounds.width).toBeLessThanOrEqual(size+1e-8);expect(bounds.height).toBeLessThanOrEqual(size+1e-8)
   expect(Math.min(bounds.width,bounds.height)).toBeGreaterThan(size*.6)
  }
 })
 it.each(shapes)('%s uses the same spatial envelope without direction-dependent dab rotation',shape=>{
  const b=input(shape).brush,p={x:600,y:500},a=landFootprint(p,b,713,0),near=landFootprint({x:p.x+1,y:p.y},b,713,2)
  expect(landFootprint(p,b,713,0)).toEqual(landFootprint(p,b,713,Math.PI))
  expect(Math.max(...a.map((v,i)=>Math.hypot(v.x+1-near[i].x,v.y-near[i].y)))).toBeLessThan(.2)
 })
 it.each(shapes)('%s preserves Add/Remove identity, clipping, holes and valid repeated overlaps',shape=>{
  for(const size of[12,120,1200])for(const action of['add','remove']as const){const i=input(shape,size,action),r=applyLandStroke(i);expect(r.replacements.length+r.added.length).toBeGreaterThan(0);for(const o of [...r.replacements,...r.added]){validateArea(o);expect(allRings(o.geometry).every(r=>r.length<=512)).toBe(true)}}
  let i=input(shape,120)
  for(let n=0;n<5;n++){const result=applyLandStroke(i);i={...i,lands:[...result.replacements,...result.added],editable:[...result.replacements,...result.added].map(o=>o.id),seed:nextOrganicLandSeed(i.seed)};i.lands.forEach(validateArea)}
  expect(i.lands).toHaveLength(1);expect(i.lands[0].geometry.polygons).toHaveLength(1)
 })
 it.each(shapes)('%s ignores event subdivision along the same polyline',shape=>{
  const i={...input(shape,180),lands:[],editable:[],points:[{x:200,y:400},{x:600,y:400},{x:600,y:700}]}
  const slow=[...Array.from({length:41},(_,n)=>({x:200+n*10,y:400})),...Array.from({length:30},(_,n)=>({x:600,y:410+n*10}))]
  expect(applyLandStroke(i)).toEqual(applyLandStroke({...i,points:slow}))
  expect(applyLandStroke(i).added[0].geometry.polygons).toHaveLength(1)
 })
 it.each(shapes)('%s safely edits a narrow connection without invalid rings',shape=>{
  const g=normalizeGeometry({polygons:[{outer:[{x:200,y:200},{x:400,y:200},{x:400,y:290},{x:600,y:290},{x:600,y:200},{x:800,y:200},{x:800,y:500},{x:600,y:500},{x:600,y:310},{x:400,y:310},{x:400,y:500},{x:200,y:500}],holes:[]}]}),o={...createArea(g),id:'bridge',land:defaultLandArea('landmass')}
  const r=applyLandStroke({...input(shape,12,'remove'),lands:[o],editable:[o.id],points:[{x:500,y:290},{x:530,y:290}]});r.replacements.forEach(validateArea);expect(r.removed).toHaveLength(0)
 })
 it('preserves pre-prototype Round footprints and full boolean geometry hashes',()=>{
  // Captured from 645fb9a before implementation; geometry-only hashes exclude generated UUIDs.
  const records=[
   [12,'add','514ce0fc5b9aa37abf0b751b2ea89c2422c2d777e99fa03dabd8affd21f05537','34295ce0efffb115a747007b9bd06507d0355920bc84edc68661e71a0d81f13b'],
   [12,'remove','514ce0fc5b9aa37abf0b751b2ea89c2422c2d777e99fa03dabd8affd21f05537','47cdc90c60c3fafa59af48ad70edc138c4cd6625d01a1d316b12bceb71d725ea'],
   [120,'add','2256a3ecd3743acc105ba7a997dc4f85595f229bb8480554386a6018009cd40c','1cc8197a64497311ddb8078ff6c327c864682bc0cb4d73b3218076861955333a'],
   [120,'remove','2256a3ecd3743acc105ba7a997dc4f85595f229bb8480554386a6018009cd40c','f56b27b3c14aecd9c2f3cb9e46036cac51a6176a03423ef7bd7f5b9dd7efbfea'],
   [1200,'add','2f38194cdfb1440720266531e5003dc424919b38e89d5558cd6130668a6cb84b','5b585463bbf05f2c4831623b6ebddb5bf67d03fa627eeb965e43f72600b6950e'],
   [1200,'remove','2f38194cdfb1440720266531e5003dc424919b38e89d5558cd6130668a6cb84b','978d3e9442df9c3c14ab522465009b0402142deeec764a2469897ef15b68d7f0'],
  ]as const
  for(const[size,action,footprint,geometry]of records){const i=input('round',size,action);i.brush={...defaultLandBrush,shape:'round',size,action};const r=applyLandStroke(i);expect(hash(landFootprint({x:25,y:35},i.brush,713,.73))).toBe(footprint);expect(hash([...r.replacements,...r.added].map(o=>o.geometry))).toBe(geometry)}
 })
})
