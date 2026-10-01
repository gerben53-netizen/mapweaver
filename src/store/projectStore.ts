import { campfireContentSignature, nextCampfireRevision, validateLighting } from '../campfire/authoring'
import { stampMapCompatible } from '../domain/stampPlacement'
import { markAutomaticLabelEdit, automaticLabelFingerprint } from '../domain/automaticLabelMetadata'
import { adoptNewThemeObjects } from '../domain/applyWorldTheme'
import { markerLabel, positionMarkerLabel } from '../domain/markers'
import type { PlaceObject, LabelObject } from '../domain/annotations'
import { isAnnotation, validateAnnotation, annotationBudget, labelOffset, reconcileLabels, transformAnnotation } from '../domain/annotations'
import type { Annotation } from '../domain/annotations'
import { splitRoute,routeBudget } from '../domain/routes'
import { interactionGrid } from '../domain/mapSettings'
import { landBudget } from '../domain/landAreas'
import { validateScatter, transformScatter, expandScatter, remapScatter, scatterDocumentCount } from '../domain/scatter'
import type { ScatterObject } from '../domain/scatter'
import { boundaryWalls } from '../domain/boundaryWalls'
import { wallStyle } from '../domain/walls'
import { isOpening, reconcileOpenings, deriveOpening, assemblyIds, remapOpening, openingDistance } from '../domain/openings'
import type { OpeningObject } from '../domain/models'
import { roomFloor } from '../domain/rooms'
import { generateRoom, nextRoomName, type RoomRecipe } from '../domain/roomGenerator'
import { finishObjectGesture } from '../canvas/interaction'
import type { RoomCandidate } from '../domain/rooms'
import { createManagementActions } from './managementActions'
import type { ManagementActions } from './managementActions'
import { editableProjectIds, effectiveLayers, projectObjects, normalizeGroupOrder, expandGroupSelection } from '../domain/projectView'
import { flatLayerTree, validateObjectGroups } from '../domain/grouping'
import type { LayerTree, ObjectGroup } from '../domain/grouping'
import { migratePattern, transformArea, offsetObject, validateArea } from '../domain/areas'
import { validatePath, withPathGeometry, transformPath, pathGeometry, PATH_LIMITS } from '../domain/paths'
import type { PathObject } from '../domain/models'
import type { AreaObject } from '../domain/models'
import { objectAssetIds } from '../domain/areas'
import { DOCUMENT_LIMITS, inGeometryRange } from '../domain/documentLimits'
import { resourcesFit, assetHasKind, captureClipboardAssets, restoreClipboardAssets } from '../projects/assets'
import { configureHistory, history } from './history'
import { retainBackgrounds } from '../images/backgroundAssets'
import { createPattern, normalizePattern, MIN_PATTERN_SIZE } from '../domain/patterns'
import type { PatternRect, PatternSettings } from '../domain/patterns'
import { defaultMapStyle, normalizeMapSettings, resizeImpact, snapPoint, snapDelta } from '../domain/mapSettings'
import type { MapSettings } from '../domain/mapSettings'
import { create } from 'zustand'
import type { Background, MapDocument, MapLayer, PlacedObject, StampAsset } from '../domain/models'
import type { Point } from '../canvas/viewport'
import { MAP_SIZE } from '../canvas/map'
import { validTransform, normalizeRotation } from '../domain/transforms'
import type { ObjectTransform } from '../domain/transforms'
import { createPlacedObject } from '../domain/placement'
import { defaultLayer, createLayeredContent, reorderObjects, OBJECT_OFFSET } from '../domain/layers'
import type { OrderAction } from '../domain/layers'
import { useEditorStore } from './editorStore'
import { arrangeObjects } from '../domain/arrange'
import type { ArrangeAction } from '../domain/arrange'
export interface ProjectState extends ManagementActions {
  setLighting: (lighting: import('../campfire/generated/index').MapLightingV1) => void
  generateRoom: (recipe: RoomRecipe, center: Point) => string
  editMarker:(place:PlaceObject,label:LabelObject|null,showLabel:boolean)=>void
  addAnnotations:(objects:Annotation[])=>void
  updateAnnotations:(objects:Annotation[])=>void
  updateScatter:(scatter:ScatterObject)=>void
  commitScatter:(scatter:ScatterObject, expected?:ScatterObject)=>void
  expandScatter:(id:string)=>void
  createRoomFloors: (rooms: RoomCandidate[], replaceId?: string) => void
  addOpening: (opening: OpeningObject) => void
  updateOpening: (opening: OpeningObject) => void
  objectGroups: ObjectGroup[]
  layerTree: LayerTree | null
  arrange: (action: ArrangeAction) => void
  nudge: (delta: Point) => void
  splitRouteAt: (id:string,index:number)=>void
  addPath: (path: PathObject) => string | null
  updatePath: (path: PathObject, attached?: OpeningObject[]) => void
  updateWallStyles: (ids:string[], style: import('../domain/walls').WallStyle | ((previous:import('../domain/walls').WallStyle)=>import('../domain/walls').WallStyle)) => void
  createBoundaryWalls: (id:string,style:import('../domain/walls').WallStyle,outer:boolean,holes:boolean)=>void
  addArea: (area: AreaObject) => string | null
  updateArea: (area: AreaObject) => void
  replaceAreas: (ids: string[], area: AreaObject | null) => void
  map: MapDocument
  objects: PlacedObject[]
  layers: MapLayer[]
  applyPatternProperties: (id: string, rect: PatternRect, settings: PatternSettings) => void
  createPattern: (assetId: string, rect: PatternRect, layerId: string) => string | null
  replacePatternAsset: (id: string, assetId: string) => void
  applyMapSettings: (settings: MapSettings, confirm: (impact: ReturnType<typeof resizeImpact>) => boolean) => boolean
  snapObjects: (primaryId: string, ids: string[], bypass: boolean) => void
  updateTransform: (id: string, transform: ObjectTransform) => void
  commitTransform: (before: PlacedObject, after: PlacedObject) => void
  translate: (before: PlacedObject[], delta: Point) => void
  commitTranslation: (before: PlacedObject[], after: PlacedObject[]) => void
  removeBackground: () => void
  setBackground: (background: Background) => void
  place: (asset: StampAsset, point: Point, bypass?: boolean) => void
  addLayer: () => void
  changeLayer: (id: string, patch: Partial<Pick<MapLayer, 'name' | 'visible' | 'locked'>>) => void
  reorderLayer: (id: string, direction: -1 | 1) => void
  deleteLayer: (id: string, confirmed?: boolean) => void
  deleteSelection: (confirmedIds?: string[]) => void
  duplicate: () => void
  copy: () => void
  paste: () => void
  moveSelection: (layerId: string) => void
  orderSelection: (action: OrderAction) => void
}
function message(text: string) { useEditorStore.setState({ message: text }) }
function selected(state: ProjectState) {
  const allowed = editableProjectIds(state, useEditorStore.getState().soloLayerId)
  const editor = useEditorStore.getState()
  const ids = expandGroupSelection(editor.selectedObjectIds, state.objectGroups, editor.editingGroupId)
  if (ids.some(id => !allowed.has(id))) { message('The entire selection must be visible and unlocked.'); return [] }
  return ids
}
function targetLayer(state: ProjectState) {
  const layer = effectiveLayers(state, useEditorStore.getState().soloLayerId).find((item) => item.id === useEditorStore.getState().activeLayerId)
  if (!layer || !layer.visible || layer.locked) { message('The active layer is hidden or locked. Choose a visible, unlocked layer.'); return null }
  message(''); return layer
}
function canAdd(state: ProjectState, additions: PlacedObject[]) {
  annotationBudget([...state.objects,...additions]);routeBudget([...state.objects,...additions]);scatterDocumentCount([...state.objects,...additions]); landBudget([...state.objects,...additions])
  const paths=[...state.objects,...additions].filter((o):o is PathObject=>o.kind==='path')
  if(paths.reduce((n,p)=>n+p.nodes.length,0)>PATH_LIMITS.documentNodes||paths.reduce((n,p)=>n+pathGeometry(p).samples.length,0)>PATH_LIMITS.documentSamples){message('This project exceeds the path geometry budget. Simplify paths before adding more.');return false}
  const ids = new Set([...state.objects, ...additions].flatMap((o) => objectAssetIds(o)))
  if (state.map.background) ids.add(state.map.background.id)
  if (!resourcesFit(ids)) { message('This edit exceeds the total project image budget. Use smaller source images.'); return false }
  if (state.objects.length + additions.length > DOCUMENT_LIMITS.objects || ids.size > DOCUMENT_LIMITS.assets || additions.some((o) => !validTransform(o))) { message('This edit exceeds the project object, asset or coordinate limits.'); return false }
  return true
}
function cleanSelection(state: ProjectState) {
  const allowed = editableProjectIds(state, useEditorStore.getState().soloLayerId)
  useEditorStore.setState(({ selectedObjectIds }) => ({ selectedObjectIds: selectedObjectIds.filter((id) => allowed.has(id)) }))
}
export const useProjectStore = create<ProjectState>((rawSet, get) => {
  const set: typeof rawSet = (patch) => {
    const before = get(), changes = typeof patch === 'function' ? patch(before) : patch
    const next = { ...before, ...changes }
    if (changes.layers && !('layerTree' in changes) && before.layerTree) {
      const alive = new Set(next.layers.map(layer => layer.id)), prior = new Set(before.layers.map(layer => layer.id))
      next.layerTree = { roots: [...next.layers.filter(layer => !prior.has(layer.id)).map(layer => layer.id), ...before.layerTree.roots.filter(id => alive.has(id) || before.layerTree!.groups.some(group => group.id === id))], groups: before.layerTree.groups.map(group => ({ ...group, children: group.children.filter(id => alive.has(id) || before.layerTree!.groups.some(item => item.id === id)) })) }
    }
    if (changes.layers || changes.objects || changes.objectGroups) next.objectGroups = normalizeGroupOrder(next.objectGroups, next.layers)
    if(changes.objects){
      const prior=new Map(before.objects.map(o=>[o.id,o])),allowed=editableProjectIds(before,useEditorStore.getState().soloLayerId)
      const changedWalls=new Set(next.objects.filter(o=>{const old=prior.get(o.id);return o.kind==='path'&&o.pathKind==='wall'&&old?.kind==='path'&&(o.nodes!==old.nodes||o.strokeWidth!==old.strokeWidth)}).map(o=>o.id))
      if(before.objects.some(o=>isOpening(o)&&changedWalls.has(o.wallId)&&!allowed.has(o.id)))throw new Error('Unlock and show all linked openings before transforming their wall.')
    }
    if(changes.objects){const prior=new Map(before.objects.map(o=>[o.id,o])),now=new Map(next.objects.map(o=>[o.id,o]));next.objects=next.objects.map(o=>{if(!isOpening(o)||prior.get(o.id)!==o)return o;const old=prior.get(o.wallId),wall=now.get(o.wallId);if(old?.kind==='path'&&wall?.kind==='path'&&old.nodes!==wall.nodes&&old.strokeWidth!==wall.strokeWidth)return {...o,openingWidth:o.openingWidth*wall.strokeWidth/old.strokeWidth};return o})}
    if (changes.objects || changes.layers) next.objects = reconcileOpenings(next.objects,next.layers)
    if(changes.objects){const prior=new Map(before.objects.filter(isOpening).map(o=>[o.id,o.wallId]));if(changes.objects.some(o=>isOpening(o)&&prior.get(o.id)!==o.wallId))validateObjectGroups(next.objectGroups,next.layers,next.objects)}
    if(changes.objects||changes.layers){
      const oldById=new Map(before.objects.map(o=>[o.id,o])),inputById=new Map(changes.objects?.map(o=>[o.id,o]))
      next.objects=next.objects.map(o=>{const old=oldById.get(o.id);return old?.kind==='label'&&o.kind==='label'?markAutomaticLabelEdit(old,o):o})
      const reconciled=reconcileLabels(next.objects,next.layers,before.objects)
      const allowed=editableProjectIds(before,useEditorStore.getState().soloLayerId),prior=new Map(before.objects.map(o=>[o.id,o]))
      for(const o of reconciled){const old=prior.get(o.id);if(o.kind==='label'&&old&&o!==old&&(o.x!==old.x||o.y!==old.y)&&!allowed.has(o.id))throw Error('Unlock and show linked labels before moving their owner.')}
      next.objects=reconciled.map(o=>{const old=oldById.get(o.id),input=inputById.get(o.id);return o.kind==='label'&&o.automatic&&!o.automatic.overridden&&old?.kind==='label'&&old===input&&old.automatic?.baseline===automaticLabelFingerprint(old)&&o!==old?{...o,automatic:{...o.automatic,baseline:automaticLabelFingerprint(o)}}:o});annotationBudget(next.objects)
    }
    if(changes.objects)landBudget(next.objects)
    rawSet(next)
  }
  return {
  objectGroups: [], layerTree: null,
  setLighting: (lighting) => history.run('Change lighting',()=>{const valid=validateLighting(lighting),map=get().map;if(valid.lights.some(l=>l.position.x>map.width||l.position.y>map.height))throw Error('Place lights within map bounds.');set({map:{...map,lighting:valid}})}),
  generateRoom: (recipe, center) => {
    finishObjectGesture()
    const state = get()
    if (state.layers.length >= DOCUMENT_LIMITS.layers) throw Error('Layer limit reached. Remove a layer before generating another room.')
    const room = generateRoom(state.map, recipe, center)
    if (room.objects.some(o => objectAssetIds(o).some(id => !assetHasKind(id, 'fillPattern')))) throw Error('Choose available floor and wall materials.')
    if (!canAdd(state, room.objects)) throw Error(useEditorStore.getState().message || 'Room exceeds document limits.')
    const layer = { ...defaultLayer(), id: crypto.randomUUID(), name: nextRoomName(state.layers.map(l => l.name), recipe.name), objectIds: room.objects.map(o => o.id) }
    const layerId = layer.id
    history.run('Create room', () => {
      set({ objects: [...state.objects, ...room.objects], layers: [layer, ...state.layers] })
    })
    // History may refuse an oversized metadata transaction and restore the previous snapshot.
    if (!get().layers.some(l => l.id === layerId)) throw Error('Room could not be committed within the project metadata budget.')
    useEditorStore.setState({ activeLayerId: layerId, soloLayerId: null, selectedObjectIds: [], editingGroupId: null, activeTool: 'select', message: '' })
    return layerId
  },
  addAnnotations:(input)=>history.run('Add map annotations',()=>{
    const state=get(),layer=targetLayer(state),items=input.map(validateAnnotation)
    if(!layer)throw Error('Choose an editable layer.')
    if(items.some(o=>state.objects.some(v=>v.id===o.id))||!canAdd(state,items))throw Error('Annotations exceed document limits.')
    if(items.some(o=>objectAssetIds(o).some(id=>!assetHasKind(id,'stamp'))))throw Error('Choose available stamp symbols.')
    set({map:adoptNewThemeObjects(state.map,[...state.objects,...items],items),objects:[...state.objects,...items],layers:state.layers.map(l=>l.id===layer.id?{...l,objectIds:[...l.objectIds,...items.map(o=>o.id)]}:l)})
    useEditorStore.setState({selectedObjectIds:items.slice(0,1).map(o=>o.id),message:''})
  }),
  editMarker:(place,label,showLabel)=>history.run('Edit marker',()=>{
    const state=get(),allowed=editableProjectIds(state,useEditorStore.getState().soloLayerId)
    if(!allowed.has(place.id)||!state.objects.some(o=>o.id===place.id&&o.kind==='place'))throw Error('Select an editable marker.')
    const oldLabel=state.objects.find((o):o is LabelObject=>o.kind==='label'&&o.ownerId===place.id)
    if(oldLabel&&!allowed.has(oldLabel.id))throw Error('Unlock and show the linked label before editing its marker.')
    const next=validateAnnotation({...place,...(place.marker?{marker:{...place.marker,labelEnabled:showLabel}}:{})}) as PlaceObject
    if(next.assetId&&!assetHasKind(next.assetId,'stamp'))throw Error('Choose an available stamp illustration.')
    let linked=showLabel?label??oldLabel??markerLabel(next,'below',state.map):null
    if(linked?.markerName&&oldLabel&&linked.preset===oldLabel.preset){
      const oldPlace=state.objects.find(o=>o.id===place.id)!,oldPosition=labelOffset(oldPlace,oldLabel,oldLabel.preset),newPosition=labelOffset(next,linked,linked.preset)
      linked={...linked,offset:{x:linked.offset.x+newPosition.x-oldPosition.x,y:linked.offset.y+newPosition.y-oldPosition.y}}
    }
    if(linked)linked=!oldLabel||linked.preset!==oldLabel.preset?positionMarkerLabel(linked,next,linked.preset):{...linked,x:next.x+next.width/2+linked.offset.x-linked.width*linked.anchor.x,y:next.y+next.height/2+linked.offset.y-linked.height*linked.anchor.y}
    if(linked)validateAnnotation(linked)
    const objects=state.objects.flatMap(o=>o.id===place.id?[next]:o.id===oldLabel?.id?(linked?[linked]:[]):[o])
    if(linked&&!oldLabel)objects.push(linked)
    const layers=state.layers.map(l=>({...l,objectIds:l.objectIds.filter(id=>linked||id!==oldLabel?.id).concat(linked&&!oldLabel&&l.objectIds.includes(place.id)?[linked.id]:[])}))
    if(!canAdd({...state,objects},[]))throw Error('Marker exceeds document limits.')
    set({objects,layers})
  }),
  updateAnnotations:(input)=>history.run('Edit map annotations',()=>{
    const state=get(),allowed=editableProjectIds(state,useEditorStore.getState().soloLayerId)
    if(input.some(o=>!allowed.has(o.id)||!state.objects.some(v=>v.id===o.id&&v.kind===o.kind)))throw Error('Select editable annotations.')
    const replacements=new Map(input.map(o=>[o.id,validateAnnotation(o)])),objects=state.objects.map(o=>replacements.get(o.id)||o)
    if(input.some(o=>objectAssetIds(o).some(id=>!assetHasKind(id,'stamp')))||!canAdd({...state,objects},[]))throw Error('Unavailable symbols or document limits exceeded.')
    set({objects})
  }),
  updateScatter:(input)=>{const state=get();if(!editableProjectIds(state,useEditorStore.getState().soloLayerId).has(input.id))return;set({objects:state.objects.map(o=>o.id===input.id?validateScatter(input):o)})},
  commitScatter:(input,expected)=>history.run(expected?'Edit scatter':'Paint scatter',()=>{
    const state=get(),scatter=validateScatter(input),existing=state.objects.find(o=>o.id===scatter.id)
    if(expected && (existing!==expected||!editableProjectIds(state,useEditorStore.getState().soloLayerId).has(expected.id)))throw Error('Scatter changed or is hidden/locked. Try again.')
    if(!expected&&existing)throw Error('Scatter identifier already exists.')
    if(scatter.sources.some(a=>!assetHasKind(a.assetId,'stamp')))throw Error('Choose available stamp assets.')
    const layer=expected?state.layers.find(l=>l.objectIds.includes(expected.id)):targetLayer(state)
    if(!layer)throw Error('Choose an editable layer.')
    const objects=expected?state.objects.map(o=>o.id===scatter.id?scatter:o):[...state.objects,scatter]
    if(!canAdd({...state,objects},[]))throw Error('Scatter exceeds project limits.')
    set({objects,...(expected?{}:{layers:state.layers.map(l=>l.id===layer.id?{...l,objectIds:[...l.objectIds,scatter.id]}:l)})})
    useEditorStore.setState({selectedObjectIds:[scatter.id],message:scatter.instances.length===5000?'Reached the limit of 5,000 instances. Start another scatter object.':''})
  }),
  expandScatter:(id)=>history.run('Expand scatter',()=>{
    const state=get(),o=state.objects.find(o=>o.id===id)
    if(o?.kind!=='scatter'||!editableProjectIds(state,useEditorStore.getState().soloLayerId).has(id))throw Error('Select an editable scatter object.')
    const stamps=expandScatter(o),objects=state.objects.flatMap(v=>v.id===id?stamps:[v])
    if(!canAdd({...state,objects},[]))throw Error('Expansion exceeds the project object limit.')
    const replace=(ids:string[])=>ids.flatMap(v=>v===id?stamps.map(s=>s.id):[v])
    set({objects,layers:state.layers.map(l=>({...l,objectIds:replace(l.objectIds)})),objectGroups:state.objectGroups.map(g=>({...g,objectIds:replace(g.objectIds)}))})
    useEditorStore.setState({selectedObjectIds:stamps.map(s=>s.id),activeTool:'select'})
  }),
  createRoomFloors: (rooms,replaceId) => history.run(replaceId?'Regenerate room floor':'Create room floors',()=>{
    const state=get(),layer=targetLayer(state)
    if(!layer)throw new Error('Choose a visible, unlocked floor layer.')
    if(!rooms.length||rooms.length>128)throw new Error('Select 1–128 rooms.')
    if(replaceId){const existing=state.objects.find(o=>o.id===replaceId);if(existing?.kind!=='area'||!editableProjectIds(state).has(replaceId))throw new Error('Select a visible, unlocked room floor.');get().updateArea(roomFloor(rooms[0],existing));return}
    const floors=rooms.map(r=>roomFloor(r));if(!canAdd(state,floors))throw new Error('The floors exceed project limits.')
    set({objects:[...state.objects,...floors],layers:state.layers.map(l=>l.id===layer.id?{...l,objectIds:[...floors.map(o=>o.id),...l.objectIds]}:l)})
    useEditorStore.setState({selectedObjectIds:floors.map(o=>o.id),message:'Room floors created. They remain ordinary editable Areas.'})
  }),
  addOpening: (input) => history.run('Place opening',()=>{
    const state=get(), allowed=editableProjectIds(state,useEditorStore.getState().soloLayerId)
    if(input.assetId&&!assetHasKind(input.assetId,'stamp'))throw new Error('Choose an available stamp symbol or the built-in symbol.')
    if(!allowed.has(input.wallId))throw new Error('Choose a visible, unlocked wall.')
    const layer=state.layers.find(l=>l.objectIds.includes(input.wallId))!
    if(!canAdd(state,[input]))return
    set({objects:[...state.objects,input],layers:state.layers.map(l=>l.id===layer.id?{...l,objectIds:[...l.objectIds,input.id]}:l)})
    useEditorStore.setState({selectedObjectIds:[input.id],message:''})
  }),
  updateOpening: (input) => {
    const state=get(), allowed=editableProjectIds(state,useEditorStore.getState().soloLayerId)
    if(input.assetId&&!assetHasKind(input.assetId,'stamp'))throw new Error('Choose an available stamp symbol or the built-in symbol.')
    if(!allowed.has(input.id)||!allowed.has(input.wallId))throw new Error('Choose a visible, unlocked opening and wall.')
    const layer=state.layers.find(l=>l.objectIds.includes(input.wallId))!
    if(state.objectGroups.some(g=>g.objectIds.includes(input.id)&&g.layerId!==layer.id))throw new Error('Remove this opening from its group before choosing a wall in another layer.')
    set({objects:state.objects.map(o=>o.id===input.id?input:o),...(layer.objectIds.includes(input.id)?{}:{layers:state.layers.map(l=>({...l,objectIds:[...l.objectIds.filter(id=>id!==input.id),...(l.id===layer.id?[input.id]:[])]}))})})
  },
  ...createManagementActions(set, get, canAdd),
  nudge: (delta) => history.run('Nudge objects', () => {
    const state = get(), ids = new Set(selected(state))
    if (ids.size) get().translate(state.objects.filter(object => ids.has(object.id)), delta)
  }),
  arrange: (action) => {
    try {
      history.run('Arrange objects', () => {
        const state = get(), ids = selected(state)
        if (!ids.length) return
        const byId = new Map(state.objects.map(object => [object.id, object]))
        const replacements = new Map(arrangeObjects(ids.map(id => byId.get(id)!), action, state.map).map(object => [object.id, object]))
        const objects = state.objects.map(object => replacements.get(object.id) || object)
        if (canAdd({ ...state, objects }, [])) { set({ objects }); message('') }
      })
    } catch (error) { message(error instanceof Error ? error.message : 'Could not arrange the selection.') }
  },
  updateWallStyles: (ids,style) => history.run('Change wall styles',()=>{
    const state=get(),allowed=editableProjectIds(state,useEditorStore.getState().soloLayerId)
    if(!ids.length||ids.length>100||new Set(ids).size!==ids.length||ids.some(id=>!allowed.has(id)))throw new Error('Select 1–100 editable walls.')
    const replacements=new Map(ids.map(id=>{const p=state.objects.find(o=>o.id===id);if(p?.kind!=='path'||p.pathKind!=='wall')throw new Error('Select only walls.');const next=validatePath(withPathGeometry({...p,...structuredClone(typeof style==='function'?style(wallStyle(p)):style)}));if(next.stroke.kind==='texture'&&!assetHasKind(next.stroke.assetId,'fillPattern'))throw new Error('Choose an available fill pattern.');return [id,next] as const}))
    const objects=state.objects.map(o=>replacements.get(o.id)||o)
    if(!canAdd({...state,objects},[]))throw new Error('Wall changes exceed the project limits.')
    set({objects})
  }),
  createBoundaryWalls: (id,style,outer,holes) => history.run('Create boundary walls',()=>{
    const state=get(),layer=targetLayer(state),area=state.objects.find(o=>o.id===id)
    if(!layer||area?.kind!=='area'||!editableProjectIds(state,useEditorStore.getState().soloLayerId).has(id))throw new Error('Select an editable Area and an unlocked active layer.')
    const walls=boundaryWalls(area,style,outer,holes)
    if(walls.some(w=>w.stroke.kind==='texture'&&!assetHasKind(w.stroke.assetId,'fillPattern'))||!canAdd(state,walls))throw new Error('Choose available artwork or simplify the contours.')
    set({objects:[...state.objects,...walls],layers:state.layers.map(l=>l.id===layer.id?{...l,objectIds:[...l.objectIds,...walls.map(w=>w.id)]}:l)})
    useEditorStore.setState({selectedObjectIds:walls.map(w=>w.id),message:'Boundary walls created as a one-time copy. The source Area is unchanged.'})
  }),
  splitRouteAt: (id,index)=>history.run('Split route',()=>{
    const state=get(),original=state.objects.find(o=>o.id===id)
    if(original?.kind!=='path'||!editableProjectIds(state,useEditorStore.getState().soloLayerId).has(id))throw Error('Choose an editable route.')
    const [left,right]=splitRoute(original,index),objects=state.objects.map(o=>o.id===id?left:o)
    if(!canAdd({...state,objects},[right]))throw Error('Split exceeds document limits.')
    set({objects:[...objects,right],layers:state.layers.map(l=>l.objectIds.includes(id)?{...l,objectIds:l.objectIds.flatMap(i=>i===id?[id,right.id]:[i])}:l),objectGroups:state.objectGroups.map(g=>g.objectIds.includes(id)?{...g,objectIds:g.objectIds.flatMap(i=>i===id?[id,right.id]:[i])}:g)})
    useEditorStore.setState({selectedObjectIds:[left.id,right.id]})
  }),
  addPath: (input) => history.run(input.route?'Draw '+input.route.kind:input.pathKind==='wall'?'Draw wall':'Draw path', () => {
    const state=get(),layer=targetLayer(state),path=validatePath(input)
    if(!layer || (path.stroke.kind==='texture' && !assetHasKind(path.stroke.assetId,'fillPattern')) || !canAdd(state,[path]))return null
    set({objects:[...state.objects,path],layers:state.layers.map(l=>l.id===layer.id?{...l,objectIds:[...l.objectIds,path.id]}:l)})
    useEditorStore.setState({selectedObjectIds:[path.id],message:''});return path.id
  }),
  updatePath: (input, attached) => {
    const path=validatePath(input),state=get()
    if(path.stroke.kind==='texture'&&!assetHasKind(path.stroke.assetId,'fillPattern'))throw new Error('Choose a fill pattern for this path texture.')
    if(!editableProjectIds(state, useEditorStore.getState().soloLayerId).has(path.id) || !state.objects.some(o=>o.id===path.id&&o.kind==='path'))return
    const old=state.objects.find(o=>o.id===path.id) as PathObject
    const reverse=old.nodes.length===path.nodes.length&&old.nodes.every((n,i)=>n.id===path.nodes[path.nodes.length-1-i].id)
    const linked=new Map(attached?.map(o=>[o.id,o]))
    const objects=state.objects.map(o=>{
      if(o.id===path.id)return path
      if(isOpening(o)&&o.wallId===path.id){
        if(!editableProjectIds(state,useEditorStore.getState().soloLayerId).has(o.id))throw new Error('Unlock and show linked openings before editing their wall.')
        if(linked.has(o.id))return linked.get(o.id)!
        // Explicit closure changes add/remove only the closing segment. Existing
        // attachments on retained segments must not slide with the total length.
        if(old.closed!==path.closed && old.nodes.length===path.nodes.length && old.nodes.every((n,i)=>n.id===path.nodes[i].id))
          return {...o,position:o.position*pathGeometry(old).length/pathGeometry(path).length}
        if(reverse){const g=pathGeometry(old),start=old.closed?g.length-g.segments.at(-1)!.length:g.length,distance=start-o.position*g.length;return {...o,position:old.closed?((distance+g.length)%g.length)/g.length:1-o.position,side:(o.side===1?-1:1) as 1|-1,flip:!o.flip}}
      }
      return o
    });if(canAdd({...state,objects},[]))set({objects})
  },
  addArea: (input) => history.run('Draw area', () => {
    const state=get(),layer=targetLayer(state), area=validateArea(input)
    if(!layer || (area.fill.kind==='pattern' && !assetHasKind(area.fill.assetId,'fillPattern')) || !canAdd(state,[area]))return null
    set({objects:[...state.objects,area],layers:state.layers.map(l=>l.id===layer.id?{...l,objectIds:[...l.objectIds,area.id]}:l)})
    useEditorStore.setState({selectedObjectIds:[area.id],message:''})
    return area.id
  }),
  updateArea: (input) => {
    const area=validateArea(input),state=get()
    if(!editableProjectIds(state, useEditorStore.getState().soloLayerId).has(area.id) || (area.fill.kind==='pattern' && !assetHasKind(area.fill.assetId,'fillPattern')))return
    const objects=state.objects.map(o=>o.id===area.id?area:o)
    if(canAdd({...state,objects},[]))set({objects})
  },
  replaceAreas: (ids,area) => history.run('Combine areas',()=>{
    const state=get(),allowed=editableProjectIds(state, useEditorStore.getState().soloLayerId)
    if(ids.some(id=>!allowed.has(id)))throw new Error('The selection changed or is locked.')
    const primary=ids[0],objects=state.objects.flatMap(o=>o.id===primary&&area?[validateArea(area)]:ids.includes(o.id)?[]:[o])
    if(!canAdd({...state,objects},[]))return
    set({objects,layers:state.layers.map(l=>({...l,objectIds:l.objectIds.flatMap(id=>id===primary&&area?[area.id]:ids.includes(id)?[]:[id])}))})
    useEditorStore.setState({selectedObjectIds:area?[area.id]:[],message:area?'Areas combined.':'Empty result removed. Undo restores the source areas.'})
  }),
  removeBackground: () => history.run('Remove background', () => set({ map: { ...get().map, background: null } })),
  map: { ...MAP_SIZE, ...defaultMapStyle(), background: null }, ...createLayeredContent(),
  applyPatternProperties: (id, rect, settings) => history.run('Change pattern settings', () => {
    const state = get()
    if (!editableProjectIds(state, useEditorStore.getState().soloLayerId).has(id)) return
    if (!Object.values(rect).every(inGeometryRange) || rect.width < MIN_PATTERN_SIZE || rect.height < MIN_PATTERN_SIZE) throw new Error(`Pattern width and height must be at least ${MIN_PATTERN_SIZE} map pixels; position must be finite.`)
    const normalized = normalizePattern(settings)
    set({ objects: state.objects.map((object) => object.id === id && object.kind === 'patternFill' ? { ...object, ...rect, ...normalized } : object) })
  }),
  createPattern: (assetId, rect, layerId) => history.run('Draw pattern', () => {
    const state = get(), layer = targetLayer(state)
    if (!layer || layer.id !== layerId || !assetHasKind(assetId, 'fillPattern')) return null
    if (!Object.values(rect).every(inGeometryRange) || rect.width < MIN_PATTERN_SIZE || rect.height < MIN_PATTERN_SIZE || rect.x < 0 || rect.y < 0 || rect.x + rect.width > state.map.width || rect.y + rect.height > state.map.height) return null
    const object = migratePattern(createPattern(assetId, rect))
    if (!canAdd(state, [object])) return null
    set({ objects: [...state.objects, object], layers: state.layers.map((item) => item.id === layerId ? { ...item, objectIds: [...item.objectIds, object.id] } : item) })
    useEditorStore.setState({ activeTool: 'select', selectedObjectIds: [object.id], inspector: 'properties', inspectorCollapsed: false, message: '' })
    return object.id
  }),
  replacePatternAsset: (id, assetId) => history.run('Replace pattern image', () => {
    const state = get()
    if (!assetHasKind(assetId, 'fillPattern') || !editableProjectIds(state, useEditorStore.getState().soloLayerId).has(id)) return
    const objects = state.objects.map((object) => object.id === id && object.kind === 'area' ? { ...object, fill: { kind: 'pattern' as const, assetId, mode: 'repeat' as const, scale: 1, rotation: 0, offsetX: 0, offsetY: 0 } } : object)
    if (!canAdd({ ...state, objects }, [])) return
    set({ objects })
  }),
  applyMapSettings: (settings, confirm) => history.run('Change map settings', () => {
    const normalized = normalizeMapSettings({...get().map,...settings}), state = get()
    const impact = resizeImpact(state.map, state.objects, normalized)
    if (impact.needsConfirmation && !confirm(impact)) return false
    set({ map: { ...state.map, ...normalized } })
    return true
  }),
  snapObjects: (primaryId, ids, bypass) => {
    const state = get(), primary = state.objects.find((object) => object.id === primaryId)
    if (!primary || !editableProjectIds(state, useEditorStore.getState().soloLayerId).has(primaryId)) return
    const delta = snapDelta(primary, interactionGrid(state.map), bypass)
    if (delta.x || delta.y) get().translate(state.objects.filter((object) => ids.includes(object.id)), delta)
  },
  updateTransform: (id, transform) => {
    if (!validTransform(transform) || !editableProjectIds(get(), useEditorStore.getState().soloLayerId).has(id)) return
    set((state) => ({ objects: state.objects.map((object) => {
      if (object.id !== id) return object
      const bounds = { x: transform.x, y: transform.y, width: transform.width, height: transform.height }
      if (isOpening(object)) return object
      if(isAnnotation(object))return transformAnnotation(object,transform)
      if (object.kind === 'scatter') return transformScatter(object,transform)
      if (object.kind === 'path') return transformPath(object, transform)
      if (object.kind === 'area') return transformArea(object, transform)
      if (object.kind === 'patternFill') {
        if (transform.rotation !== 0 || transform.scaleX !== 1 || transform.scaleY !== 1 || bounds.width < MIN_PATTERN_SIZE || bounds.height < MIN_PATTERN_SIZE) return object
        return { ...object, ...bounds }
      }
      return { ...object, ...bounds, rotation: normalizeRotation(transform.rotation), scaleX: transform.scaleX, scaleY: transform.scaleY }
    }) }))
  },
  // Completed edits have one explicit boundary for Sprint 7 history recording.
  commitTransform: (before, after) => { if (before.id === after.id) get().updateTransform(before.id, after); history.commit() },
  translate: (before, delta) => {
    if (!Number.isFinite(delta.x + delta.y)) return
    const allowed = editableProjectIds(get(), useEditorStore.getState().soloLayerId)
    if (before.some(object => !allowed.has(object.id))) { message('The entire selection must be visible and unlocked.'); return }
    if (before.some((o) => !inGeometryRange(o.x + delta.x) || !inGeometryRange(o.y + delta.y))) return
    const snapshots = new Map(before.filter((object) => allowed.has(object.id)).map((object) => [object.id, object]))
    try{set((state) => ({ objects: state.objects.map((object) => { const start = snapshots.get(object.id); if(start && isOpening(start)){if(snapshots.has(start.wallId))return start;const wall=state.objects.find(o=>o.id===start.wallId);if(wall?.kind==='path'){const center={x:start.x+start.width/2+delta.x,y:start.y+start.height/2+delta.y};return deriveOpening({...start,position:openingDistance(wall,center)/pathGeometry(wall).length},wall)}}return start ? offsetObject(start,delta.x,delta.y) : object }) }))}catch(error){message((error as Error).message)}
  },
  commitTranslation: () => { history.commit() },
  setBackground: (background) => history.run('Change background', () => {
    const state = get(), map = { ...state.map, width: background.width, height: background.height, background }
    if (!canAdd({ ...state, map }, [])) throw new Error('The background exceeds the project asset limit.')
    set({ map })
  }),
  place: (asset, point, bypass = false) => history.run('Place stamp', () => {
    if (!stampMapCompatible(asset, get().map.mapType)) { message('This stamp is not compatible with this map type.'); return }
    if (asset.kind !== 'stamp' || !assetHasKind(asset.id, 'stamp')) { message('Choose a stamp asset before placing.'); return }
    const state = get(), layer = targetLayer(state)
    if (!layer || point.x < 0 || point.y < 0 || point.x > state.map.width || point.y > state.map.height || !Number.isFinite(point.x + point.y)) return
    const object = createPlacedObject(asset, snapPoint(point, interactionGrid(state.map), bypass), state.map)
    if (!canAdd(state, [object])) return
    set({ objects: [...state.objects, object], layers: state.layers.map((item) => item.id === layer.id ? { ...item, objectIds: [...item.objectIds, object.id] } : item) })
  }),
  addLayer: () => history.run('Add layer', () => {
    const layers = get().layers
    if (layers.length >= DOCUMENT_LIMITS.layers) { message('A project supports at most 256 layers.'); return }
    let suffix = 2
    while (layers.some((layer) => layer.name === `Layer ${suffix}`)) suffix++
    const layer = { ...defaultLayer(), id: crypto.randomUUID(), name: `Layer ${suffix}` }
    set({ layers: [layer, ...layers] }); useEditorStore.setState({ activeLayerId: layer.id, message: '' })
  }),
  changeLayer: (id, patch) => history.run('Change layer', () => {
    if (patch.name !== undefined && (!patch.name.trim() || patch.name.trim().length > 120 || [...patch.name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))) { message('Layer names must contain 1–120 printable characters.'); return }
    set((state) => ({ layers: state.layers.map((layer) => layer.id === id ? { ...layer, ...patch, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}) } : layer) }))
    cleanSelection(get()); message('')
  }),
  reorderLayer: (id, direction) => get().reorderTreeEntry(id, direction),
  deleteLayer: (id, confirmed = false) => get().deleteTreeEntry(id, confirmed),
  deleteSelection: (confirmedIds) => history.run('Delete objects', () => {
    const state = get(), chosen=confirmedIds || selected(state), ids = new Set(chosen)
    const children=state.objects.filter(o=>((isOpening(o)&&ids.has(o.wallId))||(o.kind==='label'&&o.ownerId&&ids.has(o.ownerId))));children.forEach(o=>ids.add(o.id))
    if(children.length&&!confirmedIds){useEditorStore.setState({deleteOpeningIds:[...ids]});return}
    if([...ids].some(id=>!editableProjectIds(state,useEditorStore.getState().soloLayerId).has(id))){message('Unlock and show the entire wall assembly before deleting it.');return}
    useEditorStore.setState({deleteOpeningIds:null})
    set({ objects: state.objects.filter((object) => !ids.has(object.id)), layers: state.layers.map((layer) => ({ ...layer, objectIds: layer.objectIds.filter((id) => !ids.has(id)) })) })
    useEditorStore.setState({ selectedObjectIds: [] })
  }),
  duplicate: () => history.run('Duplicate objects', () => {
    const state = get(), ids = new Set(assemblyIds(get().objects,selected(state)))
    const copies = new Map<string,PlacedObject>(state.objects.filter((object) => ids.has(object.id)).map((object) => [object.id, { ...offsetObject(object,OBJECT_OFFSET,OBJECT_OFFSET), id: crypto.randomUUID() }]))
    const mapping=new Map([...copies].map(([id,o])=>[id,o.id]));for(const [id,o] of copies)copies.set(id,remapOpening(o,mapping))
    if (!canAdd(state, [...copies.values()])) return
    set({ objectGroups: [...state.objectGroups, ...state.objectGroups.filter(g => g.objectIds.every(id => copies.has(id))).map(g => ({...g,id:crypto.randomUUID(),objectIds:g.objectIds.map(id=>copies.get(id)!.id)}))], objects: [...state.objects, ...copies.values()], layers: state.layers.map((layer) => {
      const last = layer.objectIds.reduce((last, id, index) => ids.has(id) ? index : last, -1)
      const additions = layer.objectIds.flatMap((id) => copies.has(id) ? [copies.get(id)!.id] : [])
      return last < 0 ? layer : { ...layer, objectIds: [...layer.objectIds.slice(0, last + 1), ...additions, ...layer.objectIds.slice(last + 1)] }
    }) })
    useEditorStore.setState({ selectedObjectIds: [...copies.values()].map((object) => object.id) })
  }),
  copy: () => {
    const state = get(), ids = new Set(assemblyIds(get().objects,selected(state)))
    const clipboard = projectObjects(state).filter((object) => ids.has(object.id)).map((object) => ({ ...object }))
    if (clipboard.length) { captureClipboardAssets(clipboard.flatMap(o=>objectAssetIds(o))); useEditorStore.setState({ clipboardGroups: structuredClone(state.objectGroups.filter(g=>g.objectIds.every(id=>ids.has(id)))), clipboard, pasteCount: 0, message: `${clipboard.length} object(s) copied.` }) }
  },
  paste: () => history.run('Paste objects', () => {
    const state = get(), layer = targetLayer(state), editor = useEditorStore.getState()
    if (!layer || !editor.clipboard.length) return
    const pasteCount = editor.pasteCount + 1
    const remap=restoreClipboardAssets()
    const source: PlacedObject[]=editor.clipboard.map(o=>o.kind==='label'||o.kind==='scaleBar'||o.kind==='title'||o.kind==='infoPanel'?o:o.kind==='legend'?{...o,entries:o.entries.map(e=>({...e,...(e.assetId?{assetId:remap.get(e.assetId)||e.assetId}:{})}))}:o.kind==='scatter'?remapScatter(o,remap):o.kind==='area'?{...o,fill:o.fill.kind==='pattern'?{...o.fill,assetId:remap.get(o.fill.assetId)||o.fill.assetId}:o.fill}:o.kind==='path'?{...o,stroke:o.stroke.kind==='texture'?{...o.stroke,assetId:remap.get(o.stroke.assetId)||o.stroke.assetId}:o.stroke}:{...o,...(o.assetId?{assetId:remap.get(o.assetId)||o.assetId}:{})})
    const copies: PlacedObject[] = source.map((object) => ({ ...offsetObject(object,OBJECT_OFFSET * pasteCount,OBJECT_OFFSET * pasteCount), id: crypto.randomUUID() }))
    const ids=new Map(editor.clipboard.map((o,i)=>[o.id,copies[i].id]))
    for(let i=0;i<copies.length;i++)copies[i]=remapOpening(copies[i],ids)
    const groups=editor.clipboardGroups.filter(g=>g.objectIds.every(id=>ids.has(id))).map(g=>({...g,id:crypto.randomUUID(),layerId:layer.id,objectIds:g.objectIds.map(id=>ids.get(id)!)}))
    if (!canAdd(state, copies)) return
    set({ objectGroups:[...state.objectGroups,...groups], objects: [...state.objects, ...copies], layers: state.layers.map((item) => item.id === layer.id ? { ...item, objectIds: [...item.objectIds, ...copies.map((object) => object.id)] } : item) })
    useEditorStore.setState({ selectedObjectIds: copies.map((object) => object.id), pasteCount })
  }),
  moveSelection: (layerId) => history.run('Move objects to layer', () => {
    const state = get(), target = effectiveLayers(state, useEditorStore.getState().soloLayerId).find((layer) => layer.id === layerId)
    if (!target?.visible || target.locked) { message('Choose a visible, unlocked destination layer.'); return }
    const chosen=selected(state),related=state.objects.filter(o=>o.kind==='label'&&o.ownerId&&chosen.includes(o.id)).flatMap(o=>o.kind==='label'&&o.ownerId?[o.ownerId]:[])
    const ids = assemblyIds(state.objects,[...chosen,...related]), moving = projectObjects(state).filter((object) => ids.includes(object.id)).map((object) => object.id)
    if (!moving.length) return
    if (state.objectGroups.some(group => group.objectIds.some(id => ids.includes(id)) && !group.objectIds.every(id => ids.includes(id)))) { message('Select the whole group or remove this member from its group first.'); return }
    set({ objectGroups: state.objectGroups.map(group => group.objectIds.every(id => ids.includes(id)) ? {...group,layerId} : group), layers: state.layers.map((layer) => ({ ...layer, objectIds: [...layer.objectIds.filter((id) => !ids.includes(id)), ...(layer.id === layerId ? moving : [])] })) })
    message('')
  }),
  orderSelection: (action) => history.run('Reorder objects', () => {
    const state = get(), ids = selected(state)
    set({ layers: state.layers.map((layer) => ({ ...layer, objectIds: reorderObjects(layer.objectIds, ids, action) })) })
  }),
}
})










let campfireBaseline=campfireContentSignature(useProjectStore.getState())
configureHistory({
  changed: (reset=false) => {
    const state=useProjectStore.getState(), signature=campfireContentSignature(state)
    if(!reset&&signature!==campfireBaseline)useProjectStore.setState({map:{...state.map,campfireRevision:nextCampfireRevision(state.map.campfireRevision??1,true)}})
    campfireBaseline=signature
  },
  report: message,
  read: () => { const { map, objects, layers, objectGroups, layerTree } = useProjectStore.getState(); return { map, objects, layers, objectGroups, layerTree: layerTree || flatLayerTree(layers) } },
  restore: (state) => {
    useProjectStore.setState({ ...state, map:{...state.map,campfireRevision:useProjectStore.getState().map.campfireRevision??1}, objectGroups: state.objectGroups || [], layerTree: state.layerTree || null })
    cleanSelection(useProjectStore.getState())
    const editor = useEditorStore.getState()
    useEditorStore.setState({ patternReplacementId: null, message: '', ...(!state.layers.some((layer) => layer.id === editor.activeLayerId) ? { activeLayerId: state.layers[0].id } : {}) })
  },
  retain: (states) => retainBackgrounds(new Set(states.flatMap((state) => state.map.background ? [state.map.background.id] : []))),
})
