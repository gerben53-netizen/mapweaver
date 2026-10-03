import { expect, it } from 'vitest'
import { generatedDefinition, generatedWallStyle, validateGeneratedDefinition } from './generatedWalls'
import { masonryCourseCount } from './masonryWallGeometry'
import { generatedPlacements } from './generatedWallGeometry'
import { createWall, SIMPLE_WALL } from './walls'
import { defaultMapStyle } from './mapSettings'
import { validatePath } from './paths'
import { createOpening, openingPlacement } from './openings'
const map={...defaultMapStyle(),width:400,height:300,background:null}
const style=()=>generatedWallStyle(SIMPLE_WALL,map,'masonry-dressed','dev-1')
const nodes=[{id:'a',x:20,y:40,mode:'corner' as const},{id:'b',x:380,y:40,mode:'corner' as const}]
it('registers two data-driven materials with one masonry strategy and validates parameters/roles',()=>{
 const rough=generatedDefinition({id:'masonry-rough',revision:'dev-1'}),dressed=generatedDefinition({id:'masonry-dressed',revision:'dev-1'})
 expect(rough.components).toEqual(dressed.components);expect(rough.defaults.regularity).toBeLessThan(dressed.defaults.regularity!)
 expect(()=>validateGeneratedDefinition({...rough,components:[{...rough.components[0],role:'root-long'}]})).toThrow()
 expect(()=>validateGeneratedDefinition({...rough,defaults:{...rough.defaults,variation:2}})).toThrow()
 const wall=createWall(nodes,false,style());expect(validatePath(JSON.parse(JSON.stringify(wall)))).toEqual(wall)
 expect(()=>validatePath({...wall,wall:{...wall.wall!,generated:{...wall.wall!.generated!,regularity:undefined}}})).toThrow()
})
it('repacks physical width into staggered courses with deterministic weighted variation',()=>{
 expect([.5,1,2,3].map(masonryCourseCount)).toEqual([1,2,4,6])
 const wall=createWall(nodes,false,style()),a=generatedPlacements(wall)
 expect(a).toEqual(generatedPlacements(wall));expect(new Set(a.map(p=>p.run)).size).toBe(2)
 expect(a.filter(p=>p.run===0)[0].component.id).not.toBe(a.filter(p=>p.run===1)[0].component.id)
 for(const field of ['seed','regularity','variation'] as const){const next={...wall,wall:{...wall.wall!,generated:{...wall.wall!.generated!,[field]:field==='seed'?99:0}}};expect(generatedPlacements(next)).not.toEqual(a)}
 expect(JSON.stringify(wall)).not.toContain('placements')
})
it('admits open and closed masonry, follows curves and splits passage intervals',()=>{
 const wall=createWall([{...nodes[0],out:{x:60,y:90}},{...nodes[1],in:{x:-60,y:-90}}],false,style()),door=createOpening(wall,.5,'door',30),cut=openingPlacement(door,wall),a=generatedPlacements(wall,[door])
 expect(a.every(p=>p.distance<cut.start||p.distance>cut.end)).toBe(true)
 expect(new Set(a.map(p=>p.angle.toFixed(1))).size).toBeGreaterThan(5)
 expect(validatePath(wall).closed).toBe(false);expect(validatePath(createWall([...nodes,{id:'c',x:200,y:230,mode:'corner'}],true,style())).closed).toBe(true)
 expect(()=>createWall(nodes,false,{...style(),wall:{...style().wall,alignment:'outside'}})).toThrow('Outside')
})
it('keeps an earlier straight span stable when a later segment changes, and bounds corner filler sizes',()=>{
 const wall=createWall([...nodes,{id:'c',x:380,y:200,mode:'corner'}],false,{...style(),strokeWidth:30})
 const later=createWall([...nodes,{id:'c',x:380,y:250,mode:'corner'}],false,{...style(),strokeWidth:30})
 const first=(w:typeof wall)=>generatedPlacements(w).filter(p=>p.distance<350)
 expect(first(wall)).toEqual(first(later))
 const fillers=generatedPlacements(wall).filter(p=>p.distance===360)
 expect(fillers.length).toBeGreaterThan(0);expect(fillers.every(p=>p.width<=6&&p.height<=6)).toBe(true)
})
it('stores masonry seed and controls through exact native wall undo/redo without transient stones',async()=>{
 const {useProjectStore:project}=await import('../store/projectStore'),{useEditorStore:editor}=await import('../store/editorStore'),{history}=await import('../store/history')
 project.setState({map,objects:[],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]}})
 editor.setState({activeLayerId:'objects',selectedObjectIds:[],soloLayerId:null});history.reset()
 const wall=createWall(nodes,false,style());project.getState().addPath(wall);history.reset()
 project.getState().updateWallStyles([wall.id],s=>({...s,wall:{...s.wall,generated:{...s.wall.generated!,seed:72,regularity:.4,variation:.8}}}))
 const changed=structuredClone(project.getState().objects);history.undo();expect(project.getState().objects).toEqual([wall]);history.redo();expect(project.getState().objects).toEqual(changed)
 expect(changed).toHaveLength(1);expect(validatePath(JSON.parse(JSON.stringify(changed[0])))).toEqual(changed[0])
})

it.each(['pale-palace-stone','marble'])('admits production %s components with the shared engine at all widths and preserves DEV fixtures',id=>{
 const definition=generatedDefinition({id,revision:'production-1'});expect(validateGeneratedDefinition(definition)).toBe(definition);expect(definition.components).toHaveLength(6);expect(definition.defaults).toMatchObject({regularity:.9,variation:.2});
 for(const c of definition.components){expect(c.weight).toBe(1);expect(c.image).toBe('/generated-walls/'+id+'-production-1/'+c.id+'.png');expect(c.nominalWidthFt).toBe(.5)}
 const prod=generatedWallStyle(SIMPLE_WALL,map,definition.id,definition.revision);for(const width of [5,10,20,30]){const wall=createWall(nodes,false,{...prod,strokeWidth:width});expect(validatePath(wall)).toEqual(wall);expect(generatedPlacements(wall)).toEqual(generatedPlacements(wall));expect(new Set(generatedPlacements(wall).map(p=>p.run)).size).toBe(width/5)}
 expect(generatedDefinition({id:'masonry-dressed',revision:'dev-1'}).generatorType).toBe('masonry');expect(generatedDefinition({id:'masonry-rough',revision:'dev-1'}).generatorType).toBe('masonry');
 const prototype=createWall(nodes,false,style()),wall=createWall(nodes,false,prod);const shape=(w:typeof wall)=>generatedPlacements(w).map(p=>({...p,component:{...p.component,image:''}}));expect(shape(wall)).toEqual(shape(prototype));
})

it('keeps Marble curves, endpoints and openings equivalent to pale stone at equal recipes without material-specific geometry',()=>{
 const prod=generatedWallStyle(SIMPLE_WALL,map,'marble','production-1'),pale=generatedWallStyle(SIMPLE_WALL,map,'pale-palace-stone','production-1'),curved=[{...nodes[0],out:{x:60,y:90}},{...nodes[1],in:{x:-60,y:-90}}];
 const wall=createWall(curved,false,prod),other=createWall(curved,false,pale),opening=createOpening(wall,.5,'door',30),otherOpening={...opening,wallId:other.id};const shape=(w:typeof wall,cut:typeof opening)=>generatedPlacements(w,[cut]).map(p=>({...p,component:{...p.component,image:''}}));expect(shape(wall,opening)).toEqual(shape(other,otherOpening));
 for(const field of ['seed','regularity','variation'] as const){const changed={...wall,wall:{...wall.wall!,generated:{...wall.wall!.generated!,[field]:field==='seed'?17:.4}}};expect(generatedPlacements(changed,[opening])).not.toEqual(generatedPlacements(wall,[opening]))}
})
