import { effectiveLayers } from '../domain/projectView'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { reorderObjects } from '../domain/layers'
import type { OrderAction } from '../domain/layers'
import { finishObjectGesture } from '../canvas/interaction'
import styles from './LayersPanel.module.css'
/** Selection arrangement only; layer management remains in LayerTreePanel. */
export function ObjectActions() {
 const ids=useEditorStore(s=>s.selectedObjectIds),state=useProjectStore(),solo=useEditorStore(s=>s.soloLayerId),layers=effectiveLayers(state,solo)
 if(!ids.length)return null
 const run=(action:()=>void)=>{finishObjectGesture();action()}
 const canOrder=(action:OrderAction)=>layers.some(l=>l.visible&&!l.locked&&reorderObjects(l.objectIds,ids,action).some((id,i)=>id!==l.objectIds[i]))
 const current=layers.find(l=>ids.every(id=>l.objectIds.includes(id)))
 return <section className={styles.actions} aria-label="Selection arrangement">
  <h3>Layer</h3><label>Selection layer<select aria-label="Move selection to layer" value={current?.id||''} onChange={e=>run(()=>state.moveSelection(e.target.value))}><option value="" disabled>Multiple layers</option>{layers.filter(l=>l.visible&&!l.locked||l.id===current?.id).map(l=><option key={l.id} value={l.id} disabled={!l.visible||l.locked}>{l.name}</option>)}</select></label>
  <h3>Order</h3><div className={styles.buttons}>{([['backward','Send backward'],['forward','Bring forward'],['back','Send to back'],['front','Bring to front']] as const).map(([action,label])=><button key={action} disabled={!canOrder(action)} onClick={()=>run(()=>state.orderSelection(action))}>{label}</button>)}</div>
  {ids.length>1&&<><h3>Align</h3><p className="muted">Relative to the first selected object.</p><div className={styles.buttons}>{(['left','center-x','right','top','center-y','bottom'] as const).map((action,i)=><button key={action} onClick={()=>run(()=>state.arrange(action))}>{['Left','Center','Right','Top','Middle','Bottom'][i]}</button>)}</div>
   {ids.length>2&&<><h3>Distribute</h3><div className={styles.buttons}><button onClick={()=>run(()=>state.arrange('distribute-x'))}>Horizontal spacing</button><button onClick={()=>run(()=>state.arrange('distribute-y'))}>Vertical spacing</button></div></>}
   <label>Match first object<select aria-label="Match selection size" value="" onChange={e=>run(()=>state.arrange(e.target.value as 'same-width'|'same-height'|'same-size'))}><option value="" disabled>Choose size</option><option value="same-width">Width (proportional)</option><option value="same-height">Height (proportional)</option><option value="same-size">Both dimensions</option></select></label>
  </>}
  <div className={styles.buttons}><button onClick={()=>run(()=>state.arrange('map-x'))}>Center on map horizontally</button><button onClick={()=>run(()=>state.arrange('map-y'))}>Center on map vertically</button></div>
 </section>
}
export { LayerTreePanel as LayersPanel } from './LayerTreePanel'
