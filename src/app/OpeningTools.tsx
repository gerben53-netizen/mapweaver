import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { isOpening } from '../domain/openings'
import { Modal } from './Modal'
import styles from './OpeningTools.module.css'

export function OpeningTools(){
  const tool=useEditorStore(s=>s.activeTool),kind=useEditorStore(s=>s.openingKind),width=useEditorStore(s=>s.openingWidth)
  if(tool!=='opening')return null
  return <div className={styles.tools}><label>Opening<select aria-label="Opening type" value={kind} onChange={e=>useEditorStore.setState({openingKind:e.target.value as typeof kind})}><option value="door">Door</option><option value="passage">Open passage</option><option value="window">Window</option></select></label><label>Width (px)<input aria-label="Opening width" type="number" min="4" max="4096" defaultValue={width} onBlur={e=>{const n=Number(e.target.value);if(n<4||n>4096||!Number.isFinite(n)){e.target.value=String(width);useEditorStore.setState({message:'Opening width must be 4–4,096 map pixels.'})}}} onChange={e=>{const n=Number(e.target.value);if(n>=4&&n<=4096)useEditorStore.setState({openingWidth:n})}}/></label><span>Click a wall · Alt bypasses grid · Esc cancels</span><button onClick={()=>useEditorStore.setState({activeTool:'select'})}>Done</button></div>
}
export function OpeningDeleteDialog(){
  const ids=useEditorStore(s=>s.deleteOpeningIds),objects=useProjectStore(s=>s.objects)
  if(!ids)return null
  const children=objects.filter(o=>ids.includes(o.id)&&(isOpening(o)||o.kind==='label')),close=()=>useEditorStore.setState({deleteOpeningIds:null})
  return <Modal title="Delete objects and linked children?" onClose={close}><p>This deletes {ids.length} objects, including these {children.length} linked children. Undo restores the complete assembly.</p><ul>{children.map(o=><li key={o.id}>{o.name||o.kind}</li>)}</ul><button onClick={()=>useProjectStore.getState().deleteSelection(ids)}>Delete objects and children</button><button data-autofocus onClick={close}>Cancel</button></Modal>
}
