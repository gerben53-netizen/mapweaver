import { create } from 'zustand'
import type { AreaObject, TypedAsset } from '../domain/models'
import { editableProjectIds } from '../domain/projectView'
import { assetAppliesToMap } from '../domain/mapCapabilities'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { history } from './history'
import { finishObjectGesture } from '../canvas/interaction'
import { adoptLibraryAsset, projectAssets, useAssetContext } from '../projects/assets'
import { libraryRepository } from '../storage/libraryRepository'
import { acquireAssetImage } from '../images/imageCache'

export function materialTargets(ids = useEditorStore.getState().selectedObjectIds) {
  const state = useProjectStore.getState(), editable = editableProjectIds(state, useEditorStore.getState().soloLayerId)
  return state.objects.filter((o): o is AreaObject => ids.includes(o.id) && editable.has(o.id) && o.kind === 'area' && !o.ceiling)
}
export function materialFill(object: AreaObject, assetId: string): AreaObject['fill'] {
  return object.fill.kind === 'pattern' ? { ...object.fill, assetId } : { kind: 'pattern', assetId, mode: 'repeat', scale: 1, rotation: 0, offsetX: 0, offsetY: 0 }
}
export const useMaterialPreview = create(() => ({ targets: [] as AreaObject[], asset: null as TypedAsset | null, image: undefined as HTMLImageElement | undefined }))
let session: { project: ReturnType<typeof useProjectStore.getState>; generation: number; selection: string[] } | null = null
let request = 0
export function cancelMaterial() { ++request; session = null; useMaterialPreview.setState({ targets: [], asset: null, image: undefined }) }
export function openMaterialBrowser(ids = useEditorStore.getState().selectedObjectIds) {
  finishObjectGesture()
  cancelMaterial()
  const targets = materialTargets(ids.filter(id => useEditorStore.getState().selectedObjectIds.includes(id)))
  if (!targets.length) { useEditorStore.setState({ message: 'Select an Area or Floor first (visible and unlocked).' }); return false }
  session = { project: useProjectStore.getState(), generation: useAssetContext.getState().generation, selection: useEditorStore.getState().selectedObjectIds }
  useMaterialPreview.setState({ targets })
  useEditorStore.setState({ activeTool: 'select', picker: { kind: 'fillPattern', purpose: 'applyMaterial' } })
  return true
}
function validSession() {
  const state = useProjectStore.getState(), current = session
  if (!current || current.generation !== useAssetContext.getState().generation || current.project.objects !== state.objects || current.project.map !== state.map || current.project.layers !== state.layers || current.project.layerTree !== state.layerTree || current.project.objectGroups !== state.objectGroups || current.selection !== useEditorStore.getState().selectedObjectIds || materialTargets(useMaterialPreview.getState().targets.map(o => o.id)).length !== useMaterialPreview.getState().targets.length)
    throw Error('The selection or project changed. Cancel and select the Areas again.')
}
export async function previewMaterial(id: string, source: 'library' | 'project') {
  validSession()
  const token = ++request
  useMaterialPreview.setState({ asset: null, image: undefined })
  let asset = source === 'library' ? await libraryRepository.getAsset(id) : projectAssets().find(a => a.id === id)
  if (!asset || asset.kind !== 'fillPattern') throw Error('Choose a fill pattern.')
  if (!assetAppliesToMap(asset.sizing?.applicableMapTypes, useProjectStore.getState().map.mapType)) throw Error('This material is not compatible with this map type.')
  if (source === 'library') asset = await adoptLibraryAsset(asset)
  const lease = acquireAssetImage(asset.id, 'fillPattern')
  try {
    const image = await lease.promise
    if (token !== request) return
    validSession()
    useMaterialPreview.setState({ asset: asset as TypedAsset, image })
  } finally { lease.release() }
}
export function applyMaterial() {
  validSession()
  const { asset, targets } = useMaterialPreview.getState()
  if (!asset) throw Error('Choose a material first.')
  history.run('Apply material', () => {
    for (const target of targets) {
      const fill = materialFill(target, asset.id)
      useProjectStore.getState().updateArea({ ...target, fill })
      const result = useProjectStore.getState().objects.find(o => o.id === target.id)
      if (result?.kind !== 'area' || JSON.stringify(result.fill) !== JSON.stringify(fill)) throw Error('The material exceeds the project budget or the Area is no longer editable.')
    }
  })
  cancelMaterial()
  useEditorStore.setState({ picker: null, message: `Material applied to ${targets.length} Area${targets.length === 1 ? '' : 's'}.` })
}
