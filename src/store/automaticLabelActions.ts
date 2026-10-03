import { DOCUMENT_LIMITS } from '../domain/documentLimits'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { history, type ProjectSnapshot } from './history'
import { automaticLabelLayer, type AutoLabelResult } from '../domain/automaticLabels'
import { reconcileLabels, annotationBudget } from '../domain/annotations'
import { normalizeGroupOrder } from '../domain/projectView'
import { adoptNewThemeObjects } from '../domain/applyWorldTheme'
import { flatLayerTree } from '../domain/grouping'
export function automaticLabelSnapshot(state:ProjectSnapshot,result:AutoLabelResult):ProjectSnapshot{
 const remove=new Set(result.remove),objects=[...state.objects.filter(o=>!remove.has(o.id)),...result.labels]
 const layer=automaticLabelLayer(state),newId=layer?.id||crypto.randomUUID(),standalone=result.labels.filter(o=>!o.ownerId)
 const layers=state.layers.map(l=>({...l,objectIds:[...l.objectIds.filter(id=>!remove.has(id)),...result.labels.filter(o=>o.ownerId?l.objectIds.includes(o.ownerId):l.id===newId).map(o=>o.id)]}))
 if(standalone.length&&!layer)layers.unshift({id:newId,name:'Automatic labels',visible:true,locked:false,objectIds:standalone.map(o=>o.id)})
 const tree=state.layerTree||flatLayerTree(state.layers),layerTree=standalone.length&&!layer?{...tree,roots:[newId,...tree.roots]}:tree
 if(objects.length>DOCUMENT_LIMITS.objects||layers.length>DOCUMENT_LIMITS.layers)throw Error('Automatic labels exceed the project object or layer limit.')
 const checked=reconcileLabels(objects,layers);annotationBudget(checked)
 const map=adoptNewThemeObjects(state.map,checked,result.labels)
 return{map,objects:checked,layers,layerTree,objectGroups:normalizeGroupOrder(state.objectGroups||[],layers)}
}
export function applyAutomaticLabels(before:ProjectSnapshot,result:AutoLabelResult){
 const state=useProjectStore.getState()
 if(state.map!==before.map||state.objects!==before.objects||state.layers!==before.layers||state.objectGroups!==before.objectGroups||state.layerTree!==before.layerTree)throw Error('The map changed. Preview the labels again.')
 if(!result.labels.length&&!result.remove.length)return
 const next=automaticLabelSnapshot(state,result)
 history.run('Update automatic labels',()=>useProjectStore.setState(next))
 useEditorStore.setState({selectedObjectIds:[],message:`${result.labels.length-result.suppressed} labels placed; ${result.suppressed} hidden by automatic layout.`})
}
