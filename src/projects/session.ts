import { useWindowLightPreview } from '../store/windowLightPreview'
import { useLightingPreview } from '../store/lightingPreview'
import { scatterDefaults } from '../domain/scatter'
import { texturePaintAssetIds } from '../domain/terrainPaint'
import { useTextureBrushStore } from '../store/textureBrushStore'
import { flatLayerTree } from '../domain/grouping'
import { SIMPLE_WALL, wallStyle, wallDrawingStyle } from '../domain/walls'
import { objectAssetIds } from '../domain/areas'
import { create } from 'zustand'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { cancelObjectGesture, finishObjectGesture, objectGestureActive } from '../canvas/interaction'
import { defaultMapStyle, normalizeMapSettings } from '../domain/mapSettings'
import { createLayeredContent } from '../domain/layers'
import { installProjectAssets } from './assets'
import { gatherProject, encodeProject, decodeProject, downloadName } from './archive'
import { parseProject } from './format'
import type { PreparedProject, ProjectInfo } from './types'
import { PROJECT_LIMITS as L } from './limits'
const now = new Date().toISOString()
export const useProjectSession = create(() => ({ info: { id: crypto.randomUUID(), name: 'Untitled map', createdAt: now, modifiedAt: now } as ProjectInfo, revision: null as number | null, saveStatus: 'clean' as 'clean' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'error', savedAt: null as string | null, generation: 0, busy: '', error: '', warning: '', downloadedAt: null as string | null, recoveryDirty: false, autosave: 'idle' as 'idle' | 'saving' | 'saved' | 'failed' }))
export function currentSnapshot() { const { map, layers, objects, objectGroups, layerTree } = useProjectStore.getState(); return { map, layers, objects, objectGroups, layerTree } }
export function hasUnsavedChanges() { return useHistoryStore.getState().dirty || useProjectSession.getState().recoveryDirty || useHistoryStore.getState().busy }
export function applyPrepared(prepared: PreparedProject, confirm: () => boolean, recovered = false) {
  // Only callers with a fully validated package reach this synchronous replacement boundary.
  if (hasUnsavedChanges() && !confirm()) return false
  cancelObjectGesture()
  const d = parseProject(prepared.document)
  const assets = new Map(d.assets.map(manifest => {
    const source = prepared.assets.get(manifest.id) || [...prepared.assets.values()].find(a => a.manifest.path === manifest.path && a.manifest.hash === manifest.hash)
    if (!source) throw new Error(`Missing project asset: ${manifest.fileName}`)
    return [manifest.id, { ...source, manifest }] as const
  }))
  useLightingPreview.setState({enabled:false,selectedId:''})
  useWindowLightPreview.setState({enabled:false})
  useTextureBrushStore.setState({preview:null,cursor:null,images:new Map(),imageGeneration:-1,materialName:'Choose material',settings:{...useTextureBrushStore.getState().settings,assetId:undefined}})
  installProjectAssets(assets, d.map.background && !texturePaintAssetIds(d.map.texturePaint).includes(d.map.background.id) && !d.objects.some(o => objectAssetIds(o).includes(d.map.background!.id)) ? d.map.background.id : undefined)
  const availableWall=d.objects.find(o=>o.kind==='path'&&o.pathKind==='wall'),toolStyle=availableWall?.kind==='path'?wallDrawingStyle(wallStyle(availableWall)):structuredClone(SIMPLE_WALL)
  useEditorStore.setState({ ceilingsVisible:true,annotationPreview:[],symbolAsset:null,areaRole:'area',areaPreview:null, scatterSettings:scatterDefaults(d.map.mapType),scatterSources:[],scatterMode:'paint',scatterBusy:false, wallStyle:toolStyle,customWallStyle:toolStyle,wallPreset:availableWall?'custom':'simple',pathStroke:{kind:'solid',color:'#dfbe85'}, picker: null, stampAsset: null, recentAssets: [], selectedObjectIds: [], editingGroupId: null, soloLayerId: null, collapsedGroups: [], collapsedLayers: [], pasteCount: 0, activeTool: 'select', activeLayerId: (d.map.mapType!=='battlemap'?d.layers.find(l=>l.name==='Landmasses'):undefined)?.id??d.layers[0].id, patternAsset: null, patternReady: false, areaFill: {kind:'solid',color:'#769aa0'}, editRing:0, editPoint:null, patternReplacementId: null, message: '', viewport: { zoom: 1, pan: { x: 0, y: 0 } } })
  useProjectStore.setState({ map: d.map, layers: d.layers, objects: d.objects, objectGroups: d.objectGroups || [], layerTree: d.layerTree || null })
  useProjectSession.setState((s) => ({ revision: null, saveStatus: 'clean', generation: s.generation + 1, info: { id: d.id, name: d.name, createdAt: d.createdAt, modifiedAt: d.modifiedAt }, downloadedAt: recovered ? null : d.modifiedAt, warning:[...assets.values()].some(a=>a.unavailable)?'Wall material or scatter images are missing. Objects remain editable; restore or replace their images before saving/exporting.':'', recoveryDirty: recovered, autosave: 'idle', error: '' }))
  history.reset()
  return true
}
export function newProject(name: string, width: number, height: number, backgroundColor: string, confirm: () => boolean) {
  const stamp = new Date().toISOString(), settings = normalizeMapSettings({ width, height, backgroundColor, grid: defaultMapStyle().grid })
  const content=createLayeredContent()
  const document = parseProject({ formatVersion: 12, id: crypto.randomUUID(), name: name.trim(), createdAt: stamp, modifiedAt: stamp, map: { ...settings, background: null }, ...content,objectGroups:[],layerTree:flatLayerTree(content.layers), assets: [] })
  const applied = applyPrepared({ document, assets: new Map() }, confirm)
  if (applied) useProjectSession.setState({ downloadedAt: null })
  return applied
}
export async function runProjectTask(label: string, action: () => Promise<void>) {
  if (useProjectSession.getState().busy) return
  useProjectSession.setState({ busy: label, error: '' })
  try { await action() } catch (error) { useProjectSession.setState({ error: error instanceof Error ? error.message : 'Project operation failed.' }) }
  finally { useProjectSession.setState({ busy: '' }) }
}
export function downloadProject() {
  return runProjectTask('Building project download…', async () => {
    finishObjectGesture()
    const state = currentSnapshot(), captured = useProjectSession.getState(), signature = JSON.stringify(state)
    const prepared = await gatherProject(state, captured.info)
    const bytes = await encodeProject(prepared)
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }))
    const link = document.createElement('a'); link.href = url; link.download = downloadName(captured.info.name); document.body.append(link)
    try { link.click() } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000) }
    if (captured.generation === useProjectSession.getState().generation && JSON.stringify(currentSnapshot()) === signature && !objectGestureActive() && !useHistoryStore.getState().busy) {
      useProjectSession.setState({ downloadedAt: captured.info.modifiedAt, recoveryDirty: false }); history.markClean()
    }
  })
}
export function openProject(file: File, confirm: () => boolean) {
  return runProjectTask('Checking project…', async () => {
    if (!/\.mapweaver$/i.test(file.name) || file.size > L.archive) throw new Error('Choose a .mapweaver file of at most 128 MiB.')
    const prepared = await decodeProject(new Uint8Array(await file.arrayBuffer()))
    applyPrepared(prepared, confirm)
  })
}
