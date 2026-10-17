import { expect, it } from 'vitest'
import { createArea, normalizeGeometry, allRings } from './areas'
import { defaultLandArea } from './landAreas'
import { contourIndices, precisionSmooth } from './landPrecision'
import { pointInArea } from './scatter'
const land=()=>({...createArea(normalizeGeometry({polygons:[{outer:[...Array.from({length:17},(_,i)=>({x:30+i*20,y:40+(i%2)*8})),{x:350,y:250},{x:30,y:250}],holes:[[{x:100,y:150},{x:100,y:180},{x:150,y:180},{x:150,y:150}]]}]})),land:defaultLandArea('landmass')})
it('changes only selected interior vertices, preserving both tangents, holes and input',()=>{
 const o=land(),before=structuredClone(o),r={ring:0,start:1,end:14,amount:45,protectedPoints:[]},n=precisionSmooth(o,r)
 expect(o).toEqual(before);expect(n.geometry).not.toEqual(o.geometry)
 const a=allRings(o.geometry),b=allRings(n.geometry)
 a[0].forEach((p,i)=>{if(i<=2||i>=13)expect(b[0][i]).toEqual(p)})
 expect(b[1]).toEqual(a[1]);expect(normalizeGeometry(n.geometry)).toEqual(n.geometry)
 const bending=(r:typeof a[0])=>r.slice(4,11).reduce((sum,p,k)=>sum+Math.abs(p.y-(r[k+3].y+r[k+5].y)/2),0)
 expect(bending(b[0])).toBeLessThan(bending(a[0]))
})
it('pins cape and its two neighbouring tangents exactly while the surrounding coast changes',()=>{
 const o=land(),n=precisionSmooth(o,{ring:0,start:0,end:16,amount:50,protectedPoints:[8]})
 for(const i of [7,8,9])expect(allRings(n.geometry)[0][i]).toEqual(allRings(o.geometry)[0][i])
 expect(n.geometry).not.toEqual(o.geometry)
})
it('supports a wrapping range and rejects stale landmarks, collapsed ranges and off strength',()=>{
 expect(contourIndices(10,8,3)).toEqual([8,9,0,1,2,3])
 const o=land(),r={ring:0,start:1,end:14,amount:30,protectedPoints:[]}
 expect(()=>precisionSmooth(o,{...r,end:3})).toThrow('seven')
 expect(()=>precisionSmooth(o,{...r,protectedPoints:[100]})).toThrow('changed')
 expect(()=>precisionSmooth(o,{...r,amount:0})).toThrow('strength')
 expect(()=>precisionSmooth(o,{...r,start:14})).toThrow('different')
})
it('rejects newly introduced overlap even when another landmass already partly overlaps',()=>{
 const o=land(),r={ring:0,start:0,end:16,amount:50,protectedPoints:[]},n=precisionSmooth(o,r)
 const moved=allRings(n.geometry)[0].find((p,i)=>p.y<allRings(o.geometry)[0][i].y-0.01)!
 const other={...createArea(normalizeGeometry({polygons:[{outer:[{x:moved.x-1,y:moved.y-.02},{x:moved.x+1,y:moved.y-.02},{x:moved.x+1,y:moved.y+.02},{x:moved.x-1,y:moved.y+.02}],holes:[]}]})),land:defaultLandArea('landmass')}
 expect(()=>precisionSmooth(o,r,[other])).toThrow('overlap')
})
it('retains a narrow land bridge, pinned opposing shores and all other polygon rings',()=>{
 const outer=[[30,30],[100,30],[100,85],[140,90],[160,85],[200,90],[240,85],[260,90],[260,30],[330,30],[330,180],[260,180],[260,110],[240,115],[200,110],[160,115],[140,110],[100,115],[100,180],[30,180]].map(([x,y])=>({x,y}))
 const o={...createArea(normalizeGeometry({polygons:[{outer,holes:[]},{outer:[{x:400,y:30},{x:450,y:30},{x:450,y:100},{x:400,y:100}],holes:[]}]})),land:defaultLandArea('landmass')}
 expect(()=>precisionSmooth(o,{ring:0,start:0,end:18,amount:50,protectedPoints:[5,14]})).toThrow('3%')
 const n=precisionSmooth(o,{ring:0,start:0,end:18,amount:15,protectedPoints:[5,14]})
 expect(pointInArea({x:200,y:100},n.geometry)).toBe(true)
 expect(n.geometry.polygons[1]).toEqual(o.geometry.polygons[1])
 for(const i of [5,14])expect(allRings(n.geometry)[0][i]).toEqual(outer[i])
})
