import { isLandMap } from '../domain/geography'
import { useProjectStore } from '../store/projectStore'
import { useEffect,useState } from 'react'
import type { TypedAsset } from '../domain/models'
import type { ScatterSource } from '../domain/scatter'
import { SCATTER_LIMITS } from '../domain/scatter'
import { scatterSource } from '../domain/scatterSizing'
import { libraryRepository } from '../storage/libraryRepository'
import { adoptLibraryAsset,projectAssets,useAssetContext } from '../projects/assets'
import { useImage } from '../images/useImage'
import { useEditorStore } from '../store/editorStore'
import { Modal } from './Modal'
import { api } from '../storage/api'
import styles from './Scatter.module.css'
function Thumbnail({asset}:{asset:TypedAsset}){const {image,error}=useImage(asset.id,'thumbnail');return <>{image?<img src={image.src} width={42} height={42} alt=""/>:<span>{error?'Missing image':'…'}</span>}</>}
export function ScatterPicker({sources,onApply,onClose,single=false}:{sources:ScatterSource[];onApply:(sources:ScatterSource[])=>void;onClose:()=>void;single?:boolean}){
  const [assets,setAssets]=useState<TypedAsset[]>([]),[categories,setCategories]=useState(new Map<string,string>()),[selected,setSelected]=useState(sources),[search,setSearch]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[recent,setRecent]=useState<{assetId:string;weight:number}[][]>([])
  useEffect(()=>{let active=true;libraryRepository.snapshot().then(data=>{if(!active)return;setAssets([...new Map([...data.assets,...projectAssets()].filter(a=>a.kind==='stamp').map(a=>[a.id,a])).values()]);setCategories(new Map(data.categories.map(c=>[c.id,c.name])))}).catch(e=>{if(active)setError(e.message)});api<{assetId:string;weight:number}[][]>('/scatter-presets').then(r=>{if(active)setRecent(r)}).catch(()=>{});return()=>{active=false}},[])
  const apply=async()=>{const generation=useAssetContext.getState().generation;setBusy(true);try{const next:ScatterSource[]=[];for(const source of selected){const asset=assets.find(a=>a.id===source.assetId);if(!asset)throw Error('Remove unavailable assets or replace them.');const adopted=projectAssets().some(a=>a.id===asset.id)?asset:await adoptLibraryAsset(asset);next.push({...source,assetId:adopted.id})}if(generation!==useAssetContext.getState().generation)throw Error('Project changed; choose stamps again.');onApply(next);void api('/scatter-presets','POST',next.map(a=>({assetId:a.assetId,weight:a.weight}))).catch(()=>{});onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  return <Modal title={single?'Replace scatter asset':'Scatter stamps'} wide busy={busy} onClose={onClose}><p>Choose up to {single?1:SCATTER_LIMITS.sources} stamps. Sizes are captured now; existing instances never follow later metadata changes.</p>
    <input aria-label="Search scatter stamps" placeholder="Search stamps" value={search} onChange={e=>setSearch(e.target.value)}/>
    {!single&&recent.length>0&&<div>Recent sets: {recent.map((set,i)=><button key={i} onClick={()=>setSelected(set.map(s=>{const a=assets.find(a=>a.id===s.assetId);return a?scatterSource(a,useProjectStore.getState().map,s.weight):{...s,width:1,height:1}}))}>Set {i+1}</button>)}</div>}
    <div className={styles.list}>{assets.filter(a=>a.name.toLowerCase().includes(search.toLowerCase())).map(asset=>{const source=selected.find(a=>a.assetId===asset.id),size=scatterSource(asset,useProjectStore.getState().map);return <div className={styles.asset} key={asset.id}><label><input type="checkbox" aria-label={asset.name} checked={!!source} disabled={!source&&!single&&selected.length===16} onChange={e=>setSelected(e.target.checked?single?[size]:[...selected,size]:selected.filter(a=>a.assetId!==asset.id))}/><Thumbnail asset={asset}/><span>{asset.name}<small>{categories.get(asset.categoryId)||'Project'} · {Math.round(size.width)} × {Math.round(size.height)} px{asset.sizing?.sizingMode==='world'&&!isLandMap(useProjectStore.getState().map)?' · native fallback (map has no physical scale)':''}</small></span></label>{source&&<><input aria-label={`Weight ${asset.name}`} type="number" min="0.01" max="1000" step="0.1" value={source.weight} onChange={e=>setSelected(selected.map(a=>a.assetId===asset.id?{...a,weight:Number(e.target.value)}:a))}/><button onClick={()=>setSelected(selected.filter(a=>a.assetId!==asset.id))}>Remove</button></>}</div>})}</div>
    {selected.filter(s=>!assets.some(a=>a.id===s.assetId)).map(s=><p key={s.assetId}>Missing asset: {s.assetId} <button onClick={()=>setSelected(selected.filter(a=>a!==s))}>Remove</button></p>)}
    {!assets.length&&<p>No stamps yet. Import images in Asset library to start scattering. Fill patterns are not stamps.</p>}
    {error&&<p role="alert">{error}</p>}<div className={styles.actions}><button onClick={()=>setSelected(selected.map(s=>({...s,weight:1})))}>Equal weights</button><button disabled={busy||!selected.length||selected.some(s=>!Number.isFinite(s.weight)||s.weight<.01||s.weight>1000)} onClick={()=>void apply()}>Use stamps</button><button disabled={busy} onClick={onClose}>Cancel</button>{!assets.length&&<button onClick={()=>{onClose();useEditorStore.setState({workspace:'library',libraryKind:'stamp'})}}>Asset library</button>}</div>
  </Modal>
}
