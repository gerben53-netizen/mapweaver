import { flatLayerTree, flattenLayerTree } from './grouping'
import { objectListName, createObjectListSelector } from './objectList'
import type { ObjectListFilter } from './objectList'
import type { ManagedContent } from './projectView'
import type { IconName } from '../app/Icon'
export interface SceneNode {
  id: string; kind: 'layer' | 'group' | 'object'; type: string; name: string; layerId: string; parentId: string | null;
  depth: number; assetId: string | null; visible: boolean; locked: boolean; ownVisible: boolean; ownLocked: boolean;
  inheritedHidden: boolean; inheritedLocked: boolean; context: string; children: SceneNode[]
}
/** Canvas transforms do not affect scene metadata; retain the projection input
 * across drag previews instead of rerendering every tree row per pointer event. */
export function createSceneContentSelector() {
  let previous: ManagedContent | undefined
  return (state: ManagedContent): ManagedContent => {
    if(previous && previous.layers===state.layers && previous.layerTree===state.layerTree && previous.objectGroups===state.objectGroups && previous.objects.length===state.objects.length && state.objects.every((o,i)=>{
      const p=previous!.objects[i]
      return p.id===o.id && p.kind===o.kind && p.name===o.name && p.visible===o.visible && p.locked===o.locked && p.assetId===o.assetId && (o.kind!=='path'||p.kind==='path'&&p.pathKind===o.pathKind)
    }))return previous
    previous={objects:state.objects,layers:state.layers,layerTree:state.layerTree,objectGroups:state.objectGroups}
    return previous
  }
}
export const sceneIcon = (type: string): IconName => {
  if (type === 'layer') return 'layers'
  if (type === 'group') return 'folder'
  if (['river','road','border'].includes(type)) return 'route'
  if (['door','window'].includes(type)) return 'opening'
  if (['title','infoPanel'].includes(type)) return 'map'
  if (type === 'scaleBar') return 'measure'
  if (type === 'patternFill') return 'pattern'
  return (['stamp','area','wall','path','label','place','legend','compass','scatter'].includes(type) ? type : 'map') as IconName
}
/** A projection only: layer groups retain their canonical order and inherited flags.
 * Noncontiguous object groups are anchored at their frontmost member; no IDs move. */
export function sceneTree(content: ManagedContent, names: ReadonlyMap<string,string>, solo: string | null = null): SceneNode[] {
  const tree = content.layerTree || flatLayerTree(content.layers), layerGroups = new Map(tree.groups.map(g => [g.id,g]))
  const objects = new Map(content.objects.map(o=>[o.id,o])), groups = new Map((content.objectGroups||[]).map(g=>[g.id,g]))
  const rows = createObjectListSelector(solo)(content), byLayer = new Map<string,typeof rows>()
  for (const row of rows) { const list=byLayer.get(row.layerId)||[];list.push(row);byLayer.set(row.layerId,list) }
  return flattenLayerTree(tree,content.layers,solo).map(({layer,ancestors})=>{
    const own=content.layers.find(l=>l.id===layer.id)!, context=ancestors.map(id=>layerGroups.get(id)!.name).join(' › ')
    const root:SceneNode={id:layer.id,kind:'layer',type:'layer',name:layer.name,layerId:layer.id,parentId:null,depth:0,assetId:null,visible:layer.visible,locked:layer.locked,ownVisible:own.visible,ownLocked:own.locked,inheritedHidden:ancestors.some(id=>!layerGroups.get(id)!.visible)||!!solo&&!([layer.id,...ancestors].includes(solo)),inheritedLocked:ancestors.some(id=>layerGroups.get(id)!.locked),context,children:[]}
    const branches=new Map<string,SceneNode>()
    for(const row of byLayer.get(layer.id)||[]) {
      const group=row.kind==='group'?groups.get(row.id):row.groupId?groups.get(row.groupId):undefined, object=objects.get(row.id)
      const parent=row.groupId?branches.get(row.groupId)!:root
      const inheritedHidden=!layer.visible||(row.kind!=='group'&&group?.visible===false),inheritedLocked=layer.locked||(row.kind!=='group'&&!!group?.locked)
      const node:SceneNode={id:row.id,kind:row.kind==='group'?'group':'object',type:row.kind,name:objectListName(row,names),layerId:layer.id,parentId:parent.id,depth:row.groupId?2:1,assetId:row.assetId,visible:row.visible,locked:row.locked,ownVisible:row.kind==='group'?group!.visible:object?.visible!==false,ownLocked:row.kind==='group'?group!.locked:!!object?.locked,inheritedHidden,inheritedLocked,context:row.groupId?`Group ${group!.name} · ${layer.name}`:layer.name,children:[]}
      if(row.kind==='group')branches.set(row.id,node)
      parent.children.push(node)
    }
    return root
  })
}
export interface SceneFilter { query:string; type:ObjectListFilter; scope:'all'|'active'|'visible'; activeLayerId:string }
export function filterSceneTree(tree:SceneNode[],filter:SceneFilter):SceneNode[] {
  const query=filter.query.trim().toLocaleLowerCase(), constrained=!!query||filter.type!=='all'||filter.scope==='visible'
  const visit=(node:SceneNode,ancestorMatches=false):SceneNode|null=>{
    const nameMatches=!!query&&node.name.toLocaleLowerCase().includes(query), branchMatch=ancestorMatches||(node.kind!=='object'&&nameMatches)
    const children=node.children.map(child=>visit(child,branchMatch)).filter((n):n is SceneNode=>!!n)
    const match=(!query||nameMatches||ancestorMatches)&&(filter.type==='all'||node.type===filter.type)&&(filter.scope!=='visible'||node.visible)
    if(node.kind==='object')return match?node:null
    return children.length||(!constrained||match)?{...node,children}:null
  }
  return tree.filter(n=>filter.scope!=='active'||n.id===filter.activeLayerId).map(n=>visit(n)).filter((n):n is SceneNode=>!!n)
}
export function visibleSceneRows(tree:SceneNode[],collapsed:ReadonlySet<string>,forceOpen=false) {
  const rows:SceneNode[]=[]
  function visit(n:SceneNode){rows.push(n);if(forceOpen||!collapsed.has(n.id))n.children.forEach(visit)}
  tree.forEach(visit);return rows
}
