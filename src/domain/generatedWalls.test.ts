import { generatedSurfaceKey } from '../canvas/drawGeneratedWall'
import { expect,it,beforeEach } from 'vitest'
import { generatedDefinition,validateGeneratedDefinition,registerGeneratedDefinition,generatedWallStyle,ROOT_PRESETS } from './generatedWalls'
import { generatedPlacements,generatedVisualBounds,rootRunCount,rootMemberLength } from './generatedWallGeometry'
import { createWall,SIMPLE_WALL,wallStyle } from './walls'
import { createOpening,openingPlacement } from './openings'
import { validatePath,withPathGeometry } from './paths'
import { defaultMapStyle } from './mapSettings'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history,useHistoryStore } from '../store/history'
import { applyWallStyleChanges } from './wallStylePatch'
const map={...defaultMapStyle(),width:1200,height:900,background:null},nodes=[{id:'a',x:100,y:200,mode:'corner' as const},{id:'b',x:1000,y:200,mode:'corner' as const}]
const style=()=>({...generatedWallStyle(SIMPLE_WALL,map),strokeWidth:30})
const wall=()=>createWall(nodes,false,style())
beforeEach(()=>{project.setState({map,objects:[],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]}});editor.setState({activeLayerId:'objects',soloLayerId:null,selectedObjectIds:[],activeTool:'select'});history.reset()})
it('admits immutable data definitions and rejects unsafe or incomplete components',()=>{
 const d=generatedDefinition({id:'living-root',revision:'dev-1'});expect(validateGeneratedDefinition(d)).toBe(d);expect(registerGeneratedDefinition(d)).toEqual(d)
 for(const patch of [{components:[]},{generatorType:'stone'},{components:[{...d.components[0],image:'https://example.com/a.png'}]},{defaults:{...d.defaults,organic:2}}])expect(()=>validateGeneratedDefinition({...d,...patch})).toThrow()
 expect(()=>registerGeneratedDefinition({...d,name:'Replacement'})).toThrow('immutable');expect(()=>validatePath({...wall(),wall:{...wall().wall!,generated:{...wall().wall!.generated!,seed:-1}}})).toThrow()
})
it('uses deterministic weighted nonrepeating components and preserves one native wall after reload',()=>{
 const p=wall(),a=generatedPlacements(p);expect(a).toEqual(generatedPlacements(validatePath(JSON.parse(JSON.stringify(p)))));expect(a).toEqual(generatedPlacements({...p,name:'Unrelated name'}));expect(a).not.toEqual(generatedPlacements({...p,wall:{...p.wall!,generated:{...p.wall!.generated!,seed:987}}}));expect(a.filter(v=>v.run===0).slice(2,8).map(v=>v.component.id).some((v,i,ids)=>i>0&&v!==ids[i-1])).toBe(true)
 expect(p.kind).toBe('path');expect(p.wall?.renderingMode).toBe('generated');expect(JSON.stringify(p)).not.toContain('placements')
})
it('bounds straight root stock at sharp joins, including the closed seam, without trimming free ends',()=>{
 expect(rootMemberLength(99,30,[100],10,200,false)).toBe(8)
 expect(rootMemberLength(1,30,[0],10,200,true)).toBe(8)
 expect(rootMemberLength(199,30,[0],10,200,true)).toBe(8)
 expect(rootMemberLength(1,30,[],10,200,false)).toBe(30)
 for(const width of [5,10,20,30]){
  const s={...generatedWallStyle(SIMPLE_WALL,map,'sung-wood','production-1'),strokeWidth:width}
  const path=createWall([{id:'a',x:100,y:100,mode:'corner'},{id:'b',x:200,y:100,mode:'corner'},{id:'c',x:240,y:160,mode:'corner'}],false,s)
  const before=JSON.stringify(path),parts=generatedPlacements(path),bodies=parts.filter(p=>p.component.role==='root-long'||p.component.role==='root-medium')
  expect(bodies.some(p=>p.sourceFraction!==undefined)).toBe(true)
  for(const p of bodies){expect(p.width/2).toBeLessThanOrEqual(Math.abs(p.distance-100)+width*.3+.0001);expect(p.sourceFraction??1).toBeGreaterThan(0);expect(p.sourceFraction??1).toBeLessThanOrEqual(1)}
  expect(parts.filter(p=>p.component.role==='root-end').every(p=>p.sourceFraction===undefined)).toBe(true)
  expect(generatedPlacements(validatePath(JSON.parse(before)))).toEqual(parts)
  expect(JSON.stringify(path)).toBe(before)
 }
})
it('width controls run count and organic/growth/overgrowth remain visual-only',()=>{
 expect([.5,1,2,3].map(rootRunCount)).toEqual([2,3,5,7]);const p=wall(),clean={...p,wall:{...p.wall!,generated:{...p.wall!.generated!,...ROOT_PRESETS.Clean}}},overgrown={...p,wall:{...p.wall!,generated:{...p.wall!.generated!,...ROOT_PRESETS.Overgrown}}};expect(generatedPlacements(overgrown).length).toBeGreaterThan(generatedPlacements(clean).length);expect(generatedPlacements(clean).some(v=>['moss','leaves'].includes(v.component.role))).toBe(false);expect(clean.nodes).toBe(p.nodes)
})
it('follows curves and bounds every protruding component without changing nominal width',()=>{
 const p=createWall([{...nodes[0],out:{x:100,y:-200}},{...nodes[1],in:{x:-100,y:-200}}],false,style()),parts=generatedPlacements(p),b=generatedVisualBounds(parts);expect(new Set(parts.map(v=>v.angle.toFixed(1))).size).toBeGreaterThan(5);expect(b.x).toBeGreaterThan(p.x-p.strokeWidth*4);expect(b.y).toBeGreaterThan(p.y-p.strokeWidth*4);expect(b.x+b.width).toBeLessThan(p.x+p.width+p.strokeWidth*4);expect(b.y+b.height).toBeLessThan(p.y+p.height+p.strokeWidth*4)
 const straight=wall(),bounds=generatedVisualBounds(generatedPlacements(straight));expect(bounds.height).toBeGreaterThan(straight.strokeWidth);expect(straight.strokeWidth).toBe(30)
})
it('interrupts generation at two doorways; adds root ends on both sides',()=>{
 const p=wall(),doors=[createOpening(p,.3,'door',65),createOpening(p,.7,'door',65)],parts=generatedPlacements(p,doors)
 for(const d of doors){const cut=openingPlacement(d,p);expect(parts.every(v=>v.distance<cut.start||v.distance>cut.end)).toBe(true)}expect(parts.filter(v=>v.component.role==='root-end').length).toBeGreaterThan(10)
})
it('preserves simple walls and transfers generated style as an atomic contract',()=>{
 const old=createWall(nodes),snapshot=JSON.stringify(old);expect(validatePath(JSON.parse(snapshot))).toEqual(old);const next=applyWallStyleChanges({...SIMPLE_WALL,opacity:.6},SIMPLE_WALL,style());expect(next.wall.generated).toEqual(style().wall.generated);expect(next.opacity).toBe(.6);expect(JSON.stringify(old)).toBe(snapshot)
 expect(()=>createWall([nodes[0],{...nodes[1],x:999999}],false,style())).toThrow('components')
})
it('supports native edits and seed changes as exact undo/redo with no stamps',()=>{
 const p=wall();project.getState().addPath(p);history.reset();project.getState().updateWallStyles([p.id],s=>({...s,wall:{...s.wall,generated:{...s.wall.generated!,seed:77}}}));expect(useHistoryStore.getState().undoCount).toBe(1);const next=project.getState().objects[0];expect(next.kind).toBe('path');history.undo();expect(project.getState().objects).toEqual([p]);history.redo();expect(project.getState().objects).toEqual([next]);if(next.kind==='path'){const moved=validatePath(withPathGeometry({...next,...wallStyle(next)},next.nodes.map(n=>({...n,x:n.x+15}))));const a=generatedPlacements(moved),b=generatedPlacements(next);expect(a).toHaveLength(b.length);a.forEach((v,i)=>{expect(v.x-15).toBeCloseTo(b[i].x,8);expect({...v,x:0}).toEqual({...b[i],x:0})})}
})

it('retains nominal selection bounds, closes loops, and caches only meaningful render changes',()=>{
 const styleValue=style(),closed=createWall([...nodes,{id:'c',x:700,y:600,mode:'corner'}],true,styleValue),parts=generatedPlacements(closed);expect(parts.some(v=>v.component.role==='root-end')).toBe(false);expect(parts.every(v=>Number.isFinite(v.angle+v.x+v.y))).toBe(true)
 const plain=createWall(closed.nodes,true,{...styleValue,wall:{...styleValue.wall,renderingMode:undefined,generated:undefined}});expect([closed.x,closed.y,closed.width,closed.height]).toEqual([plain.x,plain.y,plain.width,plain.height])
 const key=generatedSurfaceKey(closed,[]);expect(generatedSurfaceKey({...closed,name:'Renamed',opacity:.5},[])).toBe(key);expect(generatedSurfaceKey(closed,[],true)).not.toBe(key);expect(generatedSurfaceKey({...closed,strokeWidth:60},[])).not.toBe(key)
})

it('defaults to production artwork while retaining IDs, metadata and deterministic layout of dev-1',()=>{
 const old=generatedDefinition({id:'living-root',revision:'dev-1'}),production=generatedDefinition({id:'living-root',revision:'production-1'})
 expect(style().wall.generated?.revision).toBe('production-1')
 expect(production.defaults).toEqual(old.defaults)
 const metadata=(d:typeof old)=>d.components.map(c=>({id:c.id,role:c.role,nominalLengthFt:c.nominalLengthFt,nominalWidthFt:c.nominalWidthFt,weight:c.weight}))
 expect(metadata(production)).toEqual(metadata(old));expect(production.components).toHaveLength(28)
 expect(production.components.every(c=>c.image===`/generated-walls/living-root-production-1/${c.id}.png`)).toBe(true)
 const p=wall(),legacy={...p,wall:{...p.wall!,generated:{...p.wall!.generated!,revision:'dev-1'}}}
 const layout=(w:typeof p)=>generatedPlacements(w).map(v=>({...v,component:{...v.component,image:''}}))
 expect(layout(p)).toEqual(layout(legacy));expect(generatedSurfaceKey(p,[])).not.toBe(generatedSurfaceKey(legacy,[]))
 expect(validatePath(legacy).wall?.generated?.revision).toBe('dev-1')
})
