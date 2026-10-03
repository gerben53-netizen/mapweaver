import { useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { canGroupSelection } from './selectionContext'
import styles from './Inspector.module.css'
export function GroupControls() {
 const project=useProjectStore(),ids=useEditorStore(s=>s.selectedObjectIds),editing=useEditorStore(s=>s.editingGroupId)
 const group=project.objectGroups.find(g=>g.objectIds.some(id=>ids.includes(id)))
 if(ids.length<2)return editing?<p>Editing group <button onClick={()=>project.editGroup(null)}>Exit group</button></p>:null
 if(!group&&!canGroupSelection(project,ids))return null
 return <section aria-label="Object group"><h3>Group</h3>
  {canGroupSelection(project,ids)&&<button onClick={project.groupSelected}>Group selection</button>}
  {group&&<><button onClick={project.ungroupSelected}>Ungroup - keep objects</button><button onClick={()=>project.editGroup(editing?null:group.id)}>{editing?'Exit group':'Enter group'}</button><label>Group name<input key={group.id+group.name} defaultValue={group.name} maxLength={120} onBlur={e=>{if(e.target.value!==group.name)project.changeGroup(group.id,{name:e.target.value})}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/></label><button onClick={()=>project.changeGroup(group.id,{locked:true})}>Lock group</button><button onClick={()=>project.changeGroup(group.id,{visible:false})}>Hide group</button></>}
 </section>
}
export function SelectionTransform() {
 const [scale,setScale]=useState('100'),[rotation,setRotation]=useState('0'),[error,setError]=useState(''),project=useProjectStore.getState()
 return <section aria-label="Transform selection"><form onSubmit={e=>{e.preventDefault();try{project.transformSelected({scale:Number(scale)/100,rotation:Number(rotation)});setScale('100');setRotation('0');setError('')}catch(e){setError((e as Error).message)}}}>
  <div className={styles.pair}><label>Scale (%)<input aria-label="Selection scale (%)" type="number" required min="0.01" step="any" value={scale} onChange={e=>setScale(e.target.value)}/></label>
  <label>Rotate (degrees)<input aria-label="Selection rotation" type="number" required step="any" value={rotation} onChange={e=>setRotation(e.target.value)}/></label></div><button title="Apply scale and rotation together as one undo action">Apply transform</button>
  <button type="button" aria-label="Flip selection horizontally" title="Flip horizontally" onClick={()=>project.transformSelected({flipX:true})}>↔ Flip H</button><button type="button" aria-label="Flip selection vertically" title="Flip vertically" onClick={()=>project.transformSelected({flipY:true})}>↕ Flip V</button>
 </form>{error&&<p role="alert">{error}</p>}</section>
}
