import { useTextureBrushStore } from '../store/textureBrushStore'
import { textureBrushMaterial } from '../domain/textureBrush'
import { resolvePlacementSize } from '../domain/placement'
import { isOpening } from '../domain/openings'
import { withPathGeometry } from '../domain/paths'
import { history } from '../store/history'
import type { AssetKind, TypedAsset } from '../domain/models'
import { libraryRepository } from '../storage/libraryRepository'
import { adoptLibraryAsset, projectAssets, useAssetContext } from '../projects/assets'
import { acquireAssetImage } from '../images/imageCache'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
export type AssetSource = 'library' | 'project'
export function pickerAssets(assets: TypedAsset[], kind: AssetKind, query = '', category = '') {
  return assets.filter((a) => a.kind === kind && a.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && (!category || a.categoryId === category))
}
export async function chooseAsset(id: string, source: AssetSource, kind: AssetKind, replacementId?: string) {
  const purpose=useEditorStore.getState().picker?.purpose
  if (purpose === 'applyMaterial') throw Error('Preview the material and use Apply.')
  const entryId=useEditorStore.getState().picker?.entryId
  const replacementIds=useEditorStore.getState().picker?.replacementIds
  const generation = useAssetContext.getState().generation
  let asset = source === 'library' ? await libraryRepository.getAsset(id) : projectAssets().find((a) => a.id === id)
  if (!asset || asset.kind !== kind) throw new Error('This asset does not match the selected tool.')
  if (source === 'library') asset = await adoptLibraryAsset(asset)
  const lease = acquireAssetImage(asset.id, kind)
  try {
    const loadedImage = await lease.promise
    if (generation !== useAssetContext.getState().generation) throw new Error('The project changed. Choose the asset again.')
    if(replacementIds?.length){
      const editor=useEditorStore.getState(),project=useProjectStore.getState(),first=project.objects.find(o=>o.id===replacementIds[0])
      if(first?.kind!=='path'||first.pathKind!=='wall'||replacementIds.some(id=>!editor.selectedObjectIds.includes(id)))throw new Error('Select the walls again.')
      project.updateWallStyles(replacementIds,previous=>({...previous,wall:{...previous.wall,material:undefined},stroke:{kind:'texture',assetId:asset.id,scale:1,spacing:16,offset:0}}))
    }
    if (replacementId && purpose==='openingSymbol') {const object=useProjectStore.getState().objects.find(o=>o.id===replacementId);if(!object||!isOpening(object)||kind!=='stamp')throw new Error('Select the opening again.');history.run('Change opening symbol',()=>useProjectStore.getState().updateOpening({...object,assetId:asset.id}))}
    if(replacementId&&purpose==='legendSymbol'){const o=useProjectStore.getState().objects.find(o=>o.id===replacementId);if(o?.kind!=='legend'||!o.entries.some(e=>e.id===entryId))throw Error('Save the legend entry before choosing its symbol.');useProjectStore.getState().updateAnnotations([{...o,entries:o.entries.map(e=>e.id===entryId?{...e,assetId:asset.id}:e)}])}
    if(replacementId&&purpose==='annotationSymbol'){const o=useProjectStore.getState().objects.find(o=>o.id===replacementId);if(!o||(o.kind!=='place'&&o.kind!=='compass'))throw Error('Select a place or compass.');useProjectStore.getState().updateAnnotations([{...o,assetId:asset.id}])}
    if (replacementId && purpose!=='openingSymbol'&&purpose!=='annotationSymbol'&&purpose!=='legendSymbol') {
      if (!useEditorStore.getState().selectedObjectIds.includes(replacementId) || kind !== 'fillPattern') throw new Error('Select the pattern to replace again.')
      if(purpose==='pathTexture'||purpose==='wallTexture'){const path=useProjectStore.getState().objects.find(o=>o.id===replacementId);if(path?.kind!=='path')throw new Error('Select the path again.');const next=withPathGeometry({...path,...(path.wall?{wall:{...path.wall,material:undefined}}:{}),stroke:{kind:'texture',assetId:asset.id,scale:1,spacing:Math.max(16,Math.ceil(path.width/100)),offset:0}});history.run('Change path texture',()=>useProjectStore.getState().updatePath(next))} else useProjectStore.getState().replacePatternAsset(replacementId, asset.id)
    }
    if(purpose==='textureBrush'){if(kind!=='fillPattern')throw Error('Choose a fill pattern.');useTextureBrushStore.setState(s=>({settings:{...s.settings,...textureBrushMaterial(asset!)},materialName:asset!.name,images:new Map([...(s.imageGeneration===generation?s.images:[]),[asset!.id,loadedImage]]),imageGeneration:generation}))}
    const recent = { id, source, kind }
    useEditorStore.setState((s) => ({ picker: null, workspace: 'editor', message: kind==='stamp' ? resolvePlacementSize(asset!,useProjectStore.getState().map).reason || '' : '', patternReplacementId: null, recentAssets: [recent, ...s.recentAssets.filter((a) => a.id !== id || a.source !== source)].slice(0, 10),
      ...(replacementId || replacementIds?.length ? {} : purpose==='textureBrush'?{activeTool:'textureBrush'}:purpose==='placeSymbol'?{activeTool:'place',symbolAsset:asset as TypedAsset}:purpose==='wallTexture' ? {activeTool:'wall',wallPreset:'custom',wallStyle:{...s.wallStyle,wall:{...s.wallStyle.wall,material:undefined},stroke:{kind:'texture',assetId:asset.id,scale:1,spacing:16,offset:0}},customWallStyle:{...s.wallStyle,wall:{...s.wallStyle.wall,material:undefined},stroke:{kind:'texture',assetId:asset.id,scale:1,spacing:16,offset:0}}} : purpose==='pathTexture' ? {activeTool:'path',pathStroke:{kind:'texture',assetId:asset.id,scale:1,spacing:16,offset:0}} : kind === 'stamp' ? { stampAsset: asset as TypedAsset, activeTool: 'placeStamp' } : { patternAsset: { id: asset.id, name: asset.name }, patternReady: true, activeTool: 'area', areaFill: {kind:'pattern',assetId:asset.id,mode:'repeat',scale:1,rotation:0,offsetX:0,offsetY:0} }),
    }))
  } finally { lease.release() }
}
