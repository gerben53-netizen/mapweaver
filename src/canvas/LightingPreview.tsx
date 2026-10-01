import { Circle,Group,Shape } from 'react-konva/lib/ReactKonvaCore'
import 'konva/lib/shapes/Circle'
import { useLightingPreview } from '../store/lightingPreview'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { defaultLighting } from '../campfire/authoring'
export function LightingPreview(){
 const show=useLightingPreview(s=>s.enabled),map=useProjectStore(s=>s.map),zoom=useEditorStore(s=>s.viewport.zoom),lighting=map.lighting||defaultLighting(),scale=map.grid.physicalScale,feet=(scale?.distancePerCell||5)*(scale?.unit==='m'?1/.3048:1)
 if(!show)return null
 return <Group clipX={0} clipY={0} clipWidth={map.width} clipHeight={map.height}><Shape listening={false} sceneFunc={context=>{const c=context._context;c.save();c.fillStyle=`rgba(0,0,0,${1-lighting.ambient.intensity})`;c.fillRect(0,0,map.width,map.height);c.globalCompositeOperation='screen';for(const light of lighting.lights){if(!light.enabled)continue;const radius=light.radiusFt/feet*map.grid.cellSize,gradient=c.createRadialGradient(light.position.x,light.position.y,0,light.position.x,light.position.y,radius);gradient.addColorStop(0,light.color);gradient.addColorStop(1,'transparent');c.globalAlpha=light.intensity;c.fillStyle=gradient;c.fillRect(light.position.x-radius,light.position.y-radius,radius*2,radius*2)}c.restore()}}/>
 {lighting.lights.map(light=><Group key={light.id}><Circle listening={false} x={light.position.x} y={light.position.y} radius={light.radiusFt/feet*map.grid.cellSize} stroke={light.color} strokeWidth={1/zoom} dash={[6/zoom,4/zoom]} opacity={light.enabled?.7:.3}/><Circle x={light.position.x} y={light.position.y} radius={6/zoom} fill={light.color} stroke="#ffffff" strokeWidth={2/zoom} draggable onMouseDown={e=>{e.cancelBubble=true;useLightingPreview.setState({selectedId:light.id})}} onDragEnd={e=>{const position={x:Math.max(0,Math.min(map.width,e.target.x())),y:Math.max(0,Math.min(map.height,e.target.y()))};useProjectStore.getState().setLighting({...lighting,lights:lighting.lights.map(l=>l.id===light.id?{...l,position}:l)});e.target.position(position)}}/></Group>)}
 </Group>
}
