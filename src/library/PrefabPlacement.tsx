import { useEffect, useState } from 'react'
import { create } from 'zustand'
import type { PublicLibraryAsset } from '../../service/library'
import { api, beginStorageWork } from '../storage/api'
import { placePrefab, prefabScale, remapPrefabAssets } from '../domain/prefabs'
import type { Prefab } from '../domain/prefabs'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history } from '../store/history'
import { currentSnapshot, useProjectSession } from '../projects/session'
import { gatherProject } from '../projects/archive'
import { adoptLibraryAsset } from '../projects/assets'
import { snapPoint, interactionGrid } from '../domain/mapSettings'
import { screenToMap } from '../canvas/viewport'
import type { Point } from '../canvas/viewport'
import { Modal } from '../app/Modal'

const usePrefabPlacement = create(()=>({ point:null as Point|null, pending:null as {prefab:Prefab;asset:PublicLibraryAsset;scale:number;rotation:number;mode:'layers'|'active'}|null }))
export function PrefabPlacementButton({asset}:{asset:PublicLibraryAsset}) {
  const [open,setOpen]=useState(false),[mode,setMode]=useState<'layers'|'active'>('layers'),[rotation,setRotation]=useState(0),[multiplier,setMultiplier]=useState(1),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const choose=async()=>{
    setBusy(true);setError('');const end=beginStorageWork()
    try {
      const prefab=await api<Prefab>(`/prefabs/${asset.id}`),resolved=prefabScale(prefab,asset.defaultSize,useProjectStore.getState().map,asset.applicableMapTypes)
      if(!Number.isFinite(multiplier)||multiplier<=0||!Number.isFinite(rotation))throw Error('Use a positive uniform scale and finite rotation.')
      usePrefabPlacement.setState({point:null,pending:{prefab,asset,scale:resolved.scale*multiplier,rotation,mode}})
      useEditorStore.setState({workspace:'editor',activeTool:'select',message:resolved.reason||'Click to place prefab at its anchor. Escape cancels.'})
      setOpen(false)
    }catch(e){setError((e as Error).message)}finally{end();setBusy(false)}
  }
  return <><button onClick={()=>setOpen(true)}>Place prefab…</button>{open&&<Modal title="Place prefab" onClose={()=>setOpen(false)} busy={busy}><p>{asset.name} · {asset.prefabMode}. Independent copy; library changes never update placed objects.</p><label>Layers<select aria-label="Layers" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="layers">Keep internal layers in a new layer group</option><option value="active">Place on active layer</option></select></label><p>Active-layer placement bakes inherited visibility and locks into objects. Object groups and paint order are retained.</p><label>Uniform scale<input type="number" min="0.000001" step="any" value={multiplier} onChange={e=>setMultiplier(Number(e.target.value))}/></label><label>Rotation (degrees)<input type="number" value={rotation} onChange={e=>setRotation(Number(e.target.value))}/></label>{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>void choose()}>Choose placement</button></Modal>}</>
}
export function PrefabPlacementOverlay() {
  const pending=usePrefabPlacement(s=>s.pending),viewport=useEditorStore(s=>s.viewport),workspace=useEditorStore(s=>s.workspace)
  const point=usePrefabPlacement(s=>s.point),setPoint=(point:Point)=>usePrefabPlacement.setState({point})
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{if(pending)document.querySelector<HTMLElement>('[aria-label="Prefab placement preview"]')?.focus()},[pending])
  useEffect(()=>{const cancel=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy&&usePrefabPlacement.getState().pending){e.preventDefault();e.stopImmediatePropagation();usePrefabPlacement.setState({pending:null});document.querySelector<HTMLElement>('[aria-label="Map canvas"]')?.focus()}};window.addEventListener('keydown',cancel,true);return()=>window.removeEventListener('keydown',cancel,true)},[busy])
  if(!pending||workspace!=='editor')return null
  const {prefab,asset,scale,rotation,mode}=pending,map=useProjectStore.getState().map,position=point||{x:map.width/2,y:map.height/2}
  const commit=async(p:Point)=>{
    if(busy)return;setBusy(true);setError('');const end=beginStorageWork(),before=currentSnapshot(),generation=useProjectSession.getState().generation
    try {
      // Recheck all bytes at placement time, including dependencies changed since choosing the tool.
      const fresh=await api<Prefab>(`/prefabs/${asset.id}`),mapping=new Map<string,string>()
      for(const a of fresh.document.assets){const adopted=await adoptLibraryAsset({id:a.id,kind:a.kind!,name:a.fileName,mimeType:a.mimeType,naturalWidth:a.width,naturalHeight:a.height,contentHash:a.hash,categoryId:'uncategorized',createdAt:''});mapping.set(a.id,adopted.id)}
      const copy=remapPrefabAssets(fresh,mapping),current=await gatherProject(before,useProjectSession.getState().info)
      const result=placePrefab(copy,current.document,p,scale,rotation,mode,useEditorStore.getState().activeLayerId)
      if(generation!==useProjectSession.getState().generation||JSON.stringify(before)!==JSON.stringify(currentSnapshot()))throw Error('The project changed during preparation. Choose placement again.')
      history.run('Place prefab',()=>{const d=result.document;useProjectStore.setState({objects:d.objects,layers:d.layers,objectGroups:d.objectGroups||[],layerTree:d.layerTree!});useEditorStore.setState({selectedObjectIds:result.ids,editingGroupId:null,message:'Independent prefab copy placed. Undo removes the entire placement.'})})
      usePrefabPlacement.setState({pending:null});document.querySelector<HTMLElement>('[aria-label="Map canvas"]')?.focus()
    }catch(e){setError((e as Error).message)}finally{end();setBusy(false)}
  }
  const b=prefab.visibleBounds,zoom=viewport.zoom*scale
  return <div aria-label="Prefab placement preview" tabIndex={0} style={{position:'absolute',inset:0,zIndex:5,cursor:'crosshair'}} onPointerMove={e=>{const rect=e.currentTarget.getBoundingClientRect();const p=screenToMap({x:e.clientX-rect.left,y:e.clientY-rect.top},viewport);setPoint(snapPoint(p,interactionGrid(map),e.altKey))}} onPointerDown={e=>{if(e.button!==0||busy)return;e.preventDefault();e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();void commit(snapPoint(screenToMap({x:e.clientX-rect.left,y:e.clientY-rect.top},viewport),interactionGrid(map),e.altKey))}}>
    <div style={{position:'absolute',left:viewport.pan.x+position.x*viewport.zoom,top:viewport.pan.y+position.y*viewport.zoom,pointerEvents:'none',transform:`rotate(${rotation}deg)`,transformOrigin:'0 0'}}><img src={`/api/v1/assets/${asset.id}/content`} alt="" style={{position:'absolute',left:(b.x-prefab.anchor.x)*zoom,top:(b.y-prefab.anchor.y)*zoom,width:b.width*zoom,height:b.height*zoom,maxWidth:'none',opacity:.7}}/><span style={{position:'absolute',left:-8,top:-12,color:'#ffd47d',fontSize:24}}>+</span></div>
    <div style={{position:'absolute',left:12,bottom:12,background:'#222',padding:10,maxWidth:480}} onPointerMove={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}><p>{busy?'Preparing…':'Click to place · Alt bypasses grid · Escape cancels'}</p>{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>void commit(position)}>Place at preview anchor</button><button disabled={busy} onClick={()=>usePrefabPlacement.setState({pending:null})}>Cancel placement</button></div>
  </div>
}
