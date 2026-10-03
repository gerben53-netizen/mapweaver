import type { MapDocument, MapObject } from '../domain/models'
import { contourGeometry } from '../domain/coastalContours'
export function paintCoastalContours(c:CanvasRenderingContext2D,map:MapDocument,objects:MapObject[]){
 const s=map.coastalContours;if(!s?.enabled||!s.count||!s.opacity)return
 const {geometry,lines}=contourGeometry(map,objects)
 c.save();c.beginPath();for(const polygon of geometry)for(const ring of polygon){ring.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath()}c.clip('evenodd');c.strokeStyle=s.color;c.lineWidth=s.width;c.lineCap='round'
 const alpha=c.globalAlpha
 lines.forEach((segments,n)=>{c.globalAlpha=alpha*s.opacity*(1-s.falloff)**n;c.beginPath();for(const [a,b] of segments){c.moveTo(a.x,a.y);c.lineTo(b.x,b.y)}c.stroke()});c.restore()
}
