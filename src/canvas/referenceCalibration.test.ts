import { expect,it } from 'vitest'
import { calibrateReference,imageToWorld,worldToImage,linkedReferenceViewport,type ReferencePair } from './referenceCalibration'
import { screenToMap,zoomAtPoint } from './viewport'
const bounds={width:1000,height:1000}
const pairs:ReferencePair[]=[{id:1,image:{x:10,y:10},map:{x:280,y:120}},{id:2,image:{x:110,y:10},map:{x:280,y:320}}]
it('fits two correspondences with uniform scale, rotation, translation and inverse',()=>{
 const t=calibrateReference(pairs,bounds,bounds);expect(t.scale).toBeCloseTo(2);expect(t.rotation).toBeCloseTo(Math.PI/2);expect(t.x).toBeCloseTo(300);expect(t.y).toBeCloseTo(100)
 for(const p of pairs){expect(imageToWorld(p.image!,t)).toEqual(p.map);expect(worldToImage(p.map!,t)).toEqual(p.image)}expect(t.maxError).toBe(0)
 const p=worldToImage(imageToWorld({x:123.45,y:67.89},t),t);expect(p.x).toBeCloseTo(123.45);expect(p.y).toBeCloseTo(67.89)
})
it('reports residuals for a best fit of three nonmatching landmarks',()=>{const t=calibrateReference([...pairs,{id:3,image:{x:10,y:110},map:{x:85,y:125}}],bounds,bounds);expect(t.meanError).toBeGreaterThan(0);expect(t.maxError).toBeGreaterThan(t.meanError);expect(t.residuals).toHaveLength(3)})
it.each([
 [],[pairs[0]], [pairs[0],{...pairs[1],image:pairs[0].image}], [pairs[0],{...pairs[1],map:{x:280.01,y:120}}], [pairs[0],{...pairs[1],image:null}], [pairs[0],{...pairs[1],image:{x:NaN,y:10}}], [pairs[0],{...pairs[1],map:{x:1100,y:20}}],
].map(input=>({input})))('rejects incomplete, duplicate, near coincident, invalid or out-of-bounds points %#',({input})=>expect(()=>calibrateReference(input,bounds,bounds)).toThrow())
it('rejects unsafe scales and numerically unstable input',()=>{expect(()=>calibrateReference([{id:1,image:{x:0,y:0},map:{x:0,y:0}},{id:2,image:{x:2,y:0},map:{x:200000,y:0}}],{width:2,height:2},{width:200000,height:2})).toThrow(/scale/);expect(()=>calibrateReference(pairs,{width:Infinity,height:1000},bounds)).toThrow()})
it.each([.02,.5,2])('links centred coordinates and scale at zoom %s across different pane sizes',zoom=>{
 const t=calibrateReference(pairs,bounds,bounds),source={zoom,pan:{x:-20,y:30}},refSize={width:300,height:500},mapSize={width:840,height:420}
 const target=linkedReferenceViewport(source,refSize,mapSize,t,'reference-map');expect(screenToMap({x:420,y:210},target.view)).toEqual(imageToWorld(screenToMap({x:150,y:250},source),t));expect(target.view.zoom).toBeCloseTo(zoom/2)
 const back=linkedReferenceViewport(target.view,mapSize,refSize,t,'map-reference');expect(back.view.zoom).toBeCloseTo(source.zoom);expect(back.view.pan.x).toBeCloseTo(source.pan.x);expect(back.view.pan.y).toBeCloseTo(source.pan.y)
})
it('keeps the pointer point fixed during source zoom, then aligns the follower centre',()=>{const t=calibrateReference(pairs,bounds,bounds),v={zoom:.5,pan:{x:10,y:20}},p={x:120,y:80},next=zoomAtPoint(v,p,1);expect(screenToMap(p,next)).toEqual(screenToMap(p,v));const linked=linkedReferenceViewport(next,{width:480,height:600},{width:700,height:400},t,'reference-map');expect(screenToMap({x:350,y:200},linked.view)).toEqual(imageToWorld(screenToMap({x:240,y:300},next),t))})
it('reports follower zoom clamping without moving the corresponding centre',()=>{const t=calibrateReference(pairs,bounds,bounds),result=linkedReferenceViewport({zoom:4,pan:{x:0,y:0}},{width:100,height:100},{width:600,height:300},t,'map-reference');expect(result.limited).toBe(true);expect(result.view.zoom).toBe(4);expect(screenToMap({x:300,y:150},result.view)).toEqual(worldToImage({x:12.5,y:12.5},t))})
