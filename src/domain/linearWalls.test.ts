import {expect,it} from 'vitest'
import {generatedDefinition,generatedWallStyle,validateGeneratedDefinition,validateGeneratedWall} from './generatedWalls'
import {generatedPlacements} from './generatedWallGeometry'
import {linearRowCount} from './linearWallGeometry'
import {createWall,SIMPLE_WALL} from './walls'
import {defaultMapStyle} from './mapSettings'
import {createOpening,openingPlacement} from './openings'
import {pathGeometry,pointAtDistance,validatePath,withPathGeometry} from './paths'
const map={...defaultMapStyle(),width:400,height:300,background:null},style=()=>generatedWallStyle(SIMPLE_WALL,map,'timber-refined','dev-1')
const nodes=[{id:'a',x:20,y:40,mode:'corner' as const},{id:'b',x:380,y:40,mode:'corner' as const}]
const curve=[{...nodes[0],out:{x:90,y:130}},{...nodes[1],in:{x:-90,y:130}}]
const tight=[{...nodes[0],out:{x:0,y:70}},{...nodes[1],x:80,in:{x:0,y:70}}]
const sCurve=[{...nodes[0],out:{x:90,y:120}},{...nodes[1],in:{x:-90,y:-120}}]
it('admits only complete linear footprints and regularity/variation recipes',()=>{
 const d=generatedDefinition({id:'timber-refined',revision:'dev-1'});expect(validateGeneratedDefinition(d)).toBe(d);expect(d.defaults).toMatchObject({width:1,regularity:.95,variation:.2});expect(generatedDefinition({id:'timber-rustic',revision:'dev-1'}).defaults).toMatchObject({regularity:.65,variation:.55});expect(d.components).toHaveLength(6)
 for(const bad of [{...d,generatorType:'masonry'},{...d,components:d.components.filter(c=>c.role!=='beam-short')},{...d,components:d.components.map(c=>({...c,nominalWidthFt:1}))},{...d,defaults:{...d.defaults,roughness:.5}},{...d,defaults:{...d.defaults,regularity:NaN}}])expect(()=>validateGeneratedDefinition(bad)).toThrow()
 const recipe=style().wall.generated!;expect(()=>validateGeneratedWall({...recipe,regularity:undefined})).toThrow();expect(()=>validateGeneratedWall({...recipe,roughness:.5})).toThrow();expect(()=>validateGeneratedWall({...recipe,organic:.5})).toThrow()
})
it('is deterministic, seed/control-sensitive and locally stable across independent sharp spans',()=>{
 const wall=createWall([...nodes,{id:'c',x:380,y:180,mode:'corner'}],false,style()),a=generatedPlacements(wall);expect(a).toEqual(generatedPlacements(wall))
 for(const patch of [{seed:19},{regularity:.1},{variation:.8}])expect(generatedPlacements({...wall,wall:{...wall.wall!,generated:{...wall.wall!.generated!,...patch}}})).not.toEqual(a)
 const changed=withPathGeometry(wall,wall.nodes.map((n,i)=>i===2?{...n,y:220}:n));expect(generatedPlacements(changed).filter(p=>p.distance<300)).toEqual(a.filter(p=>p.distance<300))
 const sequence=a.filter(p=>p.run===0).map(p=>p.component.id);expect(new Set(sequence).size).toBeGreaterThan(3)
})
it.each([['straight',nodes],['broad',curve],['tight',tight],['S',sCurve]] as const)('covers %s centerline and inner band with longitudinal members at all presets',(_,geometry)=>{
 for(const width of [5,10,20,30]){const wall=createWall([...geometry],false,{...style(),strokeWidth:width}),placements=generatedPlacements(wall),rows=linearRowCount(width/10);expect(new Set(placements.map(p=>p.run)).size).toBe(rows)
 const covered=(x:number,y:number)=>placements.some(p=>{const dx=x-p.x,dy=y-p.y,a=Math.cos(p.angle)*dx+Math.sin(p.angle)*dy,b=-Math.sin(p.angle)*dx+Math.cos(p.angle)*dy;return Math.abs(a)<=p.width*.484375&&Math.abs(b)<=p.height*.484375})
 for(let d=2;d<pathGeometry(wall).length-2;d+=1){const at=pointAtDistance(wall,d);for(const offset of [-width*.25,0,width*.25])expect(covered(at.point.x-at.tangent.y*offset,at.point.y+at.tangent.x*offset),`gap ${width} at ${d}/${offset}`).toBe(true)}
 expect(placements.every(p=>Number.isFinite(p.angle)&&p.width>0&&p.height>0&&p.sourceFraction!==0)).toBe(true)
 }
})
it('shortens stock at tighter curvature instead of stretching beams; grain follows local construction',()=>{
 const straight=generatedPlacements(createWall(nodes,false,style())),wall=createWall(tight,false,style()),curved=generatedPlacements(wall)
 expect(curved.filter(p=>p.component.role==='beam-long').length).toBeLessThan(straight.filter(p=>p.component.role==='beam-long').length)
 for(const p of straight){expect(Math.abs(Math.sin(p.angle))).toBeLessThan(.01);expect(p.width/p.height).toBeLessThanOrEqual(p.component.nominalLengthFt/p.component.nominalWidthFt*1.03)}
 for(const p of curved){const t=pointAtDistance(wall,p.distance).tangent;expect(Math.abs(Math.cos(p.angle)*t.x+Math.sin(p.angle)*t.y)).toBeGreaterThan(.97)}
})
it('supports native open/closed walls, corners and clean bounded endpoints without Areas',()=>{
 const wall=createWall(nodes,false,style()),placements=generatedPlacements(wall);expect(validatePath(wall).closed).toBe(false);expect(Math.min(...placements.map(p=>p.x-p.width/2))).toBeCloseTo(20,1);expect(Math.max(...placements.map(p=>p.x+p.width/2))).toBeCloseTo(380,1)
 const closed=createWall([...nodes,{id:'c',x:380,y:180,mode:'corner'},{id:'d',x:20,y:180,mode:'corner'}],true,style());expect(validatePath(closed).closed).toBe(true);expect(generatedPlacements(closed).some(p=>p.distance===0)).toBe(true)
 expect(()=>createWall(nodes,false,{...style(),wall:{...style().wall,alignment:'outside'}})).toThrow('Outside')
})
it('repackages openings, merges cuts and regenerates when doors move/resize/remove',()=>{
 const wall=createWall(nodes,false,style()),opening=createOpening(wall,.5,'door',30),cut=openingPlacement(opening,wall),placements=generatedPlacements(wall,[opening]);expect(placements.every(p=>p.distance<=cut.start||p.distance>=cut.end)).toBe(true)
 expect(generatedPlacements(wall,[opening,{...opening,id:'other',position:.52}])).not.toEqual(placements);expect(generatedPlacements(wall,[{...opening,position:.7}])).not.toEqual(placements);expect(generatedPlacements(wall,[{...opening,openingWidth:50}])).not.toEqual(placements);expect(generatedPlacements(wall)).not.toEqual(placements)
})
it('stores only native geometry and controls in exact undo/redo transactions',async()=>{
 const{useProjectStore:s}=await import('../store/projectStore'),{useEditorStore:e}=await import('../store/editorStore'),{history}=await import('../store/history');s.setState({map,objects:[],layers:[{id:'walls',name:'Walls',visible:true,locked:false,objectIds:[]}],layerTree:{roots:['walls'],groups:[]},objectGroups:[]});e.setState({activeLayerId:'walls',selectedObjectIds:[],soloLayerId:null});history.reset();const wall=createWall(nodes,false,style());s.getState().addPath(wall);history.reset();s.getState().updateWallStyles([wall.id],v=>({...v,wall:{...v.wall,generated:{...v.wall.generated!,seed:72,regularity:.3,variation:.8}}}));const after=structuredClone(s.getState().objects);expect(after).toHaveLength(1);history.undo();expect(s.getState().objects).toEqual([wall]);history.redo();expect(s.getState().objects).toEqual(after);expect(validatePath(JSON.parse(JSON.stringify(after[0])))).toEqual(after[0])
})
it('rejects excessive layouts before render allocation',()=>{expect(()=>createWall([{...nodes[0],x:0},{...nodes[1],x:1000000}],false,{...style(),strokeWidth:30})).toThrow('12,000')})

it('covers sharp corners and the closed seam at all widths, including outside alignment',()=>{
 for(const width of [5,10,20,30])for(const outside of [false,true]){const wall=createWall([...nodes,{id:'c',x:380,y:180,mode:'corner'},{id:'d',x:20,y:180,mode:'corner'}],true,{...style(),strokeWidth:width,wall:{...style().wall,...(outside?{alignment:'outside' as const}:{})}}),placements=generatedPlacements(wall);
 for(let d=0;d<pathGeometry(wall).length;d+=2){const at=pointAtDistance(wall,d),offset=outside?-width*.5:0,x=at.point.x-at.tangent.y*offset,y=at.point.y+at.tangent.x*offset;expect(placements.some(p=>{const dx=x-p.x,dy=y-p.y;return Math.abs(Math.cos(p.angle)*dx+Math.sin(p.angle)*dy)<=p.width*.484375&&Math.abs(-Math.sin(p.angle)*dx+Math.cos(p.angle)*dy)<=p.height*.484375}),`closed gap ${width}/${outside}/${d}`).toBe(true)}
 }
})

it('keeps fractional terminal remainders positive instead of reversing/collapsing a source crop',()=>{
 const wall=createWall([nodes[0],{...nodes[1],x:380.002}],false,style()),placements=generatedPlacements(wall);expect(placements.every(p=>p.width>0&&(p.sourceFraction===undefined||p.sourceFraction>0))).toBe(true)
})

it.each([['refined-timber','timber-refined','Verfijnd hout'],['rustic-heavy-timber','timber-rustic','Robuust hout']])('registers production %s with unchanged footprints, defaults, crop and heading geometry',(id,devId,name)=>{
 const d=generatedDefinition({id,revision:'production-1'}),dev=generatedDefinition({id:devId,revision:'dev-1'}),production=generatedWallStyle(SIMPLE_WALL,map,d.id,d.revision)
 expect(d.name).toBe(name);expect(d.defaults).toEqual(dev.defaults);expect(production.strokeWidth).toBe(10)
 expect(d.components.map(({image,...c})=>{expect(image).toContain('/'+id+'-production-1/');return c})).toEqual(dev.components.map(({image,...c})=>{expect(image).toContain('/timber-dev-1/');return c}))
 for(const geometry of [nodes,curve,tight,sCurve])for(const width of [5,10,20,30]){
  const a=createWall(geometry,false,{...generatedWallStyle(SIMPLE_WALL,map,devId,'dev-1'),strokeWidth:width}),b=createWall(geometry,false,{...production,strokeWidth:width}),parts=generatedPlacements(b)
  const normalize=(p:typeof parts)=>p.map(({component,...v})=>({...v,component:{...component,image:''}}))
  expect(normalize(parts)).toEqual(normalize(generatedPlacements(a)))
  for(const p of parts){expect(p.sourceFraction??1).toBeGreaterThan(0);expect(p.sourceFraction??1).toBeLessThanOrEqual(1);const tangent=pointAtDistance(b,p.distance).tangent;expect(Math.abs(Math.cos(p.angle)*tangent.x+Math.sin(p.angle)*tangent.y)).toBeGreaterThan(.97)}
 }
 const closed=createWall([...nodes,{id:'c',x:380,y:180,mode:'corner'}],true,production);expect(validatePath(closed).closed).toBe(true)
 const wall=createWall(nodes,false,production),opening=createOpening(wall,.5,'door',30);expect(generatedPlacements(wall,[opening])).not.toEqual(generatedPlacements(wall));expect(validatePath(wall).closed).toBe(false)
})
