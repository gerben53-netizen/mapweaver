import { TexturePaintLayerControls } from './TextureBrushTools'
import { TerrainPaintLayerControls } from './TerrainBrushTools'
import { useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { flatLayerTree } from '../domain/grouping'
import { effectiveLayers } from '../domain/projectView'
import { finishObjectGesture } from '../canvas/interaction'
import styles from './LayersPanel.module.css'
import { Modal } from './Modal'
export function LayerTreePanel() {
  const layers=useProjectStore(s=>s.layers),treeValue=useProjectStore(s=>s.layerTree)
  const active=useEditorStore(s=>s.activeLayerId),collapsed=useEditorStore(s=>s.collapsedLayers),solo=useEditorStore(s=>s.soloLayerId)
  const [rename,setRename]=useState<string|null>(null)
  const [deleting,setDeleting]=useState<string|null>(null)
  const tree=treeValue||flatLayerTree(layers),groups=new Map(tree.groups.map(g=>[g.id,g])),byId=new Map(layers.map(l=>[l.id,l]))
  const effective=new Map(effectiveLayers({layers,objects:[],layerTree:tree},solo).map(l=>[l.id,l]))
  const project=useProjectStore.getState()
  const run=(action:()=>void)=>{finishObjectGesture();useEditorStore.setState({layersUsedAt:Date.now()});action()}
  const toggle=(id:string)=>useEditorStore.setState({collapsedLayers:collapsed.includes(id)?collapsed.filter(key=>key!==id):[...collapsed,id]})
  const rows:{id:string;depth:number;parent:string|null}[]=[]
  const visit=(id:string,depth:number,parent:string|null)=>{rows.push({id,depth,parent});if(!collapsed.includes(id))groups.get(id)?.children.forEach(child=>visit(child,depth+1,id))}
  tree.roots.forEach(id=>visit(id,0,null))
  function affected(id:string):{layers:number;objects:number}{const group=groups.get(id);if(!group)return{layers:1,objects:byId.get(id)?.objectIds.length||0};return group.children.map(affected).reduce((a,b)=>({layers:a.layers+b.layers,objects:a.objects+b.objects}),{layers:0,objects:0})}
  return <section className={styles.layers} aria-label="Layers"><div className={styles.heading}><span>Layers <small>{layers.length}</small></span><button onClick={()=>run(project.addLayer)} aria-label="Add layer">+ Layer</button><button onClick={()=>run(project.addLayerGroup)} aria-label="Add layer group">+ Group</button></div>
    <TerrainPaintLayerControls/><TexturePaintLayerControls/><div role="tree" aria-label="Layer tree">{rows.map(({id,depth,parent})=>{
      const group=groups.get(id),item=group||byId.get(id)!,siblings=parent?groups.get(parent)!.children:tree.roots,index=siblings.indexOf(id)
      const change=(patch:{name?:string;visible?:boolean;locked?:boolean})=>group?project.changeLayerGroup(id,patch):project.changeLayer(id,patch)
      const status=effective.get(id)
      return <div key={id} role="treeitem" aria-level={depth+1} aria-expanded={group?!collapsed.includes(id):undefined} aria-selected={!group&&active===id} tabIndex={0} style={{paddingLeft:depth*10,borderBottom:'1px solid var(--color-border)',paddingBlock:6}}
        onKeyDown={event=>{if(event.target!==event.currentTarget)return;const key=event.key;if(key==='ArrowDown'||key==='ArrowUp'){event.preventDefault();event.stopPropagation();const all=Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLElement>('[role=treeitem]'));all[Math.max(0,Math.min(all.length-1,all.indexOf(event.currentTarget)+(key==='ArrowDown'?1:-1)))]?.focus()}if(group&&(key==='ArrowLeft'||key==='ArrowRight')){event.preventDefault();event.stopPropagation();if((key==='ArrowLeft')!==collapsed.includes(id))toggle(id)}if(key==='Enter'){event.preventDefault();event.stopPropagation();if(group)toggle(id);else useEditorStore.setState({activeLayerId:id})}}}>
        <div className={styles.row}>
          {group&&<button aria-label={`${collapsed.includes(id)?'Expand':'Collapse'} ${item.name}`} onClick={()=>toggle(id)}>{collapsed.includes(id)?'▸':'▾'}</button>}
          <button aria-label={`${item.visible?'Hide':'Show'} ${item.name}`} title={`${item.visible?'Hide':'Show'} ${item.name}`} onClick={()=>run(()=>change({visible:!item.visible}))}>{item.visible?'◉':'○'}</button>
          <button aria-label={`${item.locked?'Unlock':'Lock'} ${item.name}`} onClick={()=>run(()=>change({locked:!item.locked}))}>{item.locked?'Locked':'Lock'}</button>
          {rename===id?<input autoFocus aria-label={`Rename ${item.name}`} defaultValue={item.name} maxLength={120} onBlur={event=>{run(()=>change({name:event.target.value}));setRename(null)}} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();if(event.key==='Escape'){event.currentTarget.value=item.name;event.currentTarget.blur()}}}/>:<button className={styles.activate} onDoubleClick={()=>setRename(id)} title={item.name} aria-label={group?`Layer group ${item.name}`:`Activate ${item.name}`} onClick={()=>group?toggle(id):run(()=>useEditorStore.setState({activeLayerId:id}))}>{item.name}</button>}
          <details name="layer-actions" className={styles.more}><summary aria-label={`More actions for ${item.name}`}>⋯</summary><div className={styles.menu}>
            <button onClick={event=>{event.currentTarget.closest("details")?.removeAttribute("open");setRename(id)}}>Rename</button><button onClick={()=>run(()=>project.soloLayer(solo===id?null:id))}>{solo===id?'End solo':'Solo'}</button>
            <button onClick={()=>run(()=>project.duplicateTreeEntry(id))}>Duplicate {group?'group':'layer'}</button>
            <label>Move into<select aria-label={`Move ${item.name} into`} value={parent||''} onChange={event=>run(()=>project.moveTreeEntry(id,event.target.value||null))}><option value="">Root</option>{tree.groups.filter(g=>g.id!==id).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
            <button className="destructive" onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');setDeleting(id)}}>Delete {group?'group and layers':'layer'}</button>
          </div></details>
        </div>
        <div className={styles.order}><span>{group?'Group':active===id?'Active':''}{!item.visible||status?.visible===false?' · Hidden':''}{item.locked||status?.locked?' · Locked':''}{solo===id?' · Solo':''}</span><button aria-label={`Move ${item.name} up`} disabled={index===0} onClick={()=>run(()=>project.reorderTreeEntry(id,-1))}>↑</button><button aria-label={`Move ${item.name} down`} disabled={index===siblings.length-1} onClick={()=>run(()=>project.reorderTreeEntry(id,1))}>↓</button></div>
      </div>
    })}</div><p className="muted">Top items appear in front. Group flags are inherited; child flags are preserved.</p>{solo&&<button onClick={()=>project.soloLayer(null)}>End solo</button>}
    {deleting && <Modal title="Delete layer entry" onClose={()=>setDeleting(null)}><p>Delete “{groups.get(deleting)?.name || byId.get(deleting)?.name}”, {affected(deleting).layers} layer(s) and {affected(deleting).objects} object(s)? Undo restores them.</p><button data-autofocus onClick={()=>setDeleting(null)}>Cancel</button><button className="destructive" onClick={()=>{run(()=>project.deleteTreeEntry(deleting,true));setDeleting(null)}}>Delete entry and objects</button></Modal>}
  </section>
}
