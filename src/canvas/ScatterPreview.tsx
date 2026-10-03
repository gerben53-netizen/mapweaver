import { Circle,Group } from 'react-konva/lib/ReactKonvaCore'
import 'konva/lib/shapes/Circle'
import type { Point } from './viewport'
import type { ScatterObject } from '../domain/scatter'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { ScatterPaint } from './ScatterPaint'
export function ScatterPreview({preview,cursor}:{preview:ScatterObject|null;cursor:Point|null}){
  const tool=useEditorStore(s=>s.activeTool),diameter=useEditorStore(s=>s.scatterSettings.diameter),zoom=useEditorStore(s=>s.viewport.zoom),mode=useEditorStore(s=>s.scatterMode)
  const existing=useProjectStore(s=>s.objects.some(o=>o.id===preview?.id))
  if(tool!=='scatter')return null
  return <Group listening={false}>{preview&&!existing&&<Group x={preview.x} y={preview.y} opacity={.7}><ScatterPaint object={preview} preview/></Group>}{cursor&&Number.isFinite(diameter)&&<Circle x={cursor.x} y={cursor.y} radius={Math.max(2,Math.min(4096,diameter))/2} stroke={mode==='erase'?'#ed947b':'#8cd6aa'} strokeWidth={1.5/zoom} dash={[5/zoom,4/zoom]} fill={mode==='erase'?'#ed947b18':'#8cd6aa18'}/>}</Group>
}
