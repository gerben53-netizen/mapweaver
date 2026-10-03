import { texturePaintAssetIds } from '../domain/terrainPaint'
import { useTextureBrushStore } from '../store/textureBrushStore'
import { objectAssetIds } from '../domain/areas'
import { assemblyIds } from '../domain/openings'
import { SIMPLE_WALL } from '../domain/walls'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { history, useHistoryStore } from '../store/history'
import { forgetRemovedAssets } from '../projects/assets'
import { invalidateAssetBlobs } from '../storage/api'
import { invalidateAssetImages } from '../images/imageCache'
import { finishObjectGesture } from '../canvas/interaction'

export function currentMapUsage(ids: string[]) {
  const p = useProjectStore.getState()
  const used = new Set([...p.objects.flatMap(objectAssetIds),...texturePaintAssetIds(p.map.texturePaint)])
  if (p.map.background) used.add(p.map.background.id)
  return ids.filter(id => used.has(id))
}
export function prepareAssetRemoval(ids: string[]) {
  finishObjectGesture()
  if (useHistoryStore.getState().busy) throw Error('Finish the current edit before removing assets.')
  if (currentMapUsage(ids).length) throw Error('Selected assets are used on the current map. Remove their map objects first. Nothing removed.')
}

/** Called only after the service commits the entire batch. Never mutates map objects. */
export function cleanRemovedAssets(ids: Set<string>) {
  const e = useEditorStore.getState()
  const affected = (o: Parameters<typeof objectAssetIds>[0]) => objectAssetIds(o).some(id => ids.has(id))
  const removed = new Set(assemblyIds(e.clipboard, e.clipboard.filter(affected).map(o => o.id)))
  const clipboard = e.clipboard.filter(o => !removed.has(o.id)).map(o => {
    if (o.kind === 'path') return {...o, nodes:o.nodes.map(n => n.junction && removed.has(n.junction) ? {...n,junction:undefined} : n)}
    if (o.kind === 'area' && o.roomSource?.wallIds.some(id => removed.has(id))) return {...o,roomSource:undefined}
    return o
  })
  const has = (id?: string) => !!id && ids.has(id)
  const texture = (stroke: typeof e.pathStroke) => stroke.kind === 'texture' && has(stroke.assetId)
  const wall = texture(e.wallStyle.stroke), customWall = texture(e.customWallStyle.stroke)
  const tool = has(e.stampAsset?.id) || has(e.patternAsset?.id) || has(e.symbolAsset?.id) || texture(e.pathStroke) || texture(e.routeStyle.stroke) || wall || customWall || e.scatterSources.some(s => has(s.assetId)) || (e.areaFill.kind === 'pattern' && has(e.areaFill.assetId))
  useEditorStore.setState({
    clipboard, clipboardGroups:e.clipboardGroups.map(g => ({...g,objectIds:g.objectIds.filter(id => !removed.has(id))})).filter(g => g.objectIds.length > 1),
    ...(removed.size ? {pasteCount:0} : {}),
    stampAsset:has(e.stampAsset?.id) ? null : e.stampAsset,
    patternAsset:has(e.patternAsset?.id) ? null : e.patternAsset,
    ...(has(e.patternAsset?.id) ? {patternReady:false,patternReplacementId:null} : {}),
    symbolAsset:has(e.symbolAsset?.id) ? null : e.symbolAsset,
    recentAssets:e.recentAssets.filter(a => !has(a.id)), scatterSources:e.scatterSources.filter(s => !has(s.assetId)),
    pathStroke:texture(e.pathStroke) ? {kind:'solid',color:'#dfbe85'} : e.pathStroke,
    areaFill:e.areaFill.kind === 'pattern' && has(e.areaFill.assetId) ? {kind:'none'} : e.areaFill,
    routeStyle:texture(e.routeStyle.stroke) ? {...e.routeStyle,stroke:{kind:'solid',color:'#dfbe85'}} : e.routeStyle,
    wallStyle:wall ? structuredClone(SIMPLE_WALL) : e.wallStyle,
    customWallStyle:customWall ? structuredClone(SIMPLE_WALL) : e.customWallStyle,
    areaPreview:e.areaPreview && affected(e.areaPreview) ? null : e.areaPreview,
    annotationPreview:e.annotationPreview.filter(o => !affected(o)),
    ...(tool ? {activeTool:'select',picker:null} : {}),
  })
  const brush=useTextureBrushStore.getState()
  if(has(brush.settings.assetId))useTextureBrushStore.setState({settings:{...brush.settings,assetId:undefined},materialName:'Choose material',images:new Map(),imageGeneration:-1})
  const clearedHistory = history.invalidateAssets(ids)
  forgetRemovedAssets(ids, new Set(clipboard.flatMap(objectAssetIds)))
  invalidateAssetBlobs(ids); invalidateAssetImages(ids)
  return {clipboard:removed.size > 0, history:clearedHistory, tools:tool}
}
