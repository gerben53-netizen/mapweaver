import { mapWorkspace,scaleBar,pixelsPerKm } from '../domain/geography'
import type { MapDocument } from '../domain/models'
export function drawGeographicGrid(c:CanvasRenderingContext2D,map:MapDocument,zoom:number) {
  const g=mapWorkspace(map).geography,bar=scaleBar(map,zoom,120),step=bar.pixels/zoom
  // Local fictional coordinates, not geographic longitude/latitude.
  c.save();c.beginPath();c.rect(0,0,map.width,map.height);c.clip();c.strokeStyle='#788d94';c.globalAlpha=.35;c.lineWidth=1/zoom
  const origin=g.origin??{xKm:0,yKm:0},px=pixelsPerKm(map)
  for(const [axis,length,offset] of [['x',map.width,origin.xKm*px],['y',map.height,origin.yKm*px]] as const){const start=(((-offset)%step)+step)%step;for(let n=start,count=0;n<=length&&count<256;n+=step,count++){c.beginPath();if(axis==='x'){c.moveTo(n,0);c.lineTo(n,map.height)}else{c.moveTo(0,n);c.lineTo(map.width,n)}c.stroke()}}
  c.restore()
}
export function drawScaleBar(c:CanvasRenderingContext2D,map:MapDocument) {
  const size=Math.min(1,map.width/260,map.height/90),bar=scaleBar(map,1,160*size),x=20*size,y=map.height-28*size
  c.save();c.fillStyle='#f3f3e9';c.fillRect(x-8*size,y-23*size,bar.pixels+16*size,40*size);c.fillStyle='#1e292c';c.strokeStyle='#1e292c';c.lineWidth=2*size;c.font=`${12*size}px sans-serif`;c.fillText(bar.label,x,y-6*size);c.beginPath();c.moveTo(x,y-3*size);c.lineTo(x,y+4*size);c.lineTo(x+bar.pixels,y+4*size);c.lineTo(x+bar.pixels,y-3*size);c.stroke();c.restore()
}
