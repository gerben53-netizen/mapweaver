import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { createSceneContentSelector, filterSceneTree, sceneIcon, sceneTree, visibleSceneRows } from '../domain/sceneTree'
import type { SceneFilter, SceneNode } from '../domain/sceneTree'
import type { SceneDestination } from '../domain/sceneMove'
import { editableProjectIds } from '../domain/projectView'
import { useObjectBrowserData } from './useObjectBrowserData'
import { finishObjectGesture } from '../canvas/interaction'
import { Icon } from './Icon'
import { SceneThumbnail } from './SceneThumbnail'
import { LayerTreePanel } from './LayerTreePanel'
import { Modal } from './Modal'
import styles from './SceneOutliner.module.css'
const dragType='application/x-mapweaver-scene-object'
const types=['stamp','area','ceiling','wall','door','window','label','path','river','road','border','place','scatter','legend','compass','title','scaleBar','infoPanel'] as const
const typeNames=['Stamps','Areas / Floors','Ceilings','Walls','Doors','Windows','Text','Paths','Rivers','Roads','Borders','Markers','Scatter','Legends','Compasses','Titles / Cartouches','Scale bars','Notes']
export function SceneOutliner() {
  const selector=useMemo(()=>createSceneContentSelector(),[])
  const {names}=useObjectBrowserData(),state=project(selector),active=editor(s=>s.activeLayerId),selected=editor(s=>s.selectedObjectIds),solo=editor(s=>s.soloLayerId)
  const collapsedLayers=editor(s=>s.collapsedLayers),collapsedGroups=editor(s=>s.collapsedGroups)
  const [query,setQuery]=useState(''),[scope,setScope]=useState<SceneFilter['scope']>('all'),[type,setType]=useState<SceneFilter['type']>('all')
  const [focused,setFocused]=useState(''),[renaming,setRenaming]=useState<string|null>(null),[renameValue,setRenameValue]=useState('')
  const [menu,setMenu]=useState<string|null>(null),[advanced,setAdvanced]=useState(false),[moveTarget,setMoveTarget]=useState('')
  const [drag,setDrag]=useState<string|null>(null),[drop,setDrop]=useState<{id:string;edge:'before'|'after'|'into'}|null>(null),[pendingReveal,setPendingReveal]=useState<string|null>(null)
  const viewport=useRef<HTMLDivElement>(null),menuRef=useRef<HTMLDivElement>(null),rowRefs=useRef(new Map<string,HTMLDivElement>())
  const [windowRange,setWindowRange]=useState({top:0,height:600})
  useEffect(()=>{const el=viewport.current;if(!el)return;const observer=new ResizeObserver(()=>setWindowRange(s=>({...s,height:el.clientHeight||600})));observer.observe(el);return()=>observer.disconnect()},[])
  const tree=useMemo(()=>sceneTree(state,names,solo),[state,names,solo])
  const all=visibleSceneRows(tree,new Set()),byId=new Map(all.map(n=>[n.id,n]))
  const filtering=!!query.trim()||type!=='all'||scope==='visible'
  const filtered=useMemo(()=>filterSceneTree(tree,{query,type,scope,activeLayerId:active}),[tree,query,type,scope,active])
  const collapsed=useMemo(()=>new Set([...collapsedLayers,...collapsedGroups]),[collapsedLayers,collapsedGroups])
  const rows=useMemo(()=>visibleSceneRows(filtered,collapsed,filtering),[filtered,collapsed,filtering])
  const virtual=rows.length>250
  const start=virtual?Math.max(0,Math.min(rows.length-1,Math.floor(windowRange.top/26))-8):0
  const end=virtual?Math.min(rows.length,start+Math.ceil(windowRange.height/26)+17):rows.length
  const selectedSet=new Set(selected),selectedRow=(n:SceneNode)=>n.kind==='layer'?active===n.id:n.kind==='group'?n.children.length>0&&n.children.every(c=>selectedSet.has(c.id)):selectedSet.has(n.id)
  const rendered=rows.slice(start,end)
  const focusId=rendered.some(n=>n.id===focused)?focused:rendered.find(n=>selectedSet.has(n.id))?.id||rendered[0]?.id
  const focus=useCallback((id:string)=>{setFocused(id);const index=rows.findIndex(n=>n.id===id),el=viewport.current;if(virtual&&el&&index>=0){const top=index*26;if(top<el.scrollTop)el.scrollTop=top;else if(top+26>el.scrollTop+el.clientHeight)el.scrollTop=top+26-el.clientHeight;setWindowRange(s=>({...s,top:el.scrollTop}))}requestAnimationFrame(()=>{const row=rowRefs.current.get(id);row?.focus({preventScroll:true});row?.scrollIntoView({block:'nearest'})})},[rows,virtual])
  const toggle=(n:SceneNode)=>{const key=n.kind==='layer'?'collapsedLayers':'collapsedGroups',ids=editor.getState()[key];editor.setState({[key]:ids.includes(n.id)?ids.filter(id=>id!==n.id):[...ids,n.id]})}
  const select=(n:SceneNode,toggleSelection=false)=>{
    finishObjectGesture();setFocused(n.id)
    if(n.kind==='layer'){editor.setState({activeLayerId:n.id});return true}
    if(!n.visible||n.locked){editor.setState({message:'Show and unlock this item and its parents before selecting.'});return false}
    editor.setState({activeTool:'select'})
    if(n.kind==='group'){
      const ids=n.children.map(c=>c.id),allowed=editableProjectIds(project.getState(),solo)
      if(ids.some(id=>!allowed.has(id)))return false
      project.getState().editGroup(null)
      editor.setState(s=>({selectedObjectIds:toggleSelection?ids.every(id=>s.selectedObjectIds.includes(id))?s.selectedObjectIds.filter(id=>!ids.includes(id)):[...new Set([...s.selectedObjectIds,...ids])]:ids}))
    }else{project.getState().editGroup(n.depth===2?n.parentId:null);editor.getState().select(n.id,toggleSelection)}
    return true
  }
  const reveal=()=>{
    const n=all.find(n=>n.kind==='object'&&selectedSet.has(n.id));if(!n)return
    setQuery('');setType('all');setScope('all')
    editor.setState({collapsedLayers:collapsedLayers.filter(id=>id!==n.layerId),collapsedGroups:collapsedGroups.filter(id=>id!==n.parentId)})
    setPendingReveal(n.id)
  }
  useEffect(()=>{if(!pendingReveal||!rows.some(n=>n.id===pendingReveal))return;const frame=requestAnimationFrame(()=>{focus(pendingReveal);setPendingReveal(null)});return()=>cancelAnimationFrame(frame)},[pendingReveal,rows,focus])
  useEffect(()=>{if(menu)menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()},[menu])
  const change=(n:SceneNode,patch:{name?:string;visible?:boolean;locked?:boolean})=>{finishObjectGesture();const p=project.getState();if(n.kind==='layer')p.changeLayer(n.id,patch);else if(n.kind==='group')p.changeGroup(n.id,patch);else p.changeObject(n.id,patch)}
  const rename=(n:SceneNode)=>{setMenu(null);setRenaming(n.id);setRenameValue(n.name)}
  const commitRename=(n:SceneNode)=>{if(renameValue.trim()&&renameValue!==n.name)change(n,{name:renameValue});setRenaming(null);focus(n.id)}
  const destination=(n:SceneNode,edge:'before'|'after'|'into'):SceneDestination=>({layerId:n.layerId,groupId:n.kind==='group'?n.id:n.kind==='object'&&n.depth===2?n.parentId:null,...(n.kind==='object'?{anchorId:n.id,edge:edge==='before'?'before':'after'}:{})})
  const move=(id:string,target:SceneDestination)=>{project.getState().moveSceneObjects([id],target);editor.setState(s=>({collapsedLayers:s.collapsedLayers.filter(i=>i!==target.layerId),collapsedGroups:s.collapsedGroups.filter(i=>i!==target.groupId)}));setMenu(null)}
  const moveStep=(n:SceneNode,direction:-1|1)=>{
    if(n.kind==='layer'){project.getState().reorderTreeEntry(n.id,direction);return}
    const siblings=all.filter(row=>row.parentId===n.parentId),index=siblings.findIndex(row=>row.id===n.id),other=siblings[index+direction]
    if(n.kind==='object'&&other?.kind==='object')move(n.id,destination(other,direction<0?'before':'after'))
  }
  const menuNode=menu?byId.get(menu):undefined
  return <section className={styles.panel} aria-label="Scene outliner" data-scene-ui>
    <header className={styles.header}><strong>Scene</strong><span>{state.objects.length} objects</span><button title="Add layer" aria-label="Add layer" onClick={()=>project.getState().addLayer()}><Icon name="plus"/></button><button title="Layer organization and map paint" aria-label="Layer organization and map paint" onClick={()=>setAdvanced(true)}><Icon name="more"/></button></header>
    <div className={styles.filters}><input type="search" aria-label="Search scene" placeholder="Search scene…" value={query} onChange={e=>setQuery(e.target.value)}/><div><select aria-label="Scene scope" value={scope} onChange={e=>setScope(e.target.value as SceneFilter['scope'])}><option value="all">All layers</option><option value="visible">Visible layers</option><option value="active">Active layer</option></select><select aria-label="Scene type" value={type} onChange={e=>setType(e.target.value as SceneFilter['type'])}><option value="all">All types</option>{types.map((t,i)=><option key={t} value={t}>{typeNames[i]}</option>)}</select></div><div><button onClick={()=>{setQuery('');setType('all');setScope('all');editor.setState({collapsedLayers:tree.map(n=>n.id),collapsedGroups:(state.objectGroups||[]).map(g=>g.id)})}}>Collapse all</button><button disabled={!selected.length} onClick={reveal}>Reveal selected</button><span aria-live="polite">{selected.length?`${selected.length} selected`:''}</span></div></div>
    <div ref={viewport} role="tree" aria-label="Scene tree" aria-multiselectable="true" className={styles.tree} onScroll={e=>{const top=e.currentTarget.scrollTop;setWindowRange(s=>({...s,top}))}} onDragOver={e=>{if(drag){const r=e.currentTarget.getBoundingClientRect();if(e.clientY<r.top+32)e.currentTarget.scrollTop-=20;if(e.clientY>r.bottom-32)e.currentTarget.scrollTop+=20}}}>
      {virtual&&<div role="presentation" style={{height:start*26}}/>}
      {rows.slice(start,end).map((n,offset)=>{const index=start+offset;return <div key={n.id} ref={el=>{if(el)rowRefs.current.set(n.id,el);else rowRefs.current.delete(n.id)}} role="treeitem" aria-label={n.name} aria-level={n.depth+1} aria-selected={selectedRow(n)} aria-expanded={n.kind==='object'?undefined:filtering||!collapsed.has(n.id)} tabIndex={focusId===n.id?0:-1} data-scene-id={n.id} data-kind={n.kind} data-drop={drop?.id===n.id?drop.edge:undefined}
        className={`${styles.row} ${styles[n.kind]} ${selectedRow(n)?styles.selected:''} ${!n.visible?styles.hidden:''} ${n.id===pendingReveal?styles.revealed:''}`} style={{paddingLeft:4+n.depth*14}} title={`${n.name} · ${n.type}${n.context?` · ${n.context}`:''}`} draggable={n.kind==='object'&&n.visible&&!n.locked&&renaming!==n.id}
        onFocus={e=>{if(e.target===e.currentTarget)setFocused(n.id)}} onClick={e=>select(n,e.ctrlKey||e.metaKey||e.shiftKey)} onDoubleClick={()=>rename(n)} onContextMenu={e=>{e.preventDefault();setFocused(n.id);setMenu(n.id);setMoveTarget(n.layerId)}}
        onKeyDown={e=>{if(e.target!==e.currentTarget)return;const key=e.key;if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End','Enter',' ','F2','Escape'].includes(key)){e.preventDefault();e.stopPropagation()}
          if(key==='ArrowDown'||key==='ArrowUp')focus(rows[Math.max(0,Math.min(rows.length-1,index+(key==='ArrowDown'?1:-1)))].id)
          if(key==='Home'||key==='End')focus(rows[key==='Home'?0:rows.length-1].id)
          if(key==='ArrowRight'&&n.kind!=='object'){if(collapsed.has(n.id)&&!filtering)toggle(n);else if(rows[index+1]?.parentId===n.id)focus(rows[index+1].id)}
          if(key==='ArrowLeft'){if(n.kind!=='object'&&!collapsed.has(n.id)&&!filtering)toggle(n);else if(n.parentId)focus(n.parentId)}
          if(key==='Enter'||key===' ')select(n,e.ctrlKey||e.metaKey||e.shiftKey)
          if(key==='F2')rename(n)
          if(key==='F10'&&e.shiftKey){e.preventDefault();setMenu(n.id);setMoveTarget(n.layerId)}
          if(key==='Escape')setMenu(null)
        }} onDragStart={e=>{if(n.kind!=='object')return;e.dataTransfer.setData(dragType,n.id);e.dataTransfer.effectAllowed='move';setDrag(n.id)}} onDragEnd={()=>{setDrag(null);setDrop(null)}}
        onDragOver={e=>{if(!drag||n.id===drag||!n.visible||n.locked)return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';const rect=e.currentTarget.getBoundingClientRect();setDrop({id:n.id,edge:n.kind==='object'?(e.clientY<rect.top+rect.height/2?'before':'after'):'into'});const view=viewport.current;if(view){const r=view.getBoundingClientRect();if(e.clientY<r.top+32)view.scrollTop-=20;else if(e.clientY>r.bottom-32)view.scrollTop+=20}}}
        onDrop={e=>{if(!drag||!drop||drop.id!==n.id||e.dataTransfer.getData(dragType)!==drag)return;e.preventDefault();e.stopPropagation();move(drag,destination(n,drop.edge));setDrag(null);setDrop(null)}}>
        {n.kind!=='object'?<button tabIndex={-1} className={styles.chevron} aria-label={`${!filtering&&collapsed.has(n.id)?'Expand':'Collapse'} ${n.name}`} disabled={filtering} onDoubleClick={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();toggle(n)}}>{!filtering&&collapsed.has(n.id)?'▸':'▾'}</button>:<span className={styles.chevron}/>}
        {n.type==='stamp'&&n.assetId?<SceneThumbnail id={n.assetId}/>:<Icon name={sceneIcon(n.type)}/>}
        {renaming===n.id?<input aria-label={`Rename ${n.name}`} autoFocus value={renameValue} maxLength={120} onChange={e=>setRenameValue(e.target.value)} onClick={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()} onBlur={()=>commitRename(n)} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter')commitRename(n);if(e.key==='Escape'){setRenaming(null);focus(n.id)}}}/>:<span className={styles.name}>{n.name}</span>}
        {n.kind==='layer'&&active===n.id&&<span className={styles.active} title="Active placement layer" aria-label="Active layer">●</span>}
        <button className={n.inheritedHidden?styles.inherited:''} aria-label={`${n.ownVisible?'Hide':'Show'} ${n.name}`} title={n.inheritedHidden?'Hidden by parent layer/group or solo':n.ownVisible?'Hide':'Show'} disabled={n.inheritedHidden} onDoubleClick={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();change(n,{visible:!n.ownVisible})}}><Icon name={n.visible?'eye':'hidden'}/></button>
        <button className={n.inheritedLocked?styles.inherited:''} aria-label={`${n.ownLocked?'Unlock':'Lock'} ${n.name}`} title={n.inheritedLocked?'Locked by parent layer/group':n.ownLocked?'Unlock':'Lock'} disabled={n.inheritedLocked} onDoubleClick={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();change(n,{locked:!n.ownLocked})}}><Icon name={n.locked?'lock':'unlock'}/></button>
        <button aria-label={`Actions for ${n.name}`} title="Actions" onDoubleClick={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setMenu(n.id);setMoveTarget(n.layerId)}}><Icon name="more"/></button>
      </div>})}
      {virtual&&<div role="presentation" style={{height:(rows.length-end)*26}}/>}
      {!rows.length&&<p className={styles.empty}>No scene items match these filters.</p>}
    </div>
    {menuNode&&<><button className={styles.dismiss} aria-label="Close scene actions" onClick={()=>setMenu(null)}/><div ref={menuRef} className={styles.menu} role="dialog" aria-label={`Scene actions for ${menuNode.name}`} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){setMenu(null);focus(menuNode.id)}}}>
      <strong>{menuNode.name}</strong><button onClick={()=>rename(menuNode)}>Rename (F2)</button>
      {menuNode.kind!=='layer'&&<button onClick={()=>{select(menuNode);editor.setState({inspector:'properties'});setMenu(null)}}>Properties</button>}
      {menuNode.kind==='layer'?<><button onClick={()=>{project.getState().soloLayer(solo===menuNode.id?null:menuNode.id);setMenu(null)}}>{solo===menuNode.id?'End solo':'Solo'}</button><button onClick={()=>{project.getState().duplicateTreeEntry(menuNode.id);setMenu(null)}}>Duplicate layer</button><button onClick={()=>{if(window.confirm(`Delete layer “${menuNode.name}” and its objects? Undo restores them.`))project.getState().deleteTreeEntry(menuNode.id,true);setMenu(null)}}>Delete layer</button></>:<button onClick={()=>{if(select(menuNode))project.getState().duplicate();setMenu(null)}}>Duplicate</button>}
      {menuNode.kind!=='group'&&<><button onClick={()=>moveStep(menuNode,-1)}>Move up / forward</button><button onClick={()=>moveStep(menuNode,1)}>Move down / backward</button></>}
      {menuNode.kind==='object'&&<><label>Move to layer<select aria-label="Scene destination layer" value={moveTarget||menuNode.layerId} onChange={e=>setMoveTarget(e.target.value)}>{tree.map(l=><option key={l.id} value={l.id} disabled={l.locked||!l.visible}>{l.name}</option>)}</select></label><button onClick={()=>move(menuNode.id,{layerId:moveTarget||menuNode.layerId})}>Move to layer root</button><label>Add to group<select aria-label="Scene destination group" value="" onChange={e=>{const g=state.objectGroups?.find(g=>g.id===e.target.value);if(g)move(menuNode.id,{layerId:g.layerId,groupId:g.id})}}><option value="">Choose group…</option>{all.filter(n=>n.kind==='group'&&n.visible&&!n.locked).map(g=><option key={g.id} value={g.id}>{g.context} / {g.name}</option>)}</select></label></>}
      {menuNode.kind==='group'&&<button onClick={()=>{if(select(menuNode))project.getState().ungroupSelected();setMenu(null)}}>Ungroup</button>}
      {menuNode.kind==='object'&&selected.length>1&&<button onClick={()=>{project.getState().groupSelected();setMenu(null)}}>Group selection</button>}
      {menuNode.kind!=='layer'&&<button onClick={()=>{if(select(menuNode))project.getState().deleteSelection();setMenu(null)}}>Delete selection</button>}
      <button onClick={()=>{setMenu(null);focus(menuNode.id)}}>Close</button>
    </div></>}
    {advanced&&<Modal title="Layer organization and map paint" onClose={()=>setAdvanced(false)}><p>Layer groups retain their ordering and inherited flags. Scene displays their layers at the top level.</p><LayerTreePanel/></Modal>}
    {/* Paint layers are map-wide, not object parents; existing controls stay in the organization dialog. */}
  </section>
}
