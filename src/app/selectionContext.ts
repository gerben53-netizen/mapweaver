import { createObjectGroup } from '../domain/grouping'
import type { ManagedContent } from '../domain/projectView'
export function canGroupSelection(state:ManagedContent,ids:string[]) {
 if(ids.length<2)return false
 try{createObjectGroup('__proposed_group__','Group',ids,state.objectGroups||[],state.layers,state.objects);return true}catch{return false}
}
