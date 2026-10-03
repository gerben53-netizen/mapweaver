import type { ManagedContent } from './projectView'
import { editableProjectIds, effectiveLayers, normalizeGroupOrder } from './projectView'
import { validateObjectGroups } from './grouping'
import { assemblyIds, isOpening } from './openings'
export interface SceneDestination { layerId:string; groupId?:string|null; anchorId?:string; edge?:'before'|'after' }
/** One atomic structural edit. Reordering changes IDs only, never geometry. */
export function moveSceneObjects(state:ManagedContent, input:string[], target:SceneDestination, solo:string|null=null) {
  const groups=state.objectGroups||[],layer=effectiveLayers(state,solo).find(l=>l.id===target.layerId),group=groups.find(g=>g.id===target.groupId)
  if(!layer||layer.locked||!layer.visible||target.groupId&&(!group||group.layerId!==layer.id||group.locked||!group.visible))throw Error('Choose a visible, unlocked destination.')
  const selected=new Set(input), byId=new Map(state.objects.map(o=>[o.id,o]))
  if(!selected.size||input.some(id=>!byId.has(id)))throw Error('Choose existing scene objects.')
  // Attached openings/labels must travel with their owner across layers.
  const crossLayer=input.some(id=>!layer.objectIds.includes(id))
  if(crossLayer)for(const id of assemblyIds(state.objects,input))selected.add(id)
  if(crossLayer)for(const id of selected){const o=byId.get(id);if(o?.kind==='label'&&o.ownerId&&!selected.has(o.ownerId))throw Error('Move a linked label together with its owner.')}
  // Grouped openings must share group membership with their wall.
  for(const o of state.objects)if(isOpening(o)&&selected.has(o.wallId)&&groups.some(g=>g.objectIds.includes(o.id)))selected.add(o.id)
  const allowed=editableProjectIds(state,solo)
  if([...selected].some(id=>!allowed.has(id)))throw Error('Unlock and show all moved objects and their parents first.')
  const ordered=state.layers.flatMap(l=>l.objectIds).filter(id=>selected.has(id))
  if(target.anchorId){
    if(selected.has(target.anchorId))return {layers:state.layers,objectGroups:groups}
    const anchorGroup=groups.find(g=>g.objectIds.includes(target.anchorId!))?.id||null
    if(!layer.objectIds.includes(target.anchorId)||anchorGroup!==(target.groupId||null))throw Error('Choose an object in the destination parent.')
  }
  const layers=state.layers.map(l=>({...l,objectIds:l.objectIds.filter(id=>!selected.has(id))}))
  const destination=layers.find(l=>l.id===layer.id)!.objectIds
  // Canonical IDs paint back-to-front; visual "before" means just above the anchor.
  let index=destination.length
  if(target.anchorId)index=destination.indexOf(target.anchorId)+(target.edge==='before'?1:0)
  else if(group){const remaining=destination.filter(id=>group.objectIds.includes(id));if(remaining.length)index=destination.indexOf(remaining.at(-1)!)+1}
  destination.splice(index,0,...ordered)
  const nextGroups=groups.map(g=>({...g,objectIds:[...g.objectIds.filter(id=>!selected.has(id)),...(g.id===target.groupId?ordered:[])]})).filter(g=>g.objectIds.length)
  const objectGroups=normalizeGroupOrder(nextGroups,layers)
  validateObjectGroups(objectGroups,layers,state.objects)
  return {layers,objectGroups}
}
