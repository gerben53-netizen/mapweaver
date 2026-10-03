import { applyWallStyleChanges } from '../domain/wallStylePatch'
import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { wallStyle } from '../domain/walls'
import { WallFields } from './WallFields'
import type { PathObject } from '../domain/models'
export function WallBulkProperties({objects}:{objects:PathObject[]}) {
  const [initial]=useState(()=>wallStyle(objects[0]))
  const [style,setStyle]=useState(initial)
  const mixed=objects.some(o=>JSON.stringify(wallStyle(o))!==JSON.stringify(initial))
  return <form onSubmit={e=>{e.preventDefault();try{useProjectStore.getState().updateWallStyles(objects.map(o=>o.id),previous=>applyWallStyleChanges(previous,initial,style));useEditorStore.setState({message:''})}catch(error){useEditorStore.setState({message:(error as Error).message})}}}>
    <h3>{objects.length} walls</h3><p>{mixed?'Mixed values. Only fields you change are applied to all selected walls.':'Only changed fields are applied in one undo step.'}</p>
    <WallFields value={style} onChange={setStyle} replacementIds={objects.map(o=>o.id)}/><button type="submit">Apply wall styles</button>
  </form>
}

