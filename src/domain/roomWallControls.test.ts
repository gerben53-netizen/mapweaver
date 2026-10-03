import { expect, it } from 'vitest'
import { generateRoom, type RoomRecipe } from './roomGenerator'
import { WALL_PRESETS, wallPreset } from './wallPresets'
import { defaultMapStyle } from './mapSettings'
import { openingCutout, openingPlacement } from './openings'
import { wallPaintPath, wallWinding } from './wallAlignment'
import { createWall, SIMPLE_WALL } from './walls'
import { wallRibbon } from './wallGeometry'
import { pathGeometry, reversePath, validatePath } from './paths'
const map = { ...defaultMapStyle(), width: 2000, height: 2000, background: null }
map.grid = { ...map.grid, cellSize: 50, physicalScale: { unit: 'ft', distancePerCell: 5 } }
const recipe: RoomRecipe = { name: '', shape: 'square', width: 30, height: 30, floor: { kind: 'pattern', assetId: 'wood', mode: 'repeat', scale: .5, rotation: 0, offsetX: 0, offsetY: 0 }, walls: wallPreset('timber', map), doors: 2, doorWidth: 3, doorType: 'single', seed: 48217 }
const make = (feet: number, shape: RoomRecipe['shape'] = 'square') => generateRoom(map, { ...recipe, shape, walls: { ...recipe.walls, strokeWidth: feet * 10 } }, { x: 500, y: 500 })
it('offers seven reusable concrete presets in physical units, with independent defaults', () => {
 expect(WALL_PRESETS.map(p => wallPreset(p.id, map).strokeWidth)).toEqual([10,10,20,30,30,30,50])
 const metric = { ...map, grid: { ...map.grid, physicalScale: { unit: 'm' as const, distancePerCell: 1.524 } } }
 expect(wallPreset('living-wood', metric).strokeWidth).toBeCloseTo(20)
 expect(wallPreset('living-wood', { ...map, grid: { ...map.grid, physicalScale: undefined } }).wall.unit).toBe('cells')
 const a=wallPreset('timber',map);a.wall.outline.enabled=true;expect(wallPreset('timber',map).wall.outline.enabled).toBe(false)
})
it.each([.5,1,2,3,5])('%s ft grows only outward around exactly six usable cells', feet => {
 const r=make(feet)
 expect(r.floor).toMatchObject({x:350,y:350,width:300,height:300,fill:recipe.floor})
 expect(r.floor.width/map.grid.cellSize).toBe(6);expect(r.outerWidth).toBe(300+feet*20);expect(r.outerHeight).toBe(r.outerWidth)
 expect(r.wall).toMatchObject({strokeWidth:feet*10,wall:{alignment:'outside',unit:'ft',pixelsPerUnit:10}})
 expect(pathGeometry(r.wall).bounds).toEqual({x:350,y:350,right:650,bottom:650})
 expect(wallPaintPath(r.wall).strokeWidth).toBe(feet*20)
 for(const o of r.doors){const cut=openingCutout(o,r.wall),p=openingPlacement(o,r.wall);expect(o.openingWidth).toBe(30);expect(cut.length).toBeGreaterThan(4);const span=cut.map(v=>v.x*-p.tangent.y+v.y*p.tangent.x);expect(Math.max(...span)-Math.min(...span)).toBeGreaterThan(feet*20);expect(o.width).toBeGreaterThan(feet*10)}
})
it.each(['circle','oval'] as const)('keeps %s interior curve and floor unchanged at every thickness', shape => {
 const first=make(.5,shape)
 for(const feet of [1,2,3,5]){const r=make(feet,shape);expect(r.floor.geometry).toEqual(first.floor.geometry);expect(r.floor.patternFrame).toEqual(first.floor.patternFrame);expect(r.floor.fill).toEqual(first.floor.fill);expect(r.outerWidth).toBe(300+feet*20)}
})
it('retains old walls exactly; reverse/reflection derive exterior from winding', () => {
 const old=createWall([{id:'a',x:0,y:0,mode:'corner'},{id:'b',x:400,y:0,mode:'corner'}],false,SIMPLE_WALL),before=JSON.stringify(old)
 expect(wallPaintPath(old)).toBe(old);expect(JSON.stringify(validatePath(old))).toBe(before)
 const p=make(2).wall,reverse=reversePath(p);expect(wallWinding(p)).toBe(-wallWinding(reverse));expect(reverse.wall).toEqual(p.wall)
 expect(()=>validatePath({...p,closed:false})).toThrow(/closed/)
})
it.each([0,-1,NaN,Infinity,52])('rejects invalid wall thickness %s ft', feet => {expect(()=>make(feet)).toThrow()})
it.each([.5,1,2,3,5])('native miter joins at %s ft meet exact outer corners without overhang', feet => {
 const room=make(feet),ribbon=wallRibbon(wallPaintPath(room.wall)),points=ribbon.polygons.flat(),t=feet*10
 expect(Math.min(...points.map(p=>p.x))).toBeCloseTo(350-t)
 expect(Math.max(...points.map(p=>p.x))).toBeCloseTo(650+t)
 expect(Math.min(...points.map(p=>p.y))).toBeCloseTo(350-t)
 expect(Math.max(...points.map(p=>p.y))).toBeCloseTo(650+t)
 for(const x of [350-t,650+t])for(const y of [350-t,650+t])expect(points.some(p=>Math.abs(p.x-x)<1e-7&&Math.abs(p.y-y)<1e-7)).toBe(true)
})
