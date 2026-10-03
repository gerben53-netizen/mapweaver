import type { OpeningObject, PathObject } from '../domain/models'
import { openingCutout, openingPlacement } from '../domain/openings'

export function clipWallOpenings(c: CanvasRenderingContext2D, wall: PathObject, openings: OpeningObject[], hitExtra = 0) {
  if (!openings.length) return
  const margin = wall.strokeWidth * 3 + 512 + hitExtra
  for (const o of openings) {
    // Intersect exclusions separately: adjacent curved gaps must never XOR-fill each other.
    c.beginPath()
    c.rect(-margin,-margin,wall.width+margin*2,wall.height+margin*2)
    const points = openingCutout(o,wall,hitExtra)
    c.moveTo(points[0].x-wall.x,points[0].y-wall.y)
    for (const p of points.slice(1)) c.lineTo(p.x-wall.x,p.y-wall.y)
    c.closePath()
    c.clip('evenodd')
  }
}
export function paintOpening(c: CanvasRenderingContext2D, o: OpeningObject, wall: PathObject, image?: CanvasImageSource) {
  const {point,tangent}=openingPlacement(o,wall), w=o.openingWidth, depth=wall.strokeWidth, half=w/2
  c.save()
  try {
    c.translate(point.x-o.x,point.y-o.y);c.rotate(Math.atan2(tangent.y,tangent.x));c.scale(o.flip?-1:1,o.side)
    c.globalAlpha*=o.opacity;c.strokeStyle='#302e29';c.fillStyle='#d6c5a3';c.lineWidth=Math.max(1.5,Math.min(4,depth/10));c.lineCap='butt'
    if(image){c.drawImage(image,-half,-depth/2,w,depth);return}
    if(o.kind==='window'){
      c.fillStyle='#b4d8df';c.fillRect(-half,-depth/2,w,depth);c.strokeRect(-half,-depth/2,w,depth)
      c.beginPath();c.moveTo(-half,0);c.lineTo(half,0)
      if(o.windowType==='wide'){c.moveTo(0,-depth/2);c.lineTo(0,depth/2)}c.stroke();return
    }
    // Jambs retain a readable symbol even for an open passage.
    c.beginPath();for(const x of [-half,half]){c.moveTo(x,-depth/2);c.lineTo(x,depth/2)}c.stroke()
    if(o.doorType==='passage')return
    const leaves=o.doorType==='double'?2:1,leaf=w/leaves
    for(let i=0;i<leaves;i++){
      const fromRight=leaves===2?i===1:o.status==='open-right', hinge=fromRight?half:-half, sign=fromRight?-1:1
      c.save();c.translate(hinge,0);c.scale(sign,1)
      if(o.status==='closed'){c.fillRect(0,-2,leaf,4);c.strokeRect(0,-2,leaf,4)}
      else{c.fillRect(-2,0,4,leaf);c.strokeRect(-2,0,4,leaf);c.save();c.lineWidth=1;c.setLineDash([4,3]);c.beginPath();c.arc(0,0,leaf,0,Math.PI/2);c.stroke();c.restore()}
      c.restore()
    }
  }finally{c.restore()}
}
