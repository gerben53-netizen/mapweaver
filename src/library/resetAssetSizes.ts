import { api } from '../storage/api'
import type { RemoteAsset } from '../storage/api'
import { toAsset } from '../storage/remoteLibrary'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { editableProjectIds } from '../domain/projectView'
import { history } from '../store/history'
import { resolvePlacementSize } from '../domain/placement'
export async function resetSelectedAssetSizes() {
  const p=useProjectStore.getState(),ids=useEditorStore.getState().selectedObjectIds,editable=editableProjectIds(p),stamps=p.objects.filter(o=>ids.includes(o.id)&&o.kind==='stamp'&&editable.has(o.id)),updates: typeof stamps=[]
  let skipped=ids.length-stamps.length
  for(const o of stamps){try{const asset=toAsset(await api<RemoteAsset>(`/assets/${o.assetId}`)),size=resolvePlacementSize(asset,p.map);if(size.reason){skipped++;continue}updates.push({...o,width:size.width,height:size.height,x:o.x+(o.width-size.width)/2,y:o.y+(o.height-size.height)/2})}catch{skipped++}}
  if(useProjectStore.getState().objects!==p.objects||useProjectStore.getState().map!==p.map)throw Error('The selection changed. Retry the reset.')
  history.run('Reset selection to asset defaults',()=>updates.forEach(o=>{if(o.kind==='stamp')useProjectStore.getState().updateTransform(o.id,o)}))
  return `${updates.length} stamps reset; ${skipped} unsuitable, locked or unavailable objects skipped.`
}
