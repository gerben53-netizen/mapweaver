import { transformScatter } from '../domain/scatter'
import { isOpening } from '../domain/openings'
import { useEditorStore } from './editorStore'
import { transformPath } from '../domain/paths'
import { editableProjectIds } from '../domain/projectView'
import { useProjectStore } from './projectStore'
import { history } from './history'
import type { ObjectTransform } from '../domain/transforms'
export function beginObjectEdit(id: string, label = 'Transform object') {
  const before = useProjectStore.getState().objects.find((object) => object.id === id)
  if (!before || !editableProjectIds(useProjectStore.getState()).has(id)) return null
  const attachments=useProjectStore.getState().objects.filter(isOpening).filter(o=>o.wallId===id)
  history.begin(label)
  let finished = false
  return {
    before,
    preview(transform: ObjectTransform) { if (!finished) { if(before.kind==='scatter'){try{useProjectStore.getState().updateScatter(transformScatter(before,transform))}catch(e){useEditorStore.setState({message:(e as Error).message})}}else if(before.kind==='path') {try{useProjectStore.getState().updatePath(transformPath(before,transform),attachments.map(o=>({...o,openingWidth:o.openingWidth*Math.min(transform.width/before.width,transform.height/before.height),side:(transform.scaleX*transform.scaleY<0?-o.side:o.side) as 1|-1})))}catch(e){useEditorStore.setState({message:(e as Error).message})}} else useProjectStore.getState().updateTransform(id, transform) } },
    finish() {
      if (finished) return
      finished = true
      const after = useProjectStore.getState().objects.find((object) => object.id === id)
      if (after && before.kind!=='path'&&before.kind!=='scatter') useProjectStore.getState().commitTransform(before, after)
      else history.commit()
    },
    cancel() { if (!finished) { finished = true; history.cancel() } },
  }
}
export function editObject(id: string, transform: ObjectTransform) {
  const edit = beginObjectEdit(id)
  edit?.preview(transform); edit?.finish()
}
