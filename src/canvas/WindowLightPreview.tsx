import { Group,Shape } from 'react-konva/lib/ReactKonvaCore'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { useWindowLightPreview } from '../store/windowLightPreview'
import { projectObjects } from '../domain/projectView'
import { windowLightPreview } from '../campfire/windowLights'
export function WindowLightPreview(){
 const enabled=useWindowLightPreview(s=>s.enabled),state=useProjectStore(),zoom=useEditorStore(s=>s.viewport.zoom)
 if(!enabled)return null
 const objects=projectObjects(state,true)
 return <Group clipX={0} clipY={0} clipWidth={state.map.width} clipHeight={state.map.height} listening={false}>
 {objects.filter(o=>o.kind==='window').map(window=>{
  const wall=objects.find(o=>o.id===window.wallId&&o.kind==='path')
  if(!wall||wall.kind!=='path')return null
  const guide=windowLightPreview(window,wall)
  if(!guide.enabled)return null
  return <Shape key={window.id} sceneFunc={context=>{const c=context._context;c.save();c.translate(guide.point.x,guide.point.y);c.rotate(guide.angle);c.fillStyle=`rgba(255,208,100,${guide.transmission*.18})`;c.fillRect(-guide.width/2,-guide.guideDepth,guide.width,guide.guideDepth*2);c.strokeStyle='#d59d39';c.lineWidth=1.5/zoom;c.setLineDash([5/zoom,3/zoom]);c.strokeRect(-guide.width/2,-guide.guideDepth,guide.width,guide.guideDepth*2);c.setLineDash([]);for(const sign of [-1,1]){c.beginPath();c.moveTo(0,0);c.lineTo(0,sign*guide.guideDepth);c.moveTo(-4/zoom,sign*(guide.guideDepth-6/zoom));c.lineTo(0,sign*guide.guideDepth);c.lineTo(4/zoom,sign*(guide.guideDepth-6/zoom));c.stroke()}c.beginPath();c.arc(0,0,3/zoom,0,Math.PI*2);c.fillStyle='#d59d39';c.fill();c.restore()}}/>
 })}</Group>
}
