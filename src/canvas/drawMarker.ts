import { MARKER_ICONS } from '../domain/markerRegistry'
import type { MarkerConfig } from '../domain/markerRegistry'
const paths=new Map<string,Path2D[]>()
export function paintMarker(ctx:CanvasRenderingContext2D,m:MarkerConfig,width:number,height:number){
 ctx.save();ctx.scale(width/64,height/64);ctx.lineJoin='round';ctx.lineCap='round'
 ctx.strokeStyle=m.ink;ctx.fillStyle=m.outline
 if(m.style==='ornate'||m.style==='parchment'){
  ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(32,33,30,29,0,0,Math.PI*2);if(m.style==='parchment')ctx.fill();ctx.stroke()
  if(m.style==='ornate'){ctx.beginPath();ctx.moveTo(2,32);ctx.lineTo(7,27);ctx.moveTo(2,32);ctx.lineTo(7,37);ctx.moveTo(62,32);ctx.lineTo(57,27);ctx.moveTo(62,32);ctx.lineTo(57,37);ctx.stroke()}
  ctx.translate(7,7);ctx.scale(.78,.78)
 }
 const icon=MARKER_ICONS.find(i=>i.id===m.iconId)??MARKER_ICONS[0]
 let shapes=paths.get(icon.id);if(!shapes){shapes=icon.paths.map(d=>new Path2D(d));paths.set(icon.id,shapes)}
 for(const p of shapes){
  if(m.style==='classic'||m.style==='ornate'){ctx.strokeStyle=m.outline;ctx.lineWidth=5;ctx.stroke(p)}
  ctx.strokeStyle=m.ink;ctx.lineWidth=m.style==='technical'?1.8:m.style==='minimal'?3:2.5
  if(m.style!=='technical'){ctx.fillStyle=m.style==='minimal'?m.ink:m.outline;ctx.fill(p,'evenodd')}
  ctx.stroke(p)
 }
 ctx.restore()
}
