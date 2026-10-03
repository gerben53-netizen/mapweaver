import { fontCSS, textBaseline } from '../fonts/registry'
import { paintMarker } from './drawMarker'
import { paintDecoration,paintCompassRose,paintElementFrame } from './drawCartography'
import type { MapDocument } from '../domain/models'
import { advance,glyph,legendLayout,textLayout,textWidth,DEFAULT_TEXT } from '../domain/annotations'
import type { Annotation,TextStyle } from '../domain/annotations'
export function paintText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,s:TextStyle){
  ctx.font=fontCSS(s);ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.lineJoin='round';ctx.lineWidth=s.strokeWidth*2;ctx.strokeStyle=s.strokeColor;ctx.fillStyle=s.color
  // Outline the full run first, so neighboring outlines never cover glyph fills.
  if(s.strokeWidth){let cursor=x;for(const c of text){ctx.strokeText(glyph(c,s),cursor,y);cursor+=advance(c,s)}}
  for(const c of text){ctx.fillText(glyph(c,s),x,y);x+=advance(c,s)}
}
function symbol(ctx:CanvasRenderingContext2D,type:string,color:string,size:number){
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;ctx.beginPath()
  if(type==='capital'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=size*(i%2?.22:.48);const x=size/2+Math.cos(a)*r,y=size/2+Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.closePath();ctx.fill()}
  else if(type==='fort'||type==='ruin'){ctx.strokeRect(3,3,size-6,size-6);if(type==='ruin'){ctx.moveTo(3,3);ctx.lineTo(size-3,size-3);ctx.stroke()}}
  else if(type==='landmark'){ctx.moveTo(size/2,2);ctx.lineTo(size-2,size-2);ctx.lineTo(2,size-2);ctx.closePath();ctx.fill()}
  else {ctx.arc(size/2,size/2,size*.3,0,Math.PI*2);if(type==='village')ctx.stroke();else ctx.fill()}
}
export function paintAnnotation(ctx:CanvasRenderingContext2D,o:Annotation,images:Map<string,CanvasImageSource>,map?:MapDocument){
  ctx.save();ctx.globalAlpha*=o.opacity
  if(o.scaleX<0){ctx.translate(o.width,0);ctx.scale(-1,1)}if(o.scaleY<0){ctx.translate(0,o.height);ctx.scale(1,-1)}
  if(o.kind==='scaleBar'||o.kind==='title'||o.kind==='infoPanel'){paintDecoration(ctx,o,map)}
  else if(o.kind==='place'||o.kind==='compass'){
    const image=o.assetId?images.get(o.assetId):undefined
    if(image)ctx.drawImage(image,0,0,o.width,o.height)
    else if(o.assetId){ctx.fillStyle='#ad3737';ctx.fillRect(0,0,o.width,o.height);paintText(ctx,'?',4,18,DEFAULT_TEXT)}
    else if(o.kind==='place'&&o.marker){paintMarker(ctx,o.marker,o.width,o.height)}
    else if(o.kind==='place'){ctx.scale(o.width/28,o.height/28);symbol(ctx,o.placeType,'#343e36',28)}
    else if(o.elementPreset&&o.elementPreset!=='technical'){paintCompassRose(ctx,o)}
    else {
      ctx.scale(o.width/80,o.height/80);ctx.strokeStyle=o.color;ctx.fillStyle=o.color;ctx.lineWidth=2
      if(o.compassStyle!=='arrow'){ctx.beginPath();ctx.moveTo(8,46);ctx.lineTo(72,46);ctx.moveTo(40,18);ctx.lineTo(40,76);ctx.stroke()}
      ctx.beginPath();ctx.moveTo(40,20);ctx.lineTo(29,62);ctx.lineTo(40,52);ctx.lineTo(51,62);ctx.closePath();ctx.fill()
      if((o.ring??(o.compassStyle==='rose'))){ctx.beginPath();ctx.arc(40,46,24,0,Math.PI*2);ctx.stroke()}
      if(o.northLabel!==false)paintText(ctx,'N',34,15,{...DEFAULT_TEXT,size:16,bold:true,color:o.color})
    }
  }else if(o.kind==='label'){
    const s=o.style,layout=textLayout(o.text,s);ctx.scale(o.layoutScale,o.layoutScale)
    if(s.backgroundOpacity>0){ctx.save();ctx.globalAlpha*=s.backgroundOpacity;ctx.fillStyle=s.background;ctx.fillRect(0,0,layout.width,layout.height);ctx.restore()}
    layout.lines.forEach((line,i)=>{const w=textWidth(line,s),pad=s.padding+s.strokeWidth,x=pad+(s.align==='center'?(s.maxWidth-w)/2:s.align==='right'?s.maxWidth-w:0);paintText(ctx,line,x,pad+textBaseline(s)+i*s.size*s.lineHeight,s)})
  }else if(o.kind==='legend'){
    const layout=legendLayout(o)
    ctx.scale(o.width/layout.width,o.height/layout.height);
    if(!o.elementPreset||o.elementPreset==='legacy'){ctx.fillStyle=o.background;ctx.fillRect(0,0,layout.width,layout.height);ctx.strokeStyle=o.outline;ctx.lineWidth=1;ctx.strokeRect(.5,.5,layout.width-1,layout.height-1)}
    else paintElementFrame(ctx,'legend',o.elementPreset,layout.width,layout.height,o.outline,o.background)
    layout.title.lines.forEach((line,i)=>paintText(ctx,line,o.padding,o.padding+(o.font?textBaseline(layout.titleStyle):16)+i*layout.titleStyle.size*layout.titleStyle.lineHeight,{...layout.titleStyle,color:o.outline}))
    layout.entries.forEach(({entry,lines,x,y})=>{ctx.save();ctx.translate(x,y);const image=entry.assetId?images.get(entry.assetId):undefined;if(image)ctx.drawImage(image,0,0,20,20);else symbol(ctx,entry.placeType,entry.assetId?'#ad3737':entry.color,20);ctx.restore();lines.forEach((line,i)=>paintText(ctx,line,x+28,y+(o.font?textBaseline(layout.entryStyle):12)+i*layout.entryStyle.size*layout.entryStyle.lineHeight,{...layout.entryStyle,...(o.elementPreset&&o.elementPreset!=='legacy'?{color:o.outline}:{})}))})
  }
  ctx.restore()
}
