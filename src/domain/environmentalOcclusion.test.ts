import { expect, it } from 'vitest'
import { createWall, SIMPLE_WALL } from './walls'
import { generatedDefinitions, generatedWallStyle, ROOT_WIDTHS } from './generatedWalls'
import { createOpening } from './openings'
import { createArea, rectangleGeometry } from './areas'
import { defaultMapStyle } from './mapSettings'
import { applyDetailStroke, defaultDetailBrush, emptyEnvironmentalDetail, environmentalBoundary, environmentalOrder, makeDetailStroke, validateEnvironmentalDetail } from './environmentalDetail'
import { exportScene } from '../export/scene'
import type { MapObject, PathNode, StampObject } from './models'
const map={...defaultMapStyle(),width:600,height:400,background:null}
const nodes:PathNode[]=[{id:'a',x:40,y:100,mode:'corner'},{id:'b',x:500,y:100,mode:'corner'}]
const stamp=(id:string):StampObject=>({kind:'stamp',id,assetId:'same',x:0,y:0,width:20,height:20,scaleX:1,scaleY:1,rotation:0,opacity:1})
const shapes: {name:string;nodes:PathNode[]}[]=[
 {name:'straight / free endpoints',nodes},
 {name:'internal and external 90-degree corner',nodes:[nodes[0],{...nodes[1],x:300},{id:'c',x:300,y:300,mode:'corner'}]},
 {name:'broad curve',nodes:[{...nodes[0],out:{x:80,y:-80}},{...nodes[1],in:{x:-80,y:-80}}]},
 {name:'tight practical curve',nodes:[{...nodes[0],out:{x:80,y:150}},{...nodes[1],x:200,in:{x:-80,y:150}}]},
]
it.each(shapes)('places both decal tiers below $name artwork in shared editor order and both export scales',({nodes})=>{
 for(const width of Object.values(ROOT_WIDTHS)){
  const wall=createWall(nodes,false,{...generatedWallStyle(SIMPLE_WALL,map),strokeWidth:width*10}),door=createOpening(wall,.4,'door',20),passage={...createOpening(wall,.7,'door',20),doorType:'passage' as const},window=createOpening(wall,.85,'window',15)
  const floor=createArea(rectangleGeometry({x:0,y:0,width:600,height:400})),props=[stamp('structural-prop'),stamp('top-prop')]
  const objects:MapObject[]=[props[0],wall,door,passage,window,floor,props[1]],original=JSON.stringify(objects)
  const data=applyDetailStroke(undefined,makeDetailStroke([{x:60,y:100},{x:300,y:130}],{...defaultDetailBrush,mode:'decals',presetId:'premium.environmental.decals.wall-edge-debris',sizeMin:10,sizeMax:30,edgeBias:'walls'},map,objects,77,'fixed'))
  const saved=JSON.stringify(data),ordered=environmentalOrder(objects,true),edgeIndex=environmentalBoundary(ordered)
  expect(ordered.slice(0,edgeIndex)).toEqual([floor]);expect(edgeIndex).toBeLessThanOrEqual(ordered.indexOf(wall))
  expect(ordered.filter(o=>o.kind==='stamp')).toEqual(props)
  for(const scale of [1,2] as const){const scene=exportScene({map:{...map,environmentalDetail:data},objects,layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:objects.map(o=>o.id)}]},{scale,includeGrid:false,transparent:false});const order=scene.items.map(i=>i.kind==='object'?i.object.id:i.kind)
   expect(order.indexOf('environmentalEdge')).toBeLessThan(order.indexOf(wall.id));expect(order.indexOf('environmentalFloor')).toBeLessThan(order.indexOf('environmentalEdge'))
   expect(order.filter(id=>props.some(p=>p.id===id))).toEqual(props.map(o=>o.id))
   // Shared editor placement index and exporter agree without changing the wall or openings.
   expect(order.slice(1,edgeIndex+1)).toEqual(ordered.slice(0,edgeIndex).map(o=>o.id))
  }
  expect(JSON.stringify(objects)).toBe(original);expect(JSON.stringify(data)).toBe(saved);expect(validateEnvironmentalDetail(JSON.parse(saved))).toEqual(data)
  expect(makeDetailStroke([{x:60,y:100},{x:300,y:130}],data.strokes[0].brush,map,objects,77,'fixed')).toEqual(data.strokes[0])
 }
})
it.each(generatedDefinitions().filter(d=>d.revision==='production-1'))('uses the same wall-foot stratum for $name, including saved reference-only material revisions',definition=>{
 const wall=createWall(nodes,false,generatedWallStyle(SIMPLE_WALL,map,definition.id,definition.revision)),door=createOpening(wall,.5,'door',30),objects=[wall,door],before=JSON.stringify(objects)
 const scene=exportScene({map:{...map,environmentalDetail:emptyEnvironmentalDetail()},objects,layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:objects.map(o=>o.id)}]},{scale:1,transparent:true,includeGrid:false})
 expect(scene.items.map(i=>i.kind==='object'?i.object.id:i.kind)).toEqual(['environmentalFloor','environmentalEdge',wall.id,door.id]);expect(JSON.stringify(objects)).toBe(before)
})
it('handles native walls, empty scenes, ceiling overlays and legacy DEV tiers without reranking any object',()=>{
 const floor=createArea(rectangleGeometry({x:0,y:0,width:600,height:400})),ceiling={...floor,id:'ceiling',ceiling:true as const},wall=createWall(nodes),props=[stamp('lower'),stamp('upper')],objects=[props[0],wall,floor,props[1],ceiling]
 expect(environmentalOrder(objects,false)).toBe(objects)
 const ordered=environmentalOrder(objects,true)
 expect(ordered).toEqual([floor,wall,...props,ceiling]);expect(environmentalBoundary(ordered)).toBe(1)
 expect(environmentalBoundary([ceiling])).toBe(0);expect(environmentalBoundary([floor])).toBe(1);expect(environmentalBoundary([])).toBe(0)
 const data=applyDetailStroke(undefined,makeDetailStroke([{x:60,y:100}],{...defaultDetailBrush,mode:'decals',presetId:'dev.decals.wall-edge-debris'},map,[wall],4,'dev'))
 expect(validateEnvironmentalDetail(JSON.parse(JSON.stringify(data)))).toEqual(data)
})

