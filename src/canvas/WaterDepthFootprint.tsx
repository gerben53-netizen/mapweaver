import { Shape } from 'react-konva/lib/ReactKonvaCore'
import { useWaterDepthStore } from '../store/waterDepthStore'
import { useEditorStore } from '../store/editorStore'

export function WaterDepthFootprint(){
  const cursor=useWaterDepthStore(s=>s.cursor),settings=useWaterDepthStore(s=>s.settings),tool=useEditorStore(s=>s.activeTool),zoom=useEditorStore(s=>s.viewport.zoom)
  if(tool!=='waterDepth'||!cursor)return null
  return <Shape listening={false} sceneFunc={c=>{const ctx=c._context,r=settings.size/2;ctx.save();ctx.strokeStyle='#151a1c';ctx.lineWidth=3/zoom;ctx.beginPath();ctx.arc(cursor.x,cursor.y,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=settings.mode==='erase'?'#ffb5a8':settings.mode==='blend'?'#b8caff':'#f8f5db';ctx.lineWidth=1/zoom;ctx.stroke();if(settings.softness>0){ctx.setLineDash([3/zoom,3/zoom]);ctx.beginPath();ctx.arc(cursor.x,cursor.y,r*(1-settings.softness),0,Math.PI*2);ctx.stroke()}ctx.restore()}}/>
}
