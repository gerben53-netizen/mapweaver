import { useCallback, useEffect, useRef, useState } from 'react'
import type { PublicLibraryAsset } from '../../service/library'
import { defaultGeneratorMetadata, validateGeneratorMetadata, GENERATOR_HIERARCHY, SEMANTIC_TYPES, GENERATOR_ROLES, GENERATOR_BIOMES, GENERATOR_THEMES } from '../domain/generatorAssets'
import type { GeneratorMetadata } from '../domain/generatorAssets'
import { libraryDrafts, libraryFlushers, runLibraryCommand, useLibraryHistory } from './libraryHistory'
export function GeneratorMetadataDetails({asset}:{asset:PublicLibraryAsset}) {
  const [value,set]=useState<GeneratorMetadata>(asset.generator??defaultGeneratorMetadata()),[enabled,setEnabled]=useState(!!asset.generator),[error,setError]=useState(''),[status,setStatus]=useState('')
  const revision=useRef(useLibraryHistory.getState().revision),saving=useRef(false),id=`${asset.id}/generator`
  const reset=useCallback(()=>{set(asset.generator??defaultGeneratorMetadata());setEnabled(!!asset.generator);setError('');setStatus('');libraryDrafts.delete(id);revision.current=useLibraryHistory.getState().revision},[asset,id])
  // Reconcile external updates only when there is no local draft, like the existing size editor.
  useEffect(()=>{if(!libraryDrafts.has(id))reset()},[id,reset])
  useEffect(()=>{window.addEventListener('mapweaver-library-discard',reset);return()=>{window.removeEventListener('mapweaver-library-discard',reset)} })
  useEffect(()=>()=>{libraryDrafts.delete(id);libraryFlushers.delete(id)},[id])
  function dirty(){if(!libraryDrafts.has(id))revision.current=useLibraryHistory.getState().revision;libraryDrafts.add(id);setStatus('Unsaved')}
  function change(patch:Partial<GeneratorMetadata>){dirty();set({...value,...patch})}
  const save=async()=>{if(saving.current||!libraryDrafts.has(id))return;saving.current=true;setError('');try{const generator=enabled?validateGeneratorMetadata(value):null;await runLibraryCommand({op:'metadata',revision:revision.current,ids:[asset.id],patch:{generator}});libraryDrafts.delete(id);revision.current=useLibraryHistory.getState().revision;setStatus('Saved')}catch(e){setError((e as Error).message)}finally{saving.current=false}}
  useEffect(()=>{libraryFlushers.set(id,save);return()=>{libraryFlushers.delete(id)}})
  const multi=(key:'roles'|'biomes'|'themes',label:string,options:readonly string[])=><label>{label}<select aria-label={label} multiple value={value[key]} onChange={e=>change({[key]:Array.from(e.target.selectedOptions,o=>o.value)})}>{options.map(v=><option key={v}>{v}</option>)}</select></label>
  const input=(label:string,n:number,min:number,max:number,apply:(n:number)=>void)=><label>{label}<input aria-label={label} type="number" step="any" min={min} max={max} value={Number.isNaN(n)?'':n} onChange={e=>apply(e.target.valueAsNumber)}/></label>
  const scale=value.scale??{min:1,max:1},rotation=value.rotation??{allowed:false,min:0,max:0}
  return <details onKeyDown={e=>{if(e.key==='Escape'){reset();e.stopPropagation()}if(e.key==='Enter'&&e.target instanceof HTMLInputElement){e.preventDefault();void save()}}}><summary>Generator metadata</summary>
    <p>Optional procedural hints. Default size and applicable map types above remain authoritative. Existing placed objects never change.</p>
    <label><input type="checkbox" checked={enabled} onChange={e=>{dirty();setEnabled(e.target.checked)}}/>Generator-ready stamp</label>
    {enabled&&<><label>Semantic type<select aria-label="Semantic type" value={value.semanticType} onChange={e=>change({semanticType:e.target.value as GeneratorMetadata['semanticType']})}>{SEMANTIC_TYPES.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Visual hierarchy<select aria-label="Visual hierarchy" value={value.hierarchy??''} onChange={e=>change({hierarchy:e.target.value?e.target.value as GeneratorMetadata['hierarchy']:undefined})}><option value="">Legacy / unspecified</option>{GENERATOR_HIERARCHY.map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Lighting<select aria-label="Lighting" value={value.lighting??''} onChange={e=>change({lighting:e.target.value?e.target.value as GeneratorMetadata['lighting']:undefined})}><option value="">Unspecified</option><option value="northwest">Northwest</option><option value="neutral">Neutral</option><option value="other">Conflicting / other</option></select></label>
      <label><input type="checkbox" checked={value.ridgeAxis!==undefined} onChange={e=>change({ridgeAxis:e.target.checked?0:undefined})}/>Authored ridge direction</label>
      {value.ridgeAxis!==undefined&&input('Ridge axis (degrees)',value.ridgeAxis,-90,90,n=>change({ridgeAxis:n}))}
      {multi('roles','Generator roles',GENERATOR_ROLES)}{multi('biomes','Generator biomes',GENERATOR_BIOMES)}{multi('themes','Generator themes',GENERATOR_THEMES)}
      {input('Generator weight',value.weight,.000001,1000000,n=>change({weight:n}))}
      {input('Generator scale minimum',scale.min,.01,100,n=>change({scale:{...scale,min:n}}))}{input('Generator scale maximum',scale.max,.01,100,n=>change({scale:{...scale,max:n}}))}
      <label><input type="checkbox" checked={rotation.allowed} onChange={e=>change({rotation:e.target.checked?{allowed:true,min:-12,max:12}:{allowed:false,min:0,max:0}})}/>Allow procedural rotation</label>
      {rotation.allowed&&<>{input('Generator rotation minimum',rotation.min,-180,180,n=>change({rotation:{...rotation,min:n}}))}{input('Generator rotation maximum',rotation.max,-180,180,n=>change({rotation:{...rotation,max:n}}))}</>}
      {input('Generator spacing factor',value.spacing??1,.1,10,n=>change({spacing:n}))}</>}
    <button onClick={()=>void save()}>Save generator metadata</button><button onClick={reset}>Discard generator draft</button><small role="status">{status}</small>{error&&<p role="alert">{error}</p>}
  </details>
}
