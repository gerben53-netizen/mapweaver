import type { PathObject } from '../domain/models'
import { pathGeometry } from '../domain/paths'
import { routeWidth } from '../domain/routes'
import { pathTrace } from './drawPath'
type Point={x:number;y:number}
const cache=new WeakMap<PathObject,{point:Point;width:number;normal:Point}[]>()
const scratch=new WeakMap<CanvasRenderingContext2D,HTMLCanvasElement>()
export function routeSamples(p:PathObject) {
  let points=cache.get(p);if(points)return points
  const geometry=pathGeometry(p),samples=geometry.samples.filter((s,i,all)=>!i||Math.hypot(s.point.x-all[i-1].point.x,s.point.y-all[i-1].point.y)>1e-9)
  points=samples.map((s,i)=>{
    const a=samples[p.closed&&(i===0||i===samples.length-1)?samples.length-2:Math.max(0,i-1)].point,b=samples[p.closed&&(i===0||i===samples.length-1)?1:Math.min(samples.length-1,i+1)].point
    const length=Math.hypot(b.x-a.x,b.y-a.y)||1
    return {point:s.point,width:routeWidth(p,(geometry.segments[s.segment].start+(s.t===0?0:s.t===1?geometry.segments[s.segment].length:geometry.segments[s.segment].curve.split(0,s.t).length()))/geometry.length),normal:{x:-(b.y-a.y)/length,y:(b.x-a.x)/length}}
  });cache.set(p,points);return points
}
/** One nonzero fill: overlaps do not multiply opacity, even at acute joins. */
export function riverTrace(c:CanvasRenderingContext2D,p:PathObject,extra=0) {
  const points=routeSamples(p);c.beginPath()
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.point.x-a.point.x,dy=b.point.y-a.point.y,len=Math.hypot(dx,dy)
    if(!len)continue
    const nx=-dy/len,ny=dx/len,ar=a.width/2+extra,br=b.width/2+extra
    c.moveTo(a.point.x+nx*ar-p.x,a.point.y+ny*ar-p.y)
    c.lineTo(a.point.x-nx*ar-p.x,a.point.y-ny*ar-p.y)
    c.lineTo(b.point.x-nx*br-p.x,b.point.y-ny*br-p.y)
    c.lineTo(b.point.x+nx*br-p.x,b.point.y+ny*br-p.y);c.closePath()
  }
  for(const {point,width} of points){const r=width/2+extra;if(r>0){c.moveTo(point.x+r-p.x,point.y-p.y);c.arc(point.x-p.x,point.y-p.y,r,0,Math.PI*2)}}
}
function borderTrace(c:CanvasRenderingContext2D,p:PathObject) {
  if(p.route?.kind!=='border'||p.route.style!=='double'){pathTrace(c,p,p.x,p.y);return}
  const samples=routeSamples(p);c.beginPath()
  for(const side of [-1,1]){for(const [i,s] of samples.entries()){const x=s.point.x+s.normal.x*p.strokeWidth*side-p.x,y=s.point.y+s.normal.y*p.strokeWidth*side-p.y;if(!i)c.moveTo(x,y);else c.lineTo(x,y)}if(p.closed)c.closePath()}
}
export function paintRoute(c:CanvasRenderingContext2D,p:PathObject,image?:CanvasImageSource,hitColor?:string,connections:Point[]=[],compositing=false) {
  const r=p.route;if(!r)return
  // Apply object opacity once, including bank/marking overlaps. Allocate only the
  // visible device-space bounds, never a potentially enormous map-space box.
  if(!hitColor&&!compositing&&p.opacity<1){
    if(p.opacity===0)return
    const m=c.getTransform(),corners=[[0,0],[p.width,0],[0,p.height],[p.width,p.height]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}))
    const x=Math.max(0,Math.floor(Math.min(...corners.map(v=>v.x)))-2),y=Math.max(0,Math.floor(Math.min(...corners.map(v=>v.y)))-2)
    const width=Math.min(c.canvas.width,Math.ceil(Math.max(...corners.map(v=>v.x)))+2)-x,height=Math.min(c.canvas.height,Math.ceil(Math.max(...corners.map(v=>v.y)))+2)-y
    if(width<=0||height<=0)return
    let canvas=scratch.get(c);if(!canvas){canvas=document.createElement('canvas');scratch.set(c,canvas)}
    canvas.width=width;canvas.height=height
    const context=canvas.getContext('2d')!;context.setTransform(m.a,m.b,m.c,m.d,m.e-x,m.f-y)
    paintRoute(context,p,image,undefined,connections,true)
    c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha*=p.opacity;c.drawImage(canvas,x,y);c.restore();return
  }
  c.save()
  try{
    c.globalAlpha*=hitColor||compositing?1:p.opacity;c.lineCap=p.cap;c.lineJoin=p.join;c.miterLimit=2
    const color=hitColor||(p.stroke.kind==='texture'?'#d15a88':p.stroke.color)
    let fill:string|CanvasPattern=color
    if(!hitColor&&p.stroke.kind==='texture'&&image){const pattern=c.createPattern(image,'repeat');if(pattern){pattern.setTransform(new DOMMatrix().translate(-p.x+p.stroke.offset,-p.y).scale(p.stroke.scale));fill=pattern}}
    if(r.kind==='river'){
      const appearance=r.appearance,bank=appearance?.outlineEnabled===false?0:r.bank.width,halo=appearance?.halo
      if(halo?.enabled&&halo.width>0&&halo.opacity>0&&!hitColor){const alpha=c.globalAlpha,passes=halo.softness>0?5:1;for(let i=passes;i>=1;i--){const fraction=(1-halo.softness)+halo.softness*i/passes;riverTrace(c,p,bank+halo.width*fraction);c.fillStyle=halo.color;c.globalAlpha=alpha*(1-Math.pow(1-halo.opacity,1/passes));c.fill()}c.globalAlpha=alpha}
      if(bank&&!hitColor){riverTrace(c,p,bank);c.fillStyle=r.bank.color;c.fill()}
      riverTrace(c,p,hitColor?bank:0);c.fillStyle=fill;c.fill()
    }else if(r.kind==='road'){
      const trace=()=>pathTrace(c,p,p.x,p.y)
      if(p.stroke.kind==='dashed')c.setLineDash([p.stroke.dash,p.stroke.gap])
      if(r.outline.width&&!hitColor){trace();c.lineWidth=p.strokeWidth+2*r.outline.width;c.strokeStyle=r.outline.color;c.stroke()}
      trace();c.lineWidth=p.strokeWidth+(hitColor?2*r.outline.width:0);c.strokeStyle=fill;c.stroke()
      if(r.marking.width&&!hitColor){trace();c.lineWidth=r.marking.width;c.strokeStyle=r.marking.color;c.setLineDash([r.marking.dash,r.marking.gap]);c.stroke()}
    }else{
      c.setLineDash(r.style==='dashed'?[r.dash,r.gap]:r.style==='dotted'?[.01,r.gap]:[])
      if(r.style==='dotted')c.lineCap='round'
      if(r.halo.width&&!hitColor){const alpha=c.globalAlpha;for(const fraction of [1,.65,.3]){borderTrace(c,p);c.lineWidth=p.strokeWidth+2*r.halo.width*fraction;c.strokeStyle=r.halo.color;c.globalAlpha=alpha*.18;c.stroke()}c.globalAlpha=alpha}
      borderTrace(c,p);c.lineWidth=p.strokeWidth;c.strokeStyle=color;c.stroke()
    }
    if(!hitColor&&(r.kind==='river'||r.kind==='road')&&connections.length){
      // Fill the snapped endpoint cap through its own outline. Cross-type crossings never patch.
      c.setLineDash([]);c.fillStyle=fill;c.beginPath()
      for(const n of connections){const first=p.nodes[0],start=Math.hypot(n.x-first.x,n.y-first.y)<.001,radius=routeWidth(p,start?0:1)/2+(r.kind==='river'?(r.appearance?.outlineEnabled===false?0:r.bank.width):r.outline.width);c.moveTo(n.x-p.x+radius,n.y-p.y);c.arc(n.x-p.x,n.y-p.y,radius,0,Math.PI*2)}c.fill()
    }
  }finally{c.restore()}
}
