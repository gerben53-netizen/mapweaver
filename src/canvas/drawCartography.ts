import { textBaseline } from '../fonts/registry'
import type { CompassObject,TextStyle } from '../domain/annotations'
import { DEFAULT_TEXT,textWidth } from '../domain/annotations'
import { elementPreset } from '../domain/cartographicPresets'
import type { ElementKind,ElementPreset } from '../domain/cartographicPresets'
import { panelLayout,scaleBarMeasure } from '../domain/decorations'
import type { DecorationObject } from '../domain/decorations'
import type { MapDocument } from '../domain/models'
import { paintText } from './drawAnnotation'

/** Internal vector ornaments. No library records, external resources or theme colors. */
export function paintElementFrame(ctx:CanvasRenderingContext2D,kind:ElementKind,id:ElementPreset,w:number,h:number,ink:string,paper:string){
 const preset=elementPreset(kind,id),frame=preset.frame
 if(kind==='title'&&preset.titleCarrier){paintTitleCarrier(ctx,id,w,h,ink,paper);return}
 if(frame==='none')return
 ctx.save();ctx.strokeStyle=ink;ctx.fillStyle=paper;ctx.lineWidth=1.2
 const x=5,y=5,r=frame==='cartouche'?Math.min(24,h/4):3
 ctx.beginPath()
 if(frame==='banner'){
  ctx.moveTo(x,y);ctx.lineTo(w-x,y);ctx.lineTo(w-14,h/2);ctx.lineTo(w-x,h-y);ctx.lineTo(x,h-y);ctx.lineTo(14,h/2);ctx.closePath()
 }else if(frame==='parchment'){
  ctx.moveTo(9,5);ctx.bezierCurveTo(w*.4,10,w*.65,0,w-7,6);ctx.lineTo(w-5,h-8);ctx.bezierCurveTo(w*.7,h-3,w*.3,h-10,5,h-5);ctx.closePath()
 }else ctx.roundRect(x,y,w-2*x,h-2*y,r)
 ctx.fill();ctx.stroke()
 if(frame==='ornate'||frame==='cartouche'){
  ctx.lineWidth=.65;ctx.strokeRect(10,10,w-20,h-20)
  for(const [cx,cy,sx,sy] of [[7,7,1,1],[w-7,7,-1,1],[7,h-7,1,-1],[w-7,h-7,-1,-1]]){
   ctx.save();ctx.translate(cx,cy);ctx.scale(sx,sy);ctx.beginPath();ctx.moveTo(0,22);ctx.bezierCurveTo(15,22,20,4,8,4);ctx.bezierCurveTo(0,4,6,15,18,0);ctx.stroke();ctx.restore()
  }
 }
 ctx.restore()
}
export function paintCompassRose(ctx:CanvasRenderingContext2D,o:CompassObject){
 const id=elementPreset('compass',o.elementPreset).id
 ctx.save();ctx.scale(o.width/160,o.height/160);ctx.strokeStyle=o.color;ctx.fillStyle=o.color;ctx.lineWidth=1.2
 const rose=id!=='minimal',ornate=id==='ornate',paper=elementPreset('compass',id).paper
 if(id==='parchment'){ctx.save();ctx.globalAlpha*=.8;ctx.fillStyle=paper;ctx.beginPath();ctx.arc(80,80,66,0,Math.PI*2);ctx.fill();ctx.restore()}
 if(o.ring??rose){for(const r of ornate?[46,50,60]:[48]){ctx.beginPath();ctx.arc(80,80,r,0,Math.PI*2);ctx.stroke()}}
 if(ornate||id==='parchment')for(let i=0;i<32;i++){const a=i*Math.PI/16;ctx.beginPath();ctx.moveTo(80+Math.sin(a)*54,80+Math.cos(a)*54);ctx.lineTo(80+Math.sin(a)*(i%4?57:62),80+Math.cos(a)*(i%4?57:62));ctx.stroke()}
 const points=rose?8:1
 for(let i=0;i<points;i++){
  ctx.save();ctx.translate(80,80);ctx.rotate(i*Math.PI/4)
  const length=i%2?33:52,half=i%2?5:10
  ctx.beginPath();ctx.moveTo(0,-length);ctx.lineTo(half,0);ctx.lineTo(0,rose?10:18);ctx.closePath();ctx.fill();ctx.stroke()
  ctx.beginPath();ctx.moveTo(0,-length);ctx.lineTo(-half,0);ctx.lineTo(0,rose?10:18);ctx.closePath();ctx.save();ctx.fillStyle=paper;ctx.fill();ctx.restore();ctx.stroke();ctx.restore()
 }
 ctx.beginPath();ctx.arc(80,80,3,0,Math.PI*2);ctx.fill()
 const s={...DEFAULT_TEXT,size:16,bold:true,color:o.color}
 if(o.northLabel!==false)paintText(ctx,'N',80-textWidth('N',s)/2,19,s)
 if(o.cardinalLabels){for(const [t,x,y] of [['E',146,85],['S',80,154],['W',9,85]] as const)paintText(ctx,t,x-textWidth(t,s)/2,y,s)}
 if(ornate){ctx.beginPath();ctx.moveTo(80,22);ctx.bezierCurveTo(65,35,75,39,80,29);ctx.bezierCurveTo(85,39,95,35,80,22);ctx.stroke()}
 ctx.restore()
}
function lines(ctx:CanvasRenderingContext2D,texts:string[],s:TextStyle,x:number,y:number){
 texts.forEach((text,i)=>paintText(ctx,text,x+(s.align==='center'?(s.maxWidth-textWidth(text,s))/2:s.align==='right'?s.maxWidth-textWidth(text,s):0),y+textBaseline(s)+i*s.size*s.lineHeight,s))
}
export function paintDecoration(ctx:CanvasRenderingContext2D,o:DecorationObject,map?:MapDocument){
 if(o.kind==='scaleBar'){
  const measure=map?scaleBarMeasure(o,map):null,w=o.width,h=o.height
  if(!measure){const s={...DEFAULT_TEXT,font:o.font??DEFAULT_TEXT.font,size:Math.min(14,h*.3),maxWidth:w,color:o.color};const text='Configure map scale';s.size*=Math.min(1,w/Math.max(1,textWidth(text,s)));paintText(ctx,text,0,h*.6,s);return}
  const id=elementPreset('scaleBar',o.elementPreset).id,barY=h*.58,barH=h*.18
  ctx.strokeStyle=o.color;ctx.fillStyle=o.color;ctx.lineWidth=Math.min(1.5,h/30)
  if(id==='minimal'){ctx.beginPath();ctx.moveTo(0,barY);ctx.lineTo(w,barY);ctx.moveTo(.75,barY-5);ctx.lineTo(.75,barY+5);ctx.moveTo(w-.75,barY-5);ctx.lineTo(w-.75,barY+5);ctx.stroke()}
  else {for(let i=0;i<4;i++){ctx.fillStyle=i%2?o.background:o.color;ctx.fillRect(i*w/4,barY,w/4,barH)}ctx.strokeRect(.75,barY,w-1.5,barH)}
  if(id==='ornate'){ctx.beginPath();ctx.moveTo(w*.35,h*.92);ctx.quadraticCurveTo(w*.5,h*.72,w*.65,h*.92);ctx.stroke()}
  if(id==='parchment'){ctx.beginPath();ctx.moveTo(0,barY+barH+4);ctx.lineTo(w,barY+barH+4);ctx.stroke()}
  if(o.showLabels){const s={...DEFAULT_TEXT,font:o.font??DEFAULT_TEXT.font,size:Math.min(14,h*.28),color:o.color};s.size*=Math.min(1,w/(textWidth(measure.label,s)+textWidth(measure.halfLabel,s)+35));paintText(ctx,'0',0,barY-h*.125,s);paintText(ctx,measure.halfLabel,(w-textWidth(measure.halfLabel,s))/2,barY-h*.125,s);paintText(ctx,measure.label,w-textWidth(measure.label,s),barY-h*.125,s)}
  return
 }
 const layout=panelLayout(o)
 ctx.scale(o.width/layout.width,o.height/layout.height)
 if(o.frame)paintElementFrame(ctx,o.kind,o.elementPreset,layout.width,layout.height,o.color,o.background)
 if(o.title)lines(ctx,layout.title.lines,layout.titleStyle,layout.pad,layout.padY)
 if(o.body)lines(ctx,layout.body.lines,layout.bodyStyle,layout.pad,layout.padY+(o.title?layout.title.height+12:0))
}

/** Normalized vector paths scale together; cutouts stay transparent. */
function paintTitleCarrier(ctx:CanvasRenderingContext2D,id:ElementPreset,w:number,h:number,ink:string,paper:string){
 ctx.save();ctx.scale(w/500,h/125);ctx.strokeStyle=ink;ctx.fillStyle=paper;ctx.lineWidth=1.3
 const path=(draw:()=>void)=>{ctx.beginPath();draw();ctx.closePath();ctx.fill();ctx.stroke()}
 if(id==='ribbon'){
  for(const mirror of [false,true]){ctx.save();if(mirror){ctx.translate(500,0);ctx.scale(-1,1)}
   path(()=>{ctx.moveTo(5,31);ctx.lineTo(83,24);ctx.lineTo(83,105);ctx.lineTo(4,113);ctx.lineTo(23,72)})
   ctx.save();ctx.globalAlpha*=.22;ctx.fillStyle=ink;path(()=>{ctx.moveTo(55,83);ctx.lineTo(83,105);ctx.lineTo(83,76)});ctx.restore();ctx.restore()}
  path(()=>{ctx.moveTo(55,19);ctx.quadraticCurveTo(250,2,445,19);ctx.lineTo(445,110);ctx.quadraticCurveTo(250,103,55,110)})
  ctx.beginPath();ctx.moveTo(65,27);ctx.quadraticCurveTo(250,12,435,27);ctx.moveTo(65,102);ctx.quadraticCurveTo(250,95,435,102);ctx.stroke()
 }else if(id==='scroll'){
  path(()=>{ctx.moveTo(31,17);ctx.bezierCurveTo(180,4,340,26,468,12);ctx.lineTo(467,105);ctx.bezierCurveTo(330,116,170,98,30,111)})
  for(const x of [23,460]){path(()=>{ctx.moveTo(x,15);ctx.bezierCurveTo(x-22,2,x-21,39,x,33);ctx.lineTo(x+16,105);ctx.bezierCurveTo(x+35,124,x+42,86,x+19,97)})}
 }else if(id==='fantasy'){
  path(()=>{ctx.moveTo(250,5);ctx.bezierCurveTo(195,30,83,0,48,31);ctx.quadraticCurveTo(15,63,48,94);ctx.bezierCurveTo(83,125,195,95,250,120);ctx.bezierCurveTo(305,95,417,125,452,94);ctx.quadraticCurveTo(485,63,452,31);ctx.bezierCurveTo(417,0,305,30,250,5)})
  for(const x of [54,446]){ctx.save();ctx.translate(x,63);if(x>250)ctx.scale(-1,1);ctx.beginPath();ctx.moveTo(0,30);ctx.bezierCurveTo(39,30,30,-30,2,-26);ctx.bezierCurveTo(-13,-21,11,1,17,-11);ctx.stroke();ctx.restore()}
  for(const y of [16,109]){ctx.beginPath();ctx.moveTo(210,y);ctx.quadraticCurveTo(250,y<63?y+10:y-10,290,y);ctx.stroke()}
 }else{
  path(()=>{ctx.moveTo(33,10);ctx.lineTo(467,10);ctx.lineTo(494,63);ctx.lineTo(467,115);ctx.lineTo(33,115);ctx.lineTo(6,63)})
  ctx.strokeRect(46,19,408,87)
  for(const x of [27,473]){ctx.beginPath();ctx.moveTo(x,52);ctx.lineTo(x+6,63);ctx.lineTo(x,74);ctx.lineTo(x-6,63);ctx.closePath();ctx.fill()}
 }
 ctx.restore()
}
