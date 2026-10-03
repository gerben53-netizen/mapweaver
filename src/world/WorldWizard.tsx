import { WORLD_MAP_THEMES, worldTheme } from '../domain/worldThemes'
import { themeWorld, themeWorldAssets } from './themeWorld'
import { acquireImage } from '../images/imageCache'
import { exportScene } from '../export/scene'
import { DEFAULT_WORLD_SCATTER,DENSITIES,scatterEnabled } from './scatterModel'
import type { WorldScatterSettings } from './scatterModel'
import { GENERATOR_THEMES } from '../domain/generatorAssets'
import { loadWorldScatterAssets,prepareWorldResources } from './scatterResources'
import { GeneratorReadiness } from './GeneratorReadiness'
import { styleWorld } from './styleWorld'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../app/Modal'
import { WORLD_DEFAULTS, WORLD_PRESETS, validateWorldParameters } from './model'
import type { WorldParameters, WorldResult } from './model'
import styles from './WorldWizard.module.css'
export function WorldWizard({initialThemeId='',name,width,height,widthKm,busy,error,onClose,onApply}:{initialThemeId?:string;name:string;width:number;height:number;widthKm:number;busy:boolean;error:string;onClose:()=>void;onApply:(result:WorldResult)=>Promise<void>}){
 const [p,set]=useState<WorldParameters>({...WORLD_DEFAULTS,width,height,widthKm}),[result,setResult]=useState<WorldResult|null>(null),[working,setWorking]=useState(false),[failure,setFailure]=useState('')
 const [themeId,setThemeId]=useState(initialThemeId),[styled,setStyled]=useState(true),[scatter,setScatter]=useState<WorldScatterSettings>({...DEFAULT_WORLD_SCATTER,theme:worldTheme(initialThemeId)?.assetTheme??DEFAULT_WORLD_SCATTER.theme}),[decoded,setDecoded]=useState<{assets:WorldResult['assets'];images:Map<string,HTMLImageElement>}>({assets:undefined,images:new Map()})
 const requestId=useRef(0)
 const displayed=useMemo(()=>result?(themeId?themeWorld(result,themeId):styled?styleWorld(result):result):null,[result,styled,themeId])
 const images=useMemo(()=>decoded.assets===displayed?.assets?decoded.images:new Map<string,HTMLImageElement>(),[decoded,displayed?.assets])
 const worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),canvas=useRef<HTMLCanvasElement>(null)
 const stop=()=>{requestId.current++;worker.current?.terminate();worker.current=null;clearTimeout(timer.current);setWorking(false)}
 useEffect(()=>()=>{requestId.current++;worker.current?.terminate();clearTimeout(timer.current)},[])
 useEffect(()=>{let cancelled=false;const loaded:ReturnType<typeof acquireImage>[]=[];if(!displayed?.assets?.length)return;void (async()=>{try{const next=new Map<string,HTMLImageElement>();for(const a of displayed.assets!){const lease=acquireImage('world-preview:'+crypto.randomUUID(),async()=>a.blob);loaded.push(lease);const image=await lease.promise;if(cancelled){lease.release();return}next.set(a.manifest.id,image)}if(!cancelled)setDecoded({assets:displayed.assets,images:next})}catch(e){if(!cancelled)setFailure((e as Error).message)}})();return()=>{cancelled=true;loaded.forEach(i=>i.release())}},[displayed?.assets])
 useEffect(()=>{let cancelled=false;const result=displayed,c=canvas.current?.getContext('2d');if(!c||!result)return;void import('../export/render').then(({buildScene})=>{if(cancelled)return;c.clearRect(0,0,720,450);const scale=Math.min(720/result.map.width,450/result.map.height),root=buildScene(exportScene(result,{scale:1,transparent:false,includeGrid:false}),images);try{const preview=root.toCanvas({x:0,y:0,width:result.map.width,height:result.map.height,pixelRatio:scale});c.drawImage(preview,(720-preview.width)/2,(450-preview.height)/2);preview.width=preview.height=0}finally{root.destroy()}}).catch(e=>{if(!cancelled)setFailure((e as Error).message)});return()=>{cancelled=true}},[displayed,images])

 const generate=()=>{
  stop();setFailure('');const ticket=requestId.current
  try{const params=validateWorldParameters(p);setWorking(true)
   const start=(assets?:Awaited<ReturnType<typeof loadWorldScatterAssets>>)=>{
    if(requestId.current!==ticket)return
    const w=new Worker(new URL('./generate.worker.ts',import.meta.url),{type:'module'});worker.current=w
    w.onmessage=(event:MessageEvent<{result?:WorldResult;error?:string}>)=>{
     if(worker.current!==w||requestId.current!==ticket)return
     w.terminate();worker.current=null
     if(!event.data.result){stop();setFailure(event.data.error||'Generation failed.');return}
     const result=event.data.result
     if(!assets){stop();setResult(result);return}
     void prepareWorldResources(result,()=>requestId.current===ticket).then(prepared=>{if(requestId.current===ticket){stop();setResult(prepared)}}).catch(e=>{if(requestId.current===ticket){stop();setFailure((e as Error).message)}})
    }
    w.onerror=()=>{if(requestId.current===ticket){stop();setFailure('Generation worker failed. Please try another seed.')}}
    w.postMessage(assets?{parameters:params,settings:scatter,assets:themeWorldAssets(assets,themeId)}:params)
   }
   timer.current=setTimeout(()=>{if(requestId.current===ticket){stop();setFailure('Generation exceeded 15 seconds. Try fewer assets or a different seed.')}},15000)
   if(scatterEnabled(scatter))void loadWorldScatterAssets().then(start).catch(e=>{if(requestId.current===ticket){stop();setFailure((e as Error).message)}});else start()
  }catch(e){stop();setFailure((e as Error).message)}
 }

 const amount=(key:'water'|'roughness'|'mountains'|'forests'|'islands',label:string)=><label>{label} <output>{Math.round(p[key]*100)}%</output><input aria-label={label} type="range" min={key==='water'?15:0} max={key==='water'?75:100} value={p[key]*100} onChange={e=>set({...p,[key]:Number(e.target.value)/100})}/></label>
 const number=(key:'continents'|'rivers'|'width'|'height'|'widthKm',label:string,min:number,max:number)=><label>{label}<input aria-label={label} type="number" min={min} max={max} value={p[key]} onChange={e=>set({...p,[key]:Number(e.target.value)})}/></label>
 const stale=!!result&&(JSON.stringify(result.map.generation!.parameters)!==JSON.stringify(p)||((scatterEnabled(scatter)||!!result.map.generation!.scatter)&&JSON.stringify(result.map.generation!.scatter?.settings)!==JSON.stringify(scatter)))
 const imageReady=!displayed?.assets?.some(a=>!images.has(a.manifest.id))
 return <Modal title="Generate world map" wide busy={busy} onClose={()=>{stop();onClose()}}><p>Create an editable starting point for {name}. Preview makes no changes to your maps.</p><div className={styles.layout}><fieldset disabled={busy||working}><legend>World settings</legend><label>Visual style<select aria-label="Visual style" value={themeId} onChange={e=>{const id=e.target.value,t=worldTheme(id);setThemeId(id);setResult(null);if(t)setScatter({...scatter,theme:t.assetTheme,...(t.sparse?{mountains:'off',forests:'off',details:'off'}:{})})}}><option value="">Current generator style</option>{Object.values(WORLD_MAP_THEMES).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Preset<select aria-label="Generation preset" defaultValue="Balanced Fantasy" onChange={e=>set({...WORLD_DEFAULTS,...WORLD_PRESETS[e.target.value],seed:p.seed,width:p.width,height:p.height,widthKm:p.widthKm})}>{Object.keys(WORLD_PRESETS).map(v=><option key={v}>{v}</option>)}</select></label><label>Seed<input aria-label="Seed" maxLength={80} value={p.seed} onChange={e=>set({...p,seed:e.target.value})}/></label><button type="button" onClick={()=>set({...p,seed:crypto.randomUUID().slice(0,12)})}>Randomize seed</button>{number('continents','Continents',1,8)}{amount('water','Water level')}{amount('roughness','Land roughness')}{amount('mountains','Mountains')}{amount('forests','Forests')}{number('rivers','Rivers',0,40)}{amount('islands','Islands')}<label>Climate<select aria-label="Climate" value={p.climate} onChange={e=>set({...p,climate:e.target.value as WorldParameters['climate']})}>{['balanced','cold','tropical','dry','wet'].map(v=><option key={v}>{v}</option>)}</select></label><details><summary>Map dimensions and scale</summary>{number('width','Width (px)',512,4096)}{number('height','Height (px)',512,4096)}{number('widthKm','World width (km)',1,1000000)}</details><fieldset><legend>Terrain stamps</legend>{(['mountains','forests','details'] as const).map(key=><label key={key}>{({mountains:'Mountain chains',forests:'Forest clusters',details:'Hills, rocks and wetlands'})[key]}<select aria-label={key+' stamp density'} value={scatter[key]} onChange={e=>setScatter({...scatter,[key]:e.target.value})}>{DENSITIES.map(d=><option key={d} value={d}>{d[0].toUpperCase()+d.slice(1)}</option>)}</select></label>)}<label>Asset family<select aria-label="Scatter asset theme" disabled={!!themeId} value={scatter.theme} onChange={e=>setScatter({...scatter,theme:e.target.value as WorldScatterSettings['theme']})}>{GENERATOR_THEMES.map(t=><option key={t}>{t}</option>)}</select></label><p className="muted">Requires compatible library stamps. Missing families are skipped and reported.</p></fieldset><GeneratorReadiness/></fieldset><section aria-label="World preview" className={styles.preview}><label><input type="checkbox" disabled={!!themeId} checked={styled} onChange={e=>setStyled(e.target.checked)}/>Textured terrain and soft coasts{themeId?' (set by visual theme)':''}</label><canvas ref={canvas} width={720} height={450} aria-label="Generated world preview"/>{!result&&<p>Choose settings, then Generate preview.</p>}{result&&<p>{Math.round(result.stats.landFraction*100)}% land · {result.objects.length} editable objects · {result.stats.riverCount} rivers · {result.stats.points} Area nodes{result.stats.discarded?` · ${result.stats.discarded} small/complex regions omitted`:''}</p>}<p className="muted">Terrain Areas and river paths remain editable. Enabled terrain stamps are ordinary selectable objects. Continent count controls major terrain centres; coastlines may join or split them.</p><p className="muted">Version 1 creates a new map. It never replaces existing maps or manual edits. Keep the seed and settings to reproduce this version.</p>{result?.map.generation?.scatter&&<p>{result.map.generation.scatter.placements.length} editable terrain stamps</p>}{!!result?.map.generation?.scatter?.warnings.length&&<details><summary>Placement notes ({result.map.generation.scatter.warnings.length})</summary><ul>{result.map.generation.scatter.warnings.map(w=><li key={w}>{w}</li>)}</ul></details>}{working&&<p role="status">Preparing terrain and semantic stamps…</p>}{stale&&<p role="status">Settings changed. Regenerate before creating the map.</p>}{(failure||error)&&<p role="alert">{failure||error}</p>}</section></div><div className={styles.actions}>{working?<button onClick={stop}>Cancel generation</button>:<button disabled={busy} onClick={generate}>{result?'Regenerate preview':'Generate preview'}</button>}<button className="primary" disabled={busy||working||!result||stale||!imageReady} onClick={()=>{if(displayed)void onApply(displayed)}}>Create generated map</button><button disabled={busy} onClick={()=>{stop();onClose()}}>Cancel</button></div></Modal>
}


