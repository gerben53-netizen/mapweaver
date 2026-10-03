import { useEffect, useRef, useState } from 'react'
import { markerCandidates, markerAssetMetadata } from '../domain/illustratedMarkers'
import type { IllustratedCandidate } from '../domain/illustratedMarkers'
import type { MapType } from '../domain/geography'
import { loadBundledMarkers, prepareMarkerAsset } from '../library/illustratedMarkers'
import { api } from '../storage/api'
import type { PublicLibraryAsset } from '../../service/library'
import { AssetThumbnail } from '../library/AssetThumbnail'
import { projectAssets, useAssetContext } from '../projects/assets'
import styles from './Markers.module.css'

export function IllustratedMarkerPicker({type,mapType,selected,onChoose,onBusy}:{type:string;mapType:MapType;selected?:string;onChoose:(asset:{id:string;aspect:number})=>void;onBusy?:(busy:boolean)=>void}) {
 const [chosen,setChosen]=useState<{candidate:string;asset:string}|null>(null)
 const [assets,setAssets]=useState<IllustratedCandidate[]>([]),[override,setOverride]=useState(false),[theme,setTheme]=useState(''),[family,setFamily]=useState('')
 const [page,setPage]=useState(0),[total,setTotal]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0)
 const alive=useRef(true),requestId=useRef(0),generation=useAssetContext(s=>s.generation)
 const callback=useRef(onChoose);useEffect(()=>{callback.current=onChoose},[onChoose])
 const busyCallback=useRef(onBusy);useEffect(()=>{busyCallback.current=onBusy},[onBusy])
 useEffect(()=>{alive.current=true;requestId.current++;return()=>{alive.current=false;busyCallback.current?.(false)}},[])
 useEffect(()=>{const token=++requestId.current;queueMicrotask(()=>{if(alive.current&&token===requestId.current){setBusy(false);busyCallback.current?.(false)}})},[type,mapType,generation])
 useEffect(()=>{let current=true;queueMicrotask(()=>{if(current){setLoading(true);setError('')}})
  void Promise.allSettled([loadBundledMarkers(),api<{assets:PublicLibraryAsset[];total:number}>(`/library?type=stamp&limit=60&offset=${page*60}&mapType=${mapType}&search=${encodeURIComponent(override?'':`marker:${type}`)}`)]).then(([bundled,library])=>{
   if(!current)return
   const local=projectAssets().filter(a=>a.kind==='stamp').map(a=>({id:a.id,name:a.name,tags:[],applicableMapTypes:[],width:a.naturalWidth,height:a.naturalHeight,sha256:a.contentHash,source:'project' as const}))
   const imported=library.status==='fulfilled'?library.value.assets.map(a=>({id:a.id,name:a.name,tags:a.tags,applicableMapTypes:a.applicableMapTypes,width:a.width,height:a.height,sha256:a.sha256,source:'library' as const})):[]
   const combined=[...imported,...(bundled.status==='fulfilled'?bundled.value:[]),...(override?local:[])],seen=new Set<string>()
   setAssets(combined.filter(a=>{const key=a.sha256??a.id;if(seen.has(key))return false;seen.add(key);return true}))
   setTotal(library.status==='fulfilled'?library.value.total:0)
   if(bundled.status==='rejected'||library.status==='rejected')setError('Some illustrations could not be loaded. Local bundled artwork remains available when the library is offline.')
   setLoading(false)
  });return()=>{current=false}
 },[type,mapType,override,page,retry,generation])
 const metadata=assets.map(a=>markerAssetMetadata(a.tags)),themes=[...new Set(metadata.flatMap(m=>m.themes))].sort(),families=[...new Set(metadata.flatMap(m=>m.families))].sort()
 const candidates=markerCandidates(assets,type,mapType,{override,theme,family})
 const choose=async(asset:IllustratedCandidate)=>{const token=++requestId.current;setBusy(true);busyCallback.current?.(true);setError('');try{const prepared=await prepareMarkerAsset(asset);if(alive.current&&token===requestId.current){setChosen({candidate:asset.id,asset:prepared.id});callback.current(prepared)}}catch(e){if(alive.current)setError((e as Error).message)}finally{if(alive.current&&token===requestId.current){setBusy(false);busyCallback.current?.(false)}}}
 return <fieldset disabled={busy}><legend>Illustrated symbol</legend>
 {selected&&<p>Current illustration: {projectAssets().find(a=>a.id===selected)?.name??assets.find(a=>a.id===selected)?.name??'Selected image'}</p>}
 <label><span><input type="checkbox" checked={override} onChange={e=>{setOverride(e.target.checked);setPage(0)}}/> Show other stamp types (manual override)</span></label>
 <div className={styles.filters}><label>Theme<select aria-label="Illustration theme" value={theme} onChange={e=>setTheme(e.target.value)}><option value="">All themes</option>{themes.map(t=><option key={t}>{t}</option>)}</select></label><label>Style family<select aria-label="Illustration family" value={family} onChange={e=>setFamily(e.target.value)}><option value="">All families</option>{families.map(t=><option key={t}>{t}</option>)}</select></label></div>
 {loading&&<p role="status">Loading illustrations…</p>}
 <div className={styles.icons} aria-label="Illustrated symbols">{candidates.map(a=><button key={a.source+':'+a.id} type="button" aria-label={a.name} aria-pressed={(selected===a.id||(!!chosen&&selected===chosen.asset&&a.id===chosen.candidate))} onClick={()=>void choose(a)}>{a.source==='bundled'?<img src={`/settlement-assets-painterly/${a.file}`} alt="" loading="lazy"/>:<AssetThumbnail id={a.id} source={a.source}/>}<span>{a.name}</span></button>)}</div>
 {!loading&&!candidates.length&&<p>No matching illustrations. Choose another type or enable manual override.</p>}
 {total>60&&<div className={styles.actions}><button type="button" disabled={!page} onClick={()=>setPage(page-1)}>Previous library page</button><span>{page+1} / {Math.ceil(total/60)}</span><button type="button" disabled={(page+1)*60>=total} onClick={()=>setPage(page+1)}>Next library page</button></div>}
 {busy&&<p role="status">Preparing illustration…</p>}{error&&<p role="alert">{error} <button type="button" onClick={()=>setRetry(retry+1)}>Retry</button></p>}
 <small>Bundled illustrations are embedded when used. Import custom packs through the Asset Library. <a href="/settlement-assets-painterly/mapweaver-settlements-painterly.zip" download>Download painterly pack</a></small>
 </fieldset>
}
