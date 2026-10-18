import { resolvedLandBrush, landGridPoint } from '../domain/landHexGrid'
import { useProjectStore } from '../store/projectStore'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import { useLandBrushStore } from '../store/landBrushStore'
import { useEditorStore } from '../store/editorStore'
import { landFootprint } from '../domain/landBrush'
import { isOrganicLandShape } from '../domain/organicLandFootprint'
export function LandBrushFootprint(){
 const {cursor,settings:raw,angle,inverted,organicSeed}=useLandBrushStore(),tool=useEditorStore(s=>s.activeTool),zoom=useEditorStore(s=>s.viewport.zoom)
 const grid=useProjectStore(s=>s.map.grid),settings=resolvedLandBrush(raw,grid,inverted)
 if(tool!=='landBrush'||!cursor)return null
 const action=inverted&&['add','remove'].includes(settings.action)?settings.action==='add'?'remove':'add':settings.action
 return <Shape listening={false} sceneFunc={c=>{const ctx=c._context,r=landFootprint(landGridPoint(cursor,settings),settings,isOrganicLandShape(settings.shape)?organicSeed:1,angle);ctx.save();ctx.beginPath();ctx.moveTo(r[0].x,r[0].y);r.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.strokeStyle='#172324';ctx.lineWidth=3/zoom;ctx.stroke();ctx.strokeStyle=action==='remove'?'#8cceef':action==='smooth'?'#c3b3ff':action==='roughen'?'#efbe87':'#c4e6a3';ctx.lineWidth=1/zoom;ctx.stroke();ctx.font=`${12/zoom}px sans-serif`;ctx.fillStyle=ctx.strokeStyle;ctx.fillText(({add:'Add Land',remove:'Remove Land',smooth:'Smooth Coast',roughen:'Roughen Coast'})[action],cursor.x+settings.size/2+8/zoom,cursor.y);ctx.restore()}}/>
}
