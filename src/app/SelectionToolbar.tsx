import { materialTargets, openMaterialBrowser } from '../store/materialApplication'
import { Icon, type IconName } from './Icon'
import styles from './SelectionToolbar.module.css'
import { canGroupSelection } from './selectionContext'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { finishObjectGesture } from '../canvas/interaction'
import { activeToolName } from './toolIntent'
export function SelectionToolbar() {
 useProjectStore(s=>s.objects)
 useProjectStore(s=>s.layerTree)
 useEditorStore(s=>s.soloLayerId)
 const compatible = materialTargets().length
 const role=useEditorStore(s=>s.areaRole),routeKind=useEditorStore(s=>s.routeStyle.route.kind)
 const tool=useEditorStore(s=>s.activeTool),ids=useEditorStore(s=>s.selectedObjectIds),groups=useProjectStore(s=>s.objectGroups),layers=useProjectStore(s=>s.layers)
 const icons:Record<string,IconName>={ceiling:'ceiling',textureBrush:'brush',select:'select',landBrush:'landmass',terrainBrush:'brush',waterDepth:'waterDepth',path:'path',route:'path',area:role==='terrain-region'?'terrain':'area',place:'place',placeStamp:'stamp',patternFill:'pattern',scatter:'scatter',measure:'measure',wall:'wall',opening:'opening',label:'label',legend:'legend',compass:'compass'}
 const project=useProjectStore.getState(),run=(action:()=>void)=>{finishObjectGesture();action()}
 return <div role="group" aria-label="Tool context" className={styles.context}><strong><Icon name={icons[tool]||'compass'}/>{activeToolName(tool,role,routeKind)}</strong>{tool==='select'&&<button disabled={!compatible} title={compatible ? `Apply material to ${compatible} editable Areas; other objects are skipped` : 'Select an Area or Floor first'} onClick={()=>openMaterialBrowser()}>Apply Material</button>}{tool==='select'&&!!ids.length&&<><span>{ids.length} selected</span><button title="Duplicate (Ctrl/Cmd+D)" onClick={()=>run(project.duplicate)}>Duplicate</button><button className="destructive" title="Delete selection (Delete / Backspace)" onClick={()=>run(project.deleteSelection)}>Delete</button>{groups.some(g=>g.objectIds.some(id=>ids.includes(id)))?<button title="Ungroup (Ctrl/Cmd+Shift+G)" onClick={()=>run(project.ungroupSelected)}>Ungroup</button>:canGroupSelection({...project,layers},ids)&&<button title="Group (Ctrl/Cmd+G)" onClick={()=>run(project.groupSelected)}>Group</button>}<button onClick={()=>useEditorStore.setState({inspector:'properties',inspectorCollapsed:false,focusMode:false})}>Properties</button></>}</div>
}
