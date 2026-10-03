import { paintContinuousWall } from './drawContinuousWall'
import type { WallConnection } from '../domain/walls'
import type { PathObject } from '../domain/models'
import { materialPieces } from '../domain/wallMaterialGeometry'
import { pathTrace } from './drawPath'
function stripMesh(c:CanvasRenderingContext2D,path:PathObject,image:CanvasImageSource,p:ReturnType<typeof materialPieces>[number],hitColor?:string){
  const q=p.quad!.map(v=>({x:v.x-path.x,y:v.y-path.y})),a=p.art,w=p.sourceWidth,h=a.height
  if(hitColor){
    const y0=Math.min(...a.hull.map(v=>v.y))/h,y1=Math.max(...a.hull.map(v=>v.y))/h
    const interpolate=(i:number,j:number,t:number)=>({x:q[i].x+(q[j].x-q[i].x)*t,y:q[i].y+(q[j].y-q[i].y)*t})
    const points=[interpolate(0,3,y0),interpolate(1,2,y0),interpolate(1,2,y1),interpolate(0,3,y1)]
    c.fillStyle=hitColor;c.beginPath();points.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.fill();return
  }
  for(const second of [false,true]){
    const points=second?[q[1],q[2],q[3]]:[q[0],q[1],q[3]]
    const orientation=Math.sign((points[1].x-points[0].x)*(points[2].y-points[0].y)-(points[1].y-points[0].y)*(points[2].x-points[0].x))||1
    c.save();c.beginPath();points.forEach((v,i)=>{
      const prev=points[(i+2)%3],next=points[(i+1)%3],a={x:v.x-prev.x,y:v.y-prev.y},b={x:next.x-v.x,y:next.y-v.y},al=Math.hypot(a.x,a.y)||1,bl=Math.hypot(b.x,b.y)||1
      const n={x:orientation*(a.y/al+b.y/bl),y:-orientation*(a.x/al+b.x/bl)},denom=orientation*(n.x*a.y-n.y*a.x)/al,k=Math.min(6,1.25/Math.max(.01,denom))
      if(i)c.lineTo(v.x+n.x*k,v.y+n.y*k);else c.moveTo(v.x+n.x*k,v.y+n.y*k)
    });c.closePath();c.clip()
    const x=second?{x:(q[2].x-q[3].x)/w,y:(q[2].y-q[3].y)/w}:{x:(q[1].x-q[0].x)/w,y:(q[1].y-q[0].y)/w}
    const y=second?{x:(q[2].x-q[1].x)/h,y:(q[2].y-q[1].y)/h}:{x:(q[3].x-q[0].x)/h,y:(q[3].y-q[0].y)/h}
    c.transform(x.x,x.y,y.x,y.y,second?q[1].x-x.x*w:q[0].x,second?q[1].y-x.y*w:q[0].y)
    c.drawImage(image,a.rect.x+p.sourceX,a.rect.y,w,h,-1.5,0,w+3,h);c.restore()
  }
}
export function paintWallMaterial(c:CanvasRenderingContext2D,path:PathObject,image:CanvasImageSource,connections:WallConnection[]=[],hitColor?:string) {
  if(path.wall?.material?.set.continuous)return paintContinuousWall(c,path,image,connections,hitColor)
  const set=path.wall!.material!.set
  // The opaque underlay is deliberately narrower than the guaranteed solid core.
  c.strokeStyle=hitColor||set.coreColor;c.lineWidth=path.strokeWidth*.65;c.lineJoin='round';c.lineCap='round'
  pathTrace(c,path,path.x,path.y);c.stroke()
  const pieces=materialPieces(path)
  const patch=set.join||set.cap||set.bodyVariants[0]
  const all:ReturnType<typeof materialPieces>=[...pieces,...connections.map(p=>({art:patch,x:p.x,y:p.y,angle:0,scale:path.strokeWidth/set.nominalWidthPx,sourceX:0,sourceWidth:patch.width,anchorX:patch.anchor.x,lateral:0}))]
  for(const p of all){if(p.quad){stripMesh(c,path,image,p,hitColor);continue}const a=p.art;c.save();c.translate(p.x-path.x,p.y-path.y);c.rotate(p.angle);c.scale(p.scale,p.scale)
    if(hitColor){
      c.fillStyle=hitColor;c.beginPath()
      // Alpha-derived convex silhouette avoids treating transparent image margins as solid.
      for(let i=0;i<a.hull.length;i++){const v=a.hull[i],x=Math.max(p.sourceX,Math.min(p.sourceX+p.sourceWidth,v.x))-p.sourceX-p.anchorX,y=v.y-a.anchor.y+p.lateral;if(i)c.lineTo(x,y);else c.moveTo(x,y)}c.closePath();c.fill()
    } else c.drawImage(image,a.rect.x+p.sourceX,a.rect.y,Math.min(p.sourceWidth,a.width-p.sourceX),a.height,-p.anchorX,-a.anchor.y+p.lateral,p.sourceWidth,a.height)
    c.restore()
  }
}
