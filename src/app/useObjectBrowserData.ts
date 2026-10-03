import { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { assetMetadataName, useAssetContext } from '../projects/assets'
import { createObjectListSelector, objectRowContexts } from '../domain/objectList'
export function useObjectBrowserData() {
 const solo=useEditorStore(s=>s.soloLayerId), selector=useMemo(()=>createObjectListSelector(solo),[solo]), rows=useProjectStore(selector)
 const generation=useAssetContext(s=>s.generation),[names,setNames]=useState<ReadonlyMap<string,string>>(new Map())
 const assetKey=JSON.stringify([...new Set(rows.flatMap(r=>r.assetId?[r.assetId]:[]))].sort())
 useEffect(()=>{let active=true,next=0;const ids=JSON.parse(assetKey) as string[],resolved=new Map<string,string>()
  async function worker(){while(active&&next<ids.length){const id=ids[next++];try{const name=await assetMetadataName(id);if(name)resolved.set(id,name)}catch{/* Keep a type fallback for unavailable assets. */}}}
  void Promise.all(Array.from({length:Math.min(4,ids.length)},worker)).then(()=>{if(active)setNames(resolved)})
  return()=>{active=false}
 },[assetKey,generation])
 const contexts=useMemo(()=>objectRowContexts(rows,names),[rows,names])
 return {rows,names,contexts}
}
