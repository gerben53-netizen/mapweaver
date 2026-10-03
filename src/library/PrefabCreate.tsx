import { useEffect, useMemo, useRef, useState } from 'react'
import { zipSync, strToU8 } from 'fflate'
import { Modal } from '../app/Modal'
import { currentSnapshot } from '../projects/session'
import { gatherProject } from '../projects/archive'
import { parseProject } from '../projects/format'
import { captureSource, transformComposition, validatePrefab } from '../domain/prefabs'
import type { PrefabSource, Prefab } from '../domain/prefabs'
import type { DefaultSize, LibraryCategory } from '../domain/library'
import { categoryPath, validateDefaultSize, normalizeTags, libraryText } from '../domain/library'
import { useEditorStore } from '../store/editorStore'
import { api, request, beginStorageWork } from '../storage/api'
import { useLibraryHistory } from './libraryHistory'
import { renderPrefab } from './prefabRender'
import type { ProjectSnapshot } from '../store/history'
import type { AssetEntry } from '../domain/assetManifest'

export function PrefabCreate() {
  const [source,setSource]=useState<ProjectSnapshot|null>(null)
  return <><button onClick={()=>setSource(structuredClone(currentSnapshot()))}>Save as reusable prefab</button>{source&&<CreateDialog snapshot={source} onClose={()=>setSource(null)}/>}</>
}
function CreateDialog({snapshot,onClose}:{snapshot:ProjectSnapshot;onClose:()=>void}) {
  const [initial]=useState(()=>useEditorStore.getState().selectedObjectIds)
  const [kind,setKind]=useState<PrefabSource['kind']>('selection'),[sourceId,setSourceId]=useState(''),[hidden,setHidden]=useState(false),[required,setRequired]=useState(false),[detach,setDetach]=useState(false)
  const [mode,setMode]=useState<Prefab['mode']>('editable'),[title,setTitle]=useState('Reusable composition'),[description,setDescription]=useState(''),[tags,setTags]=useState(''),[category,setCategory]=useState('uncategorized'),[categories,setCategories]=useState<LibraryCategory[]>([])
  const [anchor,setAnchor]=useState('center'),[scale,setScale]=useState<1|2>(1),[grid,setGrid]=useState(false),[size,setSize]=useState<DefaultSize>({mode:'native',lockAspectRatio:true}),[types,setTypes]=useState<string[]>([])
  const [busy,setBusy]=useState(false),[previewBusy,setPreviewBusy]=useState(false),[error,setError]=useState(''),[prepared,setPrepared]=useState<{signature:string;url:string;token:string;revision:number;count:number}|null>(null)
  const controller=useRef<AbortController|null>(null),url=useRef('')
  useEffect(()=>{void api<{categories:LibraryCategory[]}>('/library').then(r=>setCategories(r.categories)).catch(e=>setError(e.message));return()=>{controller.current?.abort();if(url.current)URL.revokeObjectURL(url.current)}},[])
  const {selection,sourceError}=useMemo(()=>{
    try{return {selection:captureSource(snapshot,{kind,ids:kind==='selection'?initial:sourceId?[sourceId]:[]},hidden,required,detach),sourceError:''}}
    catch(e){return {selection:undefined,sourceError:(e as Error).message}}
  },[snapshot,kind,initial,sourceId,hidden,required,detach])
  const signature=JSON.stringify({kind,sourceId,hidden,required,detach,mode,title,description,tags,category,anchor,scale,grid,size,types})
  const sources=kind==='group'?snapshot.objectGroups||[]:kind==='layer'?snapshot.layers:snapshot.layerTree?.groups||[]
  const preview=async()=>{
    if(!selection)return
    const end=beginStorageWork();setBusy(true);setPreviewBusy(true);setError('');controller.current=new AbortController()
    try {
      if(selection.unresolved.length)throw Error('Include required objects before saving: '+selection.unresolved.join(', '))
      const titleValue=libraryText(title,120,true),tagValues=normalizeTags(tags.split(',').map(s=>s.trim()).filter(Boolean)),bounds=selection.bounds
      const defaultSize=validateDefaultSize(size,bounds.width/bounds.height)
      const now=new Date().toISOString(),info={id:crypto.randomUUID(),name:titleValue,createdAt:now,modifiedAt:now}
      const gathered=await gatherProject(selection.content,info)
      const origin={x:bounds.x,y:bounds.y}
      let document=parseProject({...gathered.document,objects:transformComposition(gathered.document.objects,origin,{x:0,y:0})})
      const localBounds={x:0,y:0,width:bounds.width,height:bounds.height}
      const rendered=await renderPrefab(document,localBounds,scale,grid,controller.current.signal)
      const point=anchor==='top-left'?{x:0,y:0}:anchor==='bottom-center'?{x:bounds.width/2,y:bounds.height}:{x:bounds.width/2,y:bounds.height/2}
      const files:Record<string,Uint8Array>={},entries:AssetEntry[]=[]
      const image=new Uint8Array(await rendered.blob.arrayBuffer()),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(image))),n=>n.toString(16).padStart(2,'0')).join('')
      if(mode==='editable')for(const a of gathered.assets.values()) {
        const file=`images/${a.manifest.hash}.${a.manifest.mimeType==='image/png'?'png':a.manifest.mimeType==='image/jpeg'?'jpg':'webp'}`
        files[file]=new Uint8Array(await a.blob.arrayBuffer());entries.push({file,type:a.manifest.kind!,sha256:a.manifest.hash,title:a.manifest.fileName.slice(0,120)})
      }
      if(mode==='flattened') {
        const id=crypto.randomUUID(),b=rendered.visibleBounds,file=`images/${digest}.png`
        files[file]=image;entries.push({file,type:'stamp',title:titleValue,sha256:digest})
        document=parseProject({...document,objectGroups:[],layerTree:{roots:['composition'],groups:[]},assets:[{id,kind:'stamp',fileName:titleValue+'.png',mimeType:'image/png',hash:digest,width:Math.round(b.width*scale),height:Math.round(b.height*scale),path:`assets/${digest}.png`}],layers:[{id:'composition',name:'Composition',visible:true,locked:false,objectIds:['flattened']}],objects:[{kind:'stamp',id:'flattened',assetId:id,x:b.x,y:b.y,width:b.width,height:b.height,rotation:0,scaleX:1,scaleY:1,opacity:1}]})
      }
      const prefab=validatePrefab({formatVersion:1,mode,bounds:localBounds,visibleBounds:rendered.visibleBounds,anchor:point,sourceMap:{...snapshot.map,background:null},document,renderScale:scale})
      files['preview.png']=image
      entries.push({file:'preview.png',type:'prefab',prefab,title:titleValue,description,tags:tagValues,categoryPath:category==='uncategorized'?[]:categoryPath(categories,category).map(c=>c.name),defaultSize,applicableMapTypes:types as AssetEntry['applicableMapTypes'],sha256:digest})
      files['mapweaver-assets.json']=strToU8(JSON.stringify({schemaVersion:2,assets:entries}))
      const bytes=zipSync(files,{level:0});controller.current.signal.throwIfAborted()
      const result=await (await request('/library/preview',{method:'POST',headers:{'Content-Type':'application/zip'},body:new Blob([new Uint8Array(bytes)]),signal:controller.current.signal})).json()
      if(result.errors.length)throw Error(result.errors.join('\n'))
      if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(rendered.blob)
      setPrepared({signature,url:url.current,token:result.token,revision:result.revision,count:entries.length})
    } catch(e){setError((e as Error).message)} finally{end();setBusy(false);setPreviewBusy(false)}
  }
  const save=async()=>{if(!prepared||prepared.signature!==signature)return;const end=beginStorageWork();setBusy(true);try{const result=await api<{revision:number}>('/library/commit','POST',{token:prepared.token,revision:prepared.revision,duplicate:'keep',createCategories:false,useExistingCategories:true});useLibraryHistory.setState(s=>({revision:result.revision,changed:s.changed+1}));useEditorStore.setState({message:'Prefab saved in Asset library → Prefabs. The source map is unchanged.'});onClose()}catch(e){setError((e as Error).message)}finally{end();setBusy(false)}}
  return <Modal wide title="Save as reusable prefab" onClose={onClose} busy={busy}>
    <label>Source<select aria-label="Source" value={kind} onChange={e=>{setKind(e.target.value as PrefabSource['kind']);setSourceId('')}}><option value="selection">Current selection</option><option value="group">Object group</option><option value="layer">Full layer</option><option value="layerGroup">Full layer group</option></select></label>
    {kind!=='selection'&&<label>Source entry<select aria-label="Source entry" value={sourceId} onChange={e=>setSourceId(e.target.value)}><option value="">Choose a source…</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
    <label><input type="checkbox" checked={hidden} onChange={e=>setHidden(e.target.checked)}/> Include hidden objects</label><p>Visibility includes parent layers and object groups. Visible locked objects are included; Editable preserves locks. Flattened renders only effectively visible content.</p>
    {selection&&<p>{selection.content.objects.length} objects · {selection.dependencies.length} image dependencies · {selection.locked} locked · {hidden?0:selection.excluded} hidden excluded · {selection.added.length} required objects added.</p>}
    {!!selection?.unresolved.length&&<p role="alert">External object relationships: {selection.unresolved.join(', ')}</p>}
    <label><input type="checkbox" checked={required} onChange={e=>setRequired(e.target.checked)}/> Include required objects (maximum 256; hidden objects still require permission)</label>
    <label><input type="checkbox" checked={detach} onChange={e=>setDetach(e.target.checked)}/> Detach external optional links (labels, room provenance and junction annotations); doors/windows still need walls</label>
    <label>Mode<select aria-label="Mode" value={mode} onChange={e=>setMode(e.target.value as Prefab['mode'])}><option value="editable">Editable — independent objects, layers and relationships</option><option value="flattened">Flattened — one transparent image; original objects cannot be recovered</option></select></label>
    <label>Title<input value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/></label><label>Description<textarea style={{display:"block",width:"100%",minHeight:64,background:"#191c23",color:"#eee",border:"1px solid #596271"}} value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Tags (comma separated)<input value={tags} onChange={e=>setTags(e.target.value)}/></label>
    <label>Category<select aria-label="Category" value={category} onChange={e=>setCategory(e.target.value)}><option value="uncategorized">Uncategorized</option>{categories.filter(c=>c.id!=='uncategorized').map(c=><option key={c.id} value={c.id}>{categoryPath(categories,c.id).map(c=>c.name).join(' › ')}</option>)}</select></label>
    <label>Anchor<select aria-label="Anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="center">Center</option><option value="top-left">Top left</option><option value="bottom-center">Bottom center</option></select></label>
    <label>Default size<select aria-label="Default size" value={size.mode} onChange={e=>setSize({mode:e.target.value as DefaultSize['mode'],lockAspectRatio:true,unit:e.target.value==='grid'?'cells':e.target.value==='world'?'m':undefined})}><option value="native">Native — stored composition size</option><option value="grid">Grid cells</option><option value="world">World metres</option></select></label>{size.mode!=='native'&&<label>Default width ({size.unit})<input type="number" min="0.000001" step="any" value={size.width||''} onChange={e=>setSize({...size,width:Number(e.target.value)})}/></label>}
    <label>Applicable map types<select aria-label="Applicable map types" multiple value={types} onChange={e=>setTypes(Array.from(e.target.selectedOptions,o=>o.value))}><option value="battlemap">Battlemap</option><option value="regional-map">Regional map</option><option value="world-map">World map</option></select></label><p>No selected map types means any. Only uniform scaling is supported, preserving scatter and architectural proportions.</p>
    <label>Render resolution<select aria-label="Render resolution" value={scale} onChange={e=>setScale(Number(e.target.value) as 1|2)}><option value={1}>1×</option><option value={2}>2×</option></select></label><label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/> Include grid in rendered image</label>
    {selection&&<p>Initial render: {Math.ceil((selection.bounds.width+64)*scale)} × {Math.ceil((selection.bounds.height+64)*scale)} px · at least {Math.ceil((selection.bounds.width+64)*(selection.bounds.height+64)*scale*scale*8/1048576)} MiB plus source images. Safe alpha crop includes padding; render pixels do not change placement size.</p>}
    {(sourceError||error)&&<p role="alert">{sourceError||error}</p>}<button disabled={busy||!selection} onClick={()=>void preview()}>Preview composition</button>
    {prepared&&<><img alt="Composition preview" src={prepared.url} style={{maxWidth:'100%',maxHeight:260,objectFit:'contain',background:'#555'}}/><p>{prepared.count} library entries including dependencies. {prepared.signature!==signature?'Options changed; preview again.':'Ready to save transactionally.'}</p></>}
    <button disabled={busy||!prepared||prepared.signature!==signature} onClick={()=>void save()}>Confirm save prefab</button><button disabled={busy} onClick={onClose}>Cancel</button>{previewBusy&&<button onClick={()=>controller.current?.abort()}>Cancel preview</button>}{busy&&<p role="status">Preparing composition…</p>}
  </Modal>
}
