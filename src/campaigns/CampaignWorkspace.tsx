import { Icon } from '../app/Icon'
import { useMemo, useState } from 'react'
import type { ReactNode, DragEvent } from 'react'
import { Modal } from '../app/Modal'
import { useProjectSession, runProjectTask } from '../projects/session'
import { useEditorStore } from '../store/editorStore'
import { api, downloadResponse } from '../storage/api'
import { downloadName } from '../projects/codec'
import { useCampaignStore, selectLocation, persistNavigation, commandCampaign, openCampaignMap, refreshCampaign, preserveWorkingMap } from './session'
import { campaignIndex, nodePath, visibleTree, mapTypeLabel, moveNodes } from './model'
import type { CampaignNode } from './model'
import styles from './CampaignExplorer.module.css'
const dragType='application/x-mapweaver-campaign-node'
export function CampaignWorkspace({children}:{children:ReactNode}) {
 const stampBrowserOpen=useEditorStore(e=>e.stampBrowserOpen)
 const s=useCampaignStore(),focus=useEditorStore(e=>e.focusMode),current=useProjectSession(p=>p.info.id),busy=useProjectSession(p=>p.busy)
 const [focused,setFocused]=useState<string|null>(null)
 const [actions,setActions]=useState<string|null|undefined>(undefined),[destination,setDestination]=useState(''),[drag,setDrag]=useState<string|null>(null),[drop,setDrop]=useState<{id:string;placement:string}|null>(null)
 const nodes=s.snapshot?.nodes||[],index=useMemo(()=>campaignIndex(s.snapshot?.nodes||[]),[s.snapshot]),tree=useMemo(()=>visibleTree(s.snapshot?.nodes||[],s.expanded),[s.snapshot,s.expanded])
 const tabStop=tree.some(r=>r.node.id===focused)?focused:tree.some(r=>r.node.id===s.selected)?s.selected:tree[0]?.node.id
 if(!s.snapshot)return <>{children}</>
 const campaign=s.snapshot.campaign,selected=s.selected?index.byId.get(s.selected):undefined,active=nodes.find(n=>n.mapId===current&&!n.deletedAt),location=s.browsing?selected:active,path=nodePath(location?.id||null,index.byId),item=actions?index.byId.get(actions)||null:null
 const run=(label:string,fn:()=>Promise<unknown>)=>{void runProjectTask(label,async()=>{try{await fn()}catch(e){useCampaignStore.setState({error:e instanceof Error?e.message:'Campaign action failed.'});throw e}})}
 const choose=(n:CampaignNode)=>n.mapId?run('Opening map…',()=>openCampaignMap(n.mapId!)):selectLocation(n.id)
 const toggle=(id:string)=>{useCampaignStore.setState({expanded:s.expanded.includes(id)?s.expanded.filter(k=>k!==id):[...s.expanded,id]});persistNavigation()}
 const parent=(n:CampaignNode|undefined|null)=>n?.mapId?n.parentId:n?.id||null
 const newMap=(n:CampaignNode|undefined|null)=>{selectLocation(parent(n));useCampaignStore.setState({newMap:true});setActions(undefined)}
 const folder=(n:CampaignNode|undefined|null)=>{const name=window.prompt('Folder name');if(name)run('Creating folder…',()=>commandCampaign({op:'folder',parentId:parent(n),name}));setActions(undefined)}
 const rename=(n:CampaignNode|null)=>{const name=window.prompt(n?'Entry name':'Campaign name',n?.name||campaign.name);if(name)run('Renaming…',()=>commandCampaign({op:'rename',id:n?.id,name}));setActions(undefined)}
 const trash=(n:CampaignNode|null)=>{if(window.confirm(`Move “${n?.name||campaign.name}” and its contents to Trash? You can restore them later.`))run('Moving to Trash…',async()=>{const result=await commandCampaign({op:'trash',id:n?.id});if(result?.campaign.deletedAt){useCampaignStore.setState({snapshot:null});window.dispatchEvent(new Event('mapweaver:projects'))}});setActions(undefined)}
 const showActions=(n:CampaignNode|null)=>{setDestination(n?.parentId||'');setActions(n?.id||null)}
 const contextPath=(n:CampaignNode)=>[campaign.name,...nodePath(n.parentId,index.byId).map(p=>p.name)].join(' › ')
 const reorder=(n:CampaignNode,delta:number)=>{const siblings=(index.children.get(n.parentId)||[]).filter(n=>!n.deletedAt),at=siblings.findIndex(p=>p.id===n.id),target=delta<0?siblings[at-1]?.id:siblings[at+2]?.id||null;if(at+delta<0||at+delta>=siblings.length)return;run('Reordering…',()=>commandCampaign({op:'move',id:n.id,parentId:n.parentId,beforeId:target}));setActions(undefined)}
 function target(event:DragEvent,n:CampaignNode|null){const rect=event.currentTarget.getBoundingClientRect(),fraction=(event.clientY-rect.top)/rect.height,placement=n?(n.mapId?(fraction<.5?'before':'after'):(fraction<.25?'before':fraction>.75?'after':'inside')):'inside';const parentId=placement==='inside'?n?.id||null:n!.parentId,siblings=index.children.get(parentId)||[],beforeId=placement==='before'?n!.id:placement==='after'?siblings[siblings.findIndex(p=>p.id===n!.id)+1]?.id||null:null;return {id:n?.id||'root',placement,parentId,beforeId}}
 const dnd=(n:CampaignNode|null)=>({onDragOver:(e:DragEvent)=>{if(!drag)return;e.preventDefault();e.stopPropagation();const t=target(e,n);try{moveNodes(nodes,drag,t.parentId,t.beforeId);e.dataTransfer.dropEffect='move';setDrop(t)}catch{e.dataTransfer.dropEffect='none';setDrop(null)}},onDrop:(e:DragEvent)=>{e.preventDefault();e.stopPropagation();const id=e.dataTransfer.getData(dragType),t=target(e,n);setDrop(null);setDrag(null);if(id&&id===drag)run('Moving entry…',()=>commandCampaign({op:'move',id,parentId:t.parentId,beforeId:t.beforeId}))}})
 let contents:CampaignNode[]
 if(s.search.trim())contents=nodes.filter(n=>!n.deletedAt&&n.name.toLocaleLowerCase().includes(s.search.trim().toLocaleLowerCase()))
 else if(s.filter==='recent')contents=nodes.filter(n=>!n.deletedAt&&n.mapId&&n.openedAt).sort((a,b)=>b.openedAt!.localeCompare(a.openedAt!)).slice(0,30)
 else if(s.filter==='favorites')contents=nodes.filter(n=>!n.deletedAt&&n.favorite)
 else if(s.filter==='trash')contents=nodes.filter(n=>n.deletedAt)
 else contents=(index.children.get(selected?.mapId?selected.parentId:s.selected)||[]).filter(n=>!n.deletedAt)
 const filter=(value:typeof s.filter)=>useCampaignStore.setState({filter:value,search:'',browsing:true})
 return <div className={styles.workspace} onKeyDown={e=>{if(!(e.target as HTMLElement).closest('[data-map-canvas]')&&(e.target as HTMLElement).closest('[data-campaign-ui]')){e.stopPropagation();if(e.key==='Escape'){setDrag(null);setDrop(null)}}}}>
  <div className={styles.breadcrumbs} data-campaign-ui><button aria-label={s.visible&&!stampBrowserOpen?'Hide Campaign Explorer':'Show Campaign Explorer'} aria-expanded={s.visible&&!stampBrowserOpen} onClick={()=>{if(stampBrowserOpen){useEditorStore.setState({stampBrowserOpen:false});useCampaignStore.setState({visible:true})}else useCampaignStore.setState({visible:!s.visible})}}>☰</button><nav aria-label="Campaign breadcrumbs"><button onClick={()=>selectLocation(null)} title={campaign.name}>{campaign.name}</button>{path.map(n=><span key={n.id}><span aria-hidden="true"> › </span><button title={contextPath(n)+' › '+n.name} aria-current={n.id===location?.id?'location':undefined} onClick={()=>choose(n)}>{n.name}</button></span>)}</nav>{s.browsing&&active&&<button onClick={()=>{useCampaignStore.setState({browsing:false});useEditorStore.setState({workspace:'editor'})}}>Return to map</button>}</div>
  <div className={styles.body}>
   <aside data-campaign-ui className={styles.explorer} hidden={!s.visible||focus||stampBrowserOpen} aria-label="Campaign Explorer">
    <div className={styles.title}><strong>Campaign Explorer</strong><button aria-label="Campaign actions" onClick={()=>showActions(null)}>⋯</button></div>
    <button className={styles.root} aria-current={s.browsing&&!s.selected?'location':undefined} {...dnd(null)} data-drop={drop?.id==='root'?drop.placement:undefined} onClick={()=>selectLocation(null)} onContextMenu={e=>{e.preventDefault();showActions(null)}}><Icon name="map"/> {campaign.name}</button>
    <input type="search" aria-label="Search campaign" placeholder="Search campaign…" value={s.search} onChange={e=>useCampaignStore.setState({search:e.target.value,browsing:true})}/>
    <div className={styles.quick}><button aria-pressed={s.filter==='recent'&&s.browsing} onClick={()=>filter('recent')}>Recent</button><button aria-pressed={s.filter==='favorites'&&s.browsing} onClick={()=>filter('favorites')}>★ Favorites</button></div>
    <div className={styles.quick}><button onClick={()=>newMap(selected)}>+ Map</button><button onClick={()=>folder(selected)}>+ Folder</button></div>
    <div role="tree" aria-label="Campaign maps" className={styles.tree}>
     {tree.map(({node:n,depth},at)=><div key={n.id} role="treeitem" tabIndex={tabStop===n.id?0:-1} onFocus={()=>setFocused(n.id)} aria-level={depth+1} aria-expanded={!n.mapId?s.expanded.includes(n.id):undefined} aria-selected={s.selected===n.id} aria-current={active?.id===n.id?'page':undefined} aria-label={`${n.name}, ${mapTypeLabel(n.mapType)}${active?.id===n.id?', open map':''}`} data-drop={drop?.id===n.id?drop.placement:undefined} style={{paddingLeft:8+depth*12}} draggable={!busy} onDragStart={e=>{setDrag(n.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData(dragType,n.id)}} onDragEnd={()=>{setDrag(null);setDrop(null)}} {...dnd(n)} onContextMenu={e=>{e.preventDefault();showActions(n)}} onKeyDown={e=>{if(e.target!==e.currentTarget)return;const focusRow=(index:number)=>e.currentTarget.parentElement!.querySelectorAll<HTMLElement>('[role=treeitem]')[index]?.focus();if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Enter','Delete','F2','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation()};if(e.key==='ArrowDown')focusRow(Math.min(tree.length-1,at+1));if(e.key==='ArrowUp')focusRow(Math.max(0,at-1));if(e.key==='Home')focusRow(0);if(e.key==='End')focusRow(tree.length-1);if(e.key==='ArrowRight'&&!n.mapId){if(!s.expanded.includes(n.id))toggle(n.id);else focusRow(at+1)}if(e.key==='ArrowLeft'){if(!n.mapId&&s.expanded.includes(n.id))toggle(n.id);else focusRow(tree.findIndex(row=>row.node.id===n.parentId))}if(e.key==='Enter')choose(n);if(e.key==='F2')rename(n);if(e.key==='Delete')trash(n);if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'){e.preventDefault();showActions(n)}}}>
      {!n.mapId?<button tabIndex={-1} aria-label={`${s.expanded.includes(n.id)?'Collapse':'Expand'} ${n.name}`} onClick={()=>toggle(n.id)}>{s.expanded.includes(n.id)?'▾':'▸'}</button>:<span className={styles.nodeIcon} aria-hidden="true"><Icon name="map"/></span>}
      {!n.mapId&&<span className={styles.nodeIcon} aria-hidden="true"><Icon name="folder"/></span>}<button tabIndex={-1} className={styles.nodeName} onClick={()=>choose(n)} title={n.name}>{n.name}</button>{n.favorite&&<span title="Favorite">★</span>}{active?.id===n.id&&<span title="Open map">●</span>}<button tabIndex={-1} aria-label={`Actions for ${n.name}`} onClick={()=>showActions(n)}>⋯</button>
     </div>)}
    </div><div className={styles.quick}><button onClick={()=>filter('trash')}>Trash</button><button onClick={()=>run('Refreshing campaign…',refreshCampaign)}>Refresh</button></div>
   </aside>
   <div className={styles.main}>
    {s.error&&<div role="alert" className={styles.error}>{s.error}<button onClick={()=>useCampaignStore.setState({error:''})}>Dismiss</button></div>}
    <section hidden={!s.browsing} className={styles.contents} data-campaign-ui aria-label="Map library">
     <div className={styles.title}><h2>{s.search?'Search results':s.filter==='all'?selected?.name||campaign.name:s.filter==='recent'?'Recent maps':s.filter==='favorites'?'Favorites':'Campaign Trash'}</h2><div><button aria-pressed={s.view==='list'} onClick={()=>{useCampaignStore.setState({view:'list'});persistNavigation()}}>List</button><button aria-pressed={s.view==='gallery'} onClick={()=>{useCampaignStore.setState({view:'gallery'});persistNavigation()}}>Gallery</button></div></div>
     {s.filter==='all'&&!s.search&&<div className={styles.quick}><button className="primary" onClick={()=>newMap(selected)}>New map</button><button onClick={()=>folder(selected)}>New folder</button></div>}
     {!contents.length&&<p>{s.search?'No matching maps or folders.':s.filter==='all'?'Your next map starts here. Add a map or organize this campaign with a folder.':s.filter==='trash'?'Trash is empty.':'No maps here yet.'}</p>}
     <div className={s.view==='gallery'?styles.gallery:styles.list}>{contents.map(n=><article key={n.id} className={styles.card} data-drop={drop?.id===n.id?drop.placement:undefined} draggable={!n.deletedAt&&!busy} onDragStart={e=>{setDrag(n.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData(dragType,n.id)}} onDragEnd={()=>{setDrag(null);setDrop(null)}} {...(!n.deletedAt?dnd(n):{})} onContextMenu={e=>{e.preventDefault();showActions(n)}}>
      <button className={styles.open} disabled={!!n.deletedAt} onClick={()=>choose(n)} aria-label={`${n.mapId?'Open map':'Open folder'} ${n.name}`}><span className={styles.preview} aria-hidden="true"><Icon name={n.mapId?'map':'folder'}/></span><span><strong>{n.name}</strong><small>{mapTypeLabel(n.mapType)} · {contextPath(n)}</small><small>{new Date(n.modifiedAt).toLocaleDateString()}</small></span></button>{n.favorite&&<span aria-label="Favorite">★</span>}<button aria-label={`Actions for ${n.name}`} onClick={()=>showActions(n)}>⋯</button>
     </article>)}</div>
    </section>
    <div hidden={s.browsing} className={styles.canvas}>{children}</div>
   </div>
  </div>
  {actions!==undefined&&<Modal title={item?`Actions — ${item.name}`:'Campaign actions'} onClose={()=>setActions(undefined)} busy={!!busy}>
   {item?.deletedAt?<><p>Restore this entry and descendants deleted with it. A missing or trashed parent restores at campaign root.</p><button onClick={()=>run('Restoring…',async()=>{await commandCampaign({op:'restore',id:item.id});setActions(undefined)})}>Restore</button></>:<>
    {item?.mapId?<><button className="primary" onClick={()=>{choose(item);setActions(undefined)}}>Open</button><button onClick={()=>run('Duplicating map…',async()=>{await preserveWorkingMap();await api(`/projects/${item.mapId}/duplicate`,'POST');await refreshCampaign();setActions(undefined)})}>Duplicate</button><button onClick={()=>run('Updating favorite…',async()=>{await commandCampaign({op:'favorite',id:item.id,favorite:!item.favorite});setActions(undefined)})}>{item.favorite?'Unfavorite':'Favorite'}</button><button onClick={()=>run('Exporting map…',async()=>{await preserveWorkingMap();await downloadResponse(`/projects/${item.mapId}/export`,downloadName(item.name))})}>Export map only</button><p className="muted">Map exports contain one map and its assets, not campaign folders. Use Storage → Back up all data to preserve complete campaigns.</p></>:<><button onClick={()=>newMap(item)}>New map</button><button onClick={()=>folder(item)}>New folder</button></>}
    <button onClick={()=>rename(item)}>Rename</button>
    {item&&<><label>Move to folder<select aria-label="Move to folder" value={destination} onChange={e=>setDestination(e.target.value)}><option value="">{campaign.name} (root)</option>{nodes.filter(n=>!n.mapId&&!n.deletedAt&&!nodePath(n.id,index.byId).some(p=>p.id===item.id)).map(n=><option key={n.id} value={n.id}>{nodePath(n.id,index.byId).map(p=>p.name).join(' › ')}</option>)}</select></label><button onClick={()=>run('Moving entry…',async()=>{await commandCampaign({op:'move',id:item.id,parentId:destination||null});setActions(undefined)})}>Move</button><button disabled={(index.children.get(item.parentId)||[]).filter(n=>!n.deletedAt)[0]?.id===item.id} onClick={()=>reorder(item,-1)}>Move up</button><button disabled={(index.children.get(item.parentId)||[]).filter(n=>!n.deletedAt).at(-1)?.id===item.id} onClick={()=>reorder(item,1)}>Move down</button></>}
    <button className="destructive" onClick={()=>trash(item)}>Move to Trash</button>
   </>}<button onClick={()=>setActions(undefined)}>Close</button>
  </Modal>}
 </div>
}
