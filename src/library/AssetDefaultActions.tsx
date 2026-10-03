import { OperationFeedback } from '../app/OperationFeedback'
import type { Feedback } from '../app/OperationFeedback'
import { useState, useCallback } from 'react'
import { api } from '../storage/api'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { runLibraryCommand, useLibraryHistory } from './libraryHistory'
import { isLandMap, pixelsPerKm } from '../domain/geography'
import { resetSelectedAssetSizes } from './resetAssetSizes'
export function AssetDefaultActions(){
  const ids=useEditorStore(s=>s.selectedObjectIds),objects=useProjectStore(s=>s.objects),[status,setStatus]=useState<Feedback|null>(null),[busy,setBusy]=useState(false),object=ids.length===1?objects.find(o=>o.id===ids[0]):undefined
  const dismiss=useCallback(()=>setStatus(null),[])
  const run=async(action:()=>Promise<string>)=>{setBusy(true);setStatus(null);try{const message=await action();setStatus({message,kind:/; [1-9]\d* /.test(message)?'warning':'success'})}catch(e){setStatus({message:(e as Error).message,kind:'error'})}finally{setBusy(false)}}
  if(!objects.some(o=>ids.includes(o.id)&&o.kind==='stamp'))return null
  return <section><button disabled={busy} onClick={()=>void run(resetSelectedAssetSizes)}>Reset selection to asset default size</button>{object?.kind==='stamp'&&<button disabled={busy} onClick={()=>void run(async()=>{const map=useProjectStore.getState().map,scale=isLandMap(map)?pixelsPerKm(map)/1000:map.grid.cellSize,mode=isLandMap(map)?'world':'grid';const fresh=await api<{revision:number}>('/library?limit=1');useLibraryHistory.setState({revision:fresh.revision});await runLibraryCommand({op:'metadata',ids:[object.assetId],patch:{defaultSize:{mode,width:object.width/scale,height:object.height/scale,unit:mode==='world'?'m':'cells',lockAspectRatio:false},applicableMapTypes:[map.mapType||'battlemap']}});return 'Saved this size as the asset default. Existing objects are unchanged.'})}>Save this size as the asset default</button>}<OperationFeedback value={status} onDismiss={dismiss}/></section>
}
