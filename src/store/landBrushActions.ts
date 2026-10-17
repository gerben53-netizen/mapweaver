import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { history, type ProjectSnapshot } from './history'
import { editableProjectIds, effectiveLayers, normalizeGroupOrder, projectObjects } from '../domain/projectView'
import { isLandmass } from '../domain/landEditing'
import { isLandMap } from '../domain/geography'
import { landBudget } from '../domain/landAreas'
import { validateArea } from '../domain/areas'
import type { LandBrush, LandBrushInput, LandBrushResult } from '../domain/landBrush'
import type { Point } from '../canvas/viewport'
import { terrainAppearance } from '../domain/terrainStyles'
import { worldTheme } from '../domain/worldThemes'

export function landBrushInput(snapshot:ProjectSnapshot,brush:LandBrush,points:Point[],seed:number,newId:string):LandBrushInput{
 if(brush.action==='smooth'&&brush.smoothing==='off')throw Error('Smoothing is Off. Choose Low, Medium or High before using Smooth Coast.')
 if(!isLandMap(snapshot.map))throw Error('Land / Water is available on World and Regional maps.')
 const solo=useEditorStore.getState().soloLayerId,theme=worldTheme(snapshot.map.theme?.id),appearance={...terrainAppearance('land',snapshot.map.width),feather:0,coast:theme?.coast||'fantasy' as const,...(theme?{color:theme.terrain.land.color,textureOpacity:theme.texture}:{})}
 return{lands:projectObjects(snapshot,true,solo).filter(isLandmass),editable:[...editableProjectIds(snapshot,solo)],map:{width:snapshot.map.width,height:snapshot.map.height},brush,points,seed,newId,appearance}
}
/** One safe commit; labels keep their world positions even when their owner is reshaped/merged. */
export function commitLandStroke(before:ProjectSnapshot,result:LandBrushResult,action:LandBrush['action']){
 const state=useProjectStore.getState()
 if(state.map!==before.map||state.objects!==before.objects||state.layers!==before.layers||state.objectGroups!==before.objectGroups||state.layerTree!==before.layerTree)throw Error('The map changed while calculating land. Draw the stroke again.')
 if(!result.added.length&&!result.removed.length&&!result.replacements.length)return
 const ids=new Set([...result.removed,...result.replacements.map(o=>o.id)]),allowed=editableProjectIds(state,useEditorStore.getState().soloLayerId)
 if([...ids].some(id=>!allowed.has(id)))throw Error('Land protection changed during the stroke.')
 const removed=new Set(result.removed),replacements=new Map(result.replacements.map(o=>[o.id,validateArea(o)])),added=result.added.map(validateArea)
 const visible=effectiveLayers(state,useEditorStore.getState().soloLayerId).filter(l=>l.visible&&!l.locked)
 const layer=visible.find(l=>state.objects.some(o=>isLandmass(o)&&l.objectIds.includes(o.id)))||visible.find(l=>l.id===useEditorStore.getState().activeLayerId)
 if(added.length&&!layer)throw Error('Choose a visible, unlocked layer before adding land.')
 let objects=[...state.objects.filter(o=>!removed.has(o.id)).map(o=>replacements.get(o.id)||o),...added]
 const byId=new Map(objects.map(o=>[o.id,o]))
 objects=objects.map(o=>{
  if(o.kind!=='label'||!o.ownerId||!ids.has(o.ownerId))return o
  const owner=byId.get(o.ownerId)
  if(!owner){const copy={...o};delete copy.ownerId;return copy}
  return{...o,offset:{x:o.x+o.width*o.anchor.x-owner.x-owner.width/2,y:o.y+o.height*o.anchor.y-owner.y-owner.height/2}}
 })
 landBudget(objects)
 const layers=state.layers.map(l=>({...l,objectIds:[...l.objectIds.filter(id=>!removed.has(id)),...(l.id===layer?.id?added.map(o=>o.id):[])]}))
 const map={...state.map,landEditing:{version:1 as const,manual:true as const,revision:(state.map.landEditing?.revision||0)+1}}
 history.run(({add:'Add land',remove:'Remove land',smooth:'Smooth coast',roughen:'Roughen coast'})[action],()=>useProjectStore.setState({map,objects,layers,objectGroups:normalizeGroupOrder(state.objectGroups,layers)}))
 useEditorStore.setState({selectedObjectIds:useEditorStore.getState().selectedObjectIds.filter(id=>!removed.has(id)),message:''})
}
