import { DETAIL_PRESETS, detailPreset, detailRandom, type EnvironmentalDetail, type DetailStroke } from '../domain/environmentalDetail'

const TILE=256, MAX_CACHE_BYTES=32*1024*1024
const identities=new WeakMap<EnvironmentalDetail,number>();let sequence=0,bytes=0
const cache=new Map<string,HTMLCanvasElement>()
function identity(data:EnvironmentalDetail){if(!identities.has(data))identities.set(data,++sequence);return identities.get(data)!}
export function clearEnvironmentalCache(){cache.clear();bytes=0}
function tile(data:EnvironmentalDetail,presetId:string,x:number,y:number,scale:1|2){
  const key=`${identity(data)}:${presetId}:${x}:${y}:${scale}`,existing=cache.get(key)
  if(existing){cache.delete(key);cache.set(key,existing);return existing}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=TILE*scale;const c=canvas.getContext('2d')!;c.scale(scale,scale);c.translate(-x*TILE,-y*TILE)
  for(const s of data.strokes){if(s.brush.mode!=='surface'||s.brush.action==='paint'&&s.brush.presetId!==presetId)continue;const r=s.brush.radius;if(!s.points.some(p=>p.x+r>=x*TILE&&p.y+r>=y*TILE&&p.x-r<=(x+1)*TILE&&p.y-r<=(y+1)*TILE))continue
    c.globalCompositeOperation=s.brush.action==='erase'?'destination-out':'source-over';const random=detailRandom(s.seed),color=detailPreset(presetId)!.color
    for(const p of s.points){for(let j=0;j<3;j++){const radius=r*(.45+random()*.5),dx=(random()-.5)*r*.65,dy=(random()-.5)*r*.65,px=p.x+dx,py=p.y+dy;const g=c.createRadialGradient(px,py,Math.max(.01,radius*(1-s.brush.softness)*.8),px,py,radius);g.addColorStop(0,color);g.addColorStop(1,s.brush.softness?color+'00':color);c.fillStyle=g;c.globalAlpha=s.brush.opacity*(s.brush.action==='erase'?.6:.15);c.beginPath();c.arc(px,py,radius,0,Math.PI*2);c.fill()}}
  }
  cache.set(key,canvas);bytes+=canvas.width*canvas.height*4
  while(bytes>MAX_CACHE_BYTES&&cache.size>1){const oldest=cache.keys().next().value!,v=cache.get(oldest)!;bytes-=v.width*v.height*4;cache.delete(oldest)}
  return canvas
}
function occupiedSurfaceTiles(data:EnvironmentalDetail,width:number,height:number){const keys=new Set<string>();for(const s of data.strokes){if(s.brush.mode!=='surface'||s.brush.action!=='paint')continue;for(const p of s.points){const r=s.brush.radius;for(let y=Math.max(0,Math.floor((p.y-r)/TILE));y<=Math.min(Math.ceil(height/TILE)-1,Math.floor((p.y+r)/TILE));y++)for(let x=Math.max(0,Math.floor((p.x-r)/TILE));x<=Math.min(Math.ceil(width/TILE)-1,Math.floor((p.x+r)/TILE));x++)keys.add(`${x},${y}`)}}return keys}
/** Persisted world-space tuples are drawn directly; no random choice in rendering. */
function drawDecals(ctx:CanvasRenderingContext2D,s:DetailStroke,tier:'floor'|'edge'){
  const preset=detailPreset(s.brush.presetId)!;if(preset.tier!==tier)return
  for(const v of s.instances){ctx.save();ctx.translate(v.x,v.y);ctx.rotate(v.rotation*Math.PI/180);ctx.scale(v.size,v.size);ctx.globalAlpha*=v.opacity;ctx.fillStyle=preset.color;ctx.strokeStyle=preset.color;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=.055
    if(preset.id.endsWith('cracks')){ctx.beginPath();ctx.moveTo(-.48,-.08);ctx.lineTo(-.2,.06+v.variant*.02);ctx.lineTo(.06,-.05);ctx.lineTo(.45,.14);ctx.moveTo(.04,-.05);ctx.lineTo(.12,-.31);ctx.moveTo(-.2,.07);ctx.lineTo(-.34,.32);ctx.stroke()}
    else if(preset.id.endsWith('roots')){ctx.lineWidth=.11;ctx.beginPath();ctx.moveTo(-.48,-.2);ctx.bezierCurveTo(-.3,.24,.2,-.18,.49,.16);ctx.moveTo(-.18,.08);ctx.quadraticCurveTo(-.18,-.12,.06,-.34);ctx.moveTo(.2,.03);ctx.lineTo(.33,.32);ctx.stroke();ctx.strokeStyle='#b19667';ctx.lineWidth=.035;ctx.beginPath();ctx.moveTo(-.48,-.23);ctx.bezierCurveTo(-.3,.2,.2,-.22,.49,.13);ctx.stroke()}
    else{const random=detailRandom(v.variant*3571+7919),count=preset.id.endsWith('moss-clumps')?9:preset.id.endsWith('leaves')?5:4;for(let i=0;i<count;i++){const x=(random()-.5)*.7,y=(random()-.5)*.7,r=.08+random()*.13;ctx.save();ctx.translate(x,y);ctx.rotate(random()*Math.PI);ctx.globalAlpha*=.6+random()*.4;ctx.beginPath();if(preset.id.endsWith('leaves'))ctx.ellipse(0,0,r,r*.4,0,0,Math.PI*2);else if(preset.id.endsWith('moss-clumps'))ctx.ellipse(0,0,r,r*.8,0,0,Math.PI*2);else{ctx.moveTo(-r,-r*.3);ctx.lineTo(-r*.3,-r);ctx.lineTo(r*.8,-r*.5);ctx.lineTo(r,r*.6);ctx.lineTo(-r*.5,r);ctx.closePath()}ctx.fill();if(!preset.id.endsWith('moss-clumps')){ctx.strokeStyle='#d0c3a0';ctx.lineWidth=.025;ctx.stroke()}ctx.restore()}}
    ctx.restore()
  }
}
export function drawEnvironmentalDetail(ctx:CanvasRenderingContext2D,data:EnvironmentalDetail|undefined,width:number,height:number,tier:'floor'|'edge',scale:1|2=1){
  if(!data?.visible||data.opacity===0)return
  ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();ctx.globalAlpha*=data.opacity
  if(tier==='floor'){const keys=occupiedSurfaceTiles(data,width,height);for(const preset of DETAIL_PRESETS.filter(p=>p.mode==='surface')){if(!data.strokes.some(s=>s.brush.presetId===preset.id&&s.brush.action==='paint'))continue;ctx.globalCompositeOperation=preset.blend as GlobalCompositeOperation;for(const key of keys){const [x,y]=key.split(',').map(Number);ctx.drawImage(tile(data,preset.id,x,y,scale),x*TILE,y*TILE,TILE,TILE)}}ctx.globalCompositeOperation='source-over'}
  for(const s of data.strokes)if(s.brush.mode==='decals')drawDecals(ctx,s,tier)
  ctx.restore()
}
