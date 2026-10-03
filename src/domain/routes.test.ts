import { describe,expect,it } from 'vitest'
import { createRoute,routePreset,routeWidth,routeRadius,routeUnit,convertRoute,routeConnections,routeWarnings,splitRoute } from './routes'
import { createPath,reversePath,validatePath,withPathGeometry,insertPathNode,nearestPathPoint } from './paths'
import { routeSamples } from '../canvas/drawRoute'
import { transformSelection } from './selectionTransform'
import { defaultMapStyle } from './mapSettings'
import { defaultGeography } from './geography'
import { snapPathPoint } from './objectSnapping'
import { parseProject } from '../projects/format'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history,useHistoryStore } from '../store/history'
const nodes=()=>[{id:'a',x:40,y:60,mode:'corner' as const},{id:'b',x:160,y:60,mode:'corner' as const},{id:'c',x:260,y:130,mode:'corner' as const}]
const map={width:600,height:400,background:null,...defaultMapStyle(),mapType:'regional-map' as const,geography:defaultGeography('regional-map')}
const layers=(ids:string[])=>[{id:'objects',name:'Routes',visible:true,locked:false,objectIds:ids}]
const document=(objects:ReturnType<typeof createPath>[])=>({formatVersion:11,id:'routes',name:'Routes',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',map,objects,layers:layers(objects.map(o=>o.id)),objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]})
describe.each(['river','road','border'] as const)('%s',kind=>{
  it('keeps concrete defaults, exact centerline edits and isolated settings through canonical format',()=>{
    const style=routePreset(kind),p=createRoute(nodes(),false,style);style.route.preset='changed';expect(p.route?.preset).not.toBe('changed')
    const edited=insertPathNode(p,0,.5);expect(edited.nodes).toHaveLength(4);expect(parseProject(document([edited])).objects).toEqual([edited])
    expect(()=>parseProject({...document([p]),formatVersion:10})).toThrow(/v11/)
    expect(()=>validatePath({...p,route:{...p.route!,unexpected:1}} as unknown as typeof p)).toThrow()
    expect(()=>validatePath({...p,route:{...p.route!,kind:kind==='river'?'road':'river'}} as typeof p)).toThrow()
  })
  it('has atomic create, type conversion, undo/redo, split and group scaling',()=>{
    project.setState({...document([])});editor.setState({activeTool:'select',activeLayerId:'objects',soloLayerId:null,selectedObjectIds:[]});history.reset()
    const p=createRoute(nodes(),false,routePreset(kind));project.getState().addPath(p);expect(useHistoryStore.getState().undoCount).toBe(1)
    history.run('Convert',()=>project.getState().updatePath(convertRoute(p,'generic')));expect(history.undo()).toBe(true);expect(project.getState().objects[0]).toEqual(p);history.redo();history.undo()
    project.getState().splitRouteAt(p.id,1);expect(project.getState().objects).toHaveLength(2);expect(history.undo()).toBe(true);expect(project.getState().objects).toEqual([p])
    const scaled=transformSelection([p],{scale:2,rotation:90,flipX:true})[0] as typeof p
    expect(routeWidth(scaled,.4)).toBeCloseTo(routeWidth(p,.4)*2);expect(scaled.route?.pixelsPerUnit).toBe(p.route?.pixelsPerUnit)
  })
  it('snaps endpoints, T segments, Alt bypass and inherited hidden layers at all zooms',()=>{
    const p=createRoute(nodes(),false,routePreset(kind))
    for(const zoom of [.25,1,4]){
      expect(snapPathPoint({x:40+2/zoom,y:60},[p],layers([p.id]),map,{...map.grid,snapEnabled:false},zoom,true,false,'','routes').kind).toBe('endpoint')
      expect(snapPathPoint({x:100,y:60+2/zoom},[p],layers([p.id]),map,{...map.grid,snapEnabled:false},zoom,true,false,'','routes').kind).toBe('segment')
      expect(snapPathPoint({x:42,y:60},[p],layers([p.id]),map,map.grid,zoom,true,true,'','routes').point.x).toBe(42)
    }
    expect(snapPathPoint({x:40,y:60},[p],[{...layers([p.id])[0],visible:false}],map,{...map.grid,snapEnabled:false},1,true,false,'','routes').objectId).toBeUndefined()
  })
})
it('rivers derive finite variable contours, reverse the profile, preserve split widths and warn safely',()=>{
  const p=createRoute(nodes(),false,routePreset('river')),r=reversePath(p),samples=routeSamples(p)
  expect(samples[0].width).toBeCloseTo(routeWidth(p,0));expect(samples.at(-1)!.width).toBeCloseTo(routeWidth(p,1));expect(samples.every(s=>Number.isFinite(s.width))).toBe(true)
  expect(routeWidth(r,0)).toBe(routeWidth(p,1));expect(routeWidth(r,1)).toBe(routeWidth(p,0));expect(reversePath(r)).toEqual(p)
  const parts=splitRoute(p,1);expect(routeWidth(parts[0],1)).toBeCloseTo(routeWidth(parts[1],0))
  expect(routeWarnings(r)[0]).toMatch(/source is wider/);expect(()=>createRoute(nodes(),true,routePreset('river'))).toThrow(/open/)
  const curve=withPathGeometry(p,p.nodes.map((n,i)=>i===0?{...n,out:{x:10,y:90}}:n));expect(routeSamples(curve).every(s=>Number.isFinite(s.width))).toBe(true)
})
it('bounds cover banks, double borders and halos; physical units freeze and convert centrally',()=>{
  const border=createRoute(nodes(),true,routePreset('border'));border.route={...border.route!,kind:'border',style:'double',dash:12,gap:8,halo:{color:'#ffffff',width:12}}
  const p=withPathGeometry(border);expect(p.x).toBeLessThanOrEqual(40-routeRadius(p));expect(validatePath(p)).toEqual(p)
  const style=routeUnit(routePreset('road'),'km',map);expect(style.route.pixelsPerUnit).toBe(.6);expect(routeUnit(style,'mi',map).route.pixelsPerUnit).toBeCloseTo(.6*1.609344)
})
it('explicit T junctions connect only same types and stale or cross-type references do not patch',()=>{
  const p=createRoute(nodes(),false,routePreset('road')),q=createRoute([{id:'d',x:100,y:180,mode:'corner'},{id:'e',x:100,y:60,mode:'corner',junction:p.id}],false,routePreset('road','trail'))
  expect(routeConnections([p,q]).get(q.id)).toEqual([{x:100,y:60}]);expect(routeConnections([convertRoute(p,'river'),q]).size).toBe(0)
  expect(routeConnections([p,withPathGeometry(q,q.nodes.map(n=>({...n,y:n.y+50})))]).size).toBe(0)
  const line=createRoute([{id:'a',x:40,y:320,mode:'corner'},{id:'b',x:180,y:320,mode:'corner'}],false,routePreset('road'))
  expect(nearestPathPoint(line,{x:120,y:320}).distance).toBe(0)
  const branch=createRoute([{id:'c',x:120,y:365,mode:'corner'},{id:'d',x:120,y:320,mode:'corner',junction:line.id}],false,routePreset('road'))
  expect(routeConnections([line,branch]).get(branch.id)).toHaveLength(1)
})
it('splitting a group member preserves canonical member order and clipboard preserves styles with fresh IDs',async()=>{
  const a=createRoute(nodes(),false,routePreset('river')),b=createRoute(nodes().map(n=>({...n,y:n.y+100})),false,routePreset('road'))
  project.setState({...document([a,b]),objectGroups:[{id:'group',layerId:'objects',name:'Routes',visible:true,locked:false,objectIds:[a.id,b.id]}]});editor.setState({activeTool:'select',activeLayerId:'objects',selectedObjectIds:[a.id,b.id],editingGroupId:null,soloLayerId:null});history.reset()
  project.getState().splitRouteAt(a.id,1);expect(project.getState().objectGroups[0].objectIds).toEqual(project.getState().layers[0].objectIds)
  const state=project.getState();expect(parseProject({...document(state.objects as typeof a[]),layers:state.layers,objectGroups:state.objectGroups}).objects).toHaveLength(3)
  history.undo();editor.setState({selectedObjectIds:[a.id,b.id]});project.getState().copy();expect(editor.getState().clipboard).toEqual([a,b]);project.getState().paste();const copies=project.getState().objects.slice(2);expect(copies).toHaveLength(2);expect(copies[0].id).not.toBe(a.id);expect(copies[0].kind==='path'&&copies[0].route).toEqual(a.route)
})
