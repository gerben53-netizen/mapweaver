import type { OpeningObject, PathObject } from './models'
import { generatedDefinition, generatedPixelsPerFoot } from './generatedWalls'
import type { GeneratedPlacement } from './generatedWallGeometry'
import { pathGeometry, pointAtDistance } from './paths'
import { openingPlacement } from './openings'
import { outsideWall, wallWinding } from './wallAlignment'
import { wallStyle } from './walls'

/** Indexed randomness keeps independent courses and path segments stable under local edits. */
function random(seed: number, index: number) {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad)
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97)
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296
}
export function masonryCourseCount(widthFt: number) { return Math.max(1, Math.ceil(widthFt / .5)) }
/** Transient blocks follow the existing centerline; never persisted as scene objects. */
export function masonryPlacements(path: PathObject, openings: OpeningObject[] = []): GeneratedPlacement[] {
  const g = path.wall!.generated!, definition = generatedDefinition(g), geometry = pathGeometry(path)
  const pixels = generatedPixelsPerFoot(wallStyle(path)), width = path.strokeWidth
  const rows = masonryCourseCount(width / pixels), course = width / rows
  const regularity = g.regularity!, variation = g.variation!, result: GeneratedPlacement[] = []
  const fillers=definition.components.filter(c=>c.role==='block-small')
  const cuts = openings.map(o => openingPlacement(o, path)).sort((a,b) => a.start-b.start)
  const intervals: {start:number;end:number}[] = []
  let start = 0
  for (const cut of cuts) { if (cut.start > start) intervals.push({start,end:cut.start}); start = Math.max(start,cut.end) }
  if (start < geometry.length) intervals.push({start,end:geometry.length})
  // Repack at sharp segment corners, leaving curves continuous. No dedicated corner artwork.
  const breaks = geometry.segments.slice(1).filter(s => {
    const a=pointAtDistance(path, Math.max(0,s.start-.01)).tangent, b=pointAtDistance(path,s.start+.01).tangent
    return a.x*b.x+a.y*b.y < .8
  }).map(s=>s.start)
  const spans = intervals.flatMap(interval => {
    const points=[interval.start,...breaks.filter(d=>d>interval.start&&d<interval.end),interval.end]
    return points.slice(1).map((end,i)=>({start:points[i],end}))
  })
  for (let row=0;row<rows;row++) for (let spanIndex=0;spanIndex<spans.length;spanIndex++) {
    const span=spans[spanIndex], offset=(row+.5)*course-width/2-(outsideWall(path)?width*.5*wallWinding(path):0)
    let d=span.start, index=0, previous=''
    while (d < span.end-.001) {
      const key=row*100003+spanIndex*1009+index*13
      let candidates=definition.components.filter(c=>c.id!==previous)
      if(index===0&&row%2)candidates=candidates.filter(c=>c.role==='block-small')
      let roll=(variation*random(g.seed,key)+(1-variation)*.5)*candidates.reduce((sum,c)=>sum+c.weight,0)
      let component=candidates.find(c=>(roll-=c.weight)<=0) || candidates[candidates.length-1]
      let length=component.nominalLengthFt/component.nominalWidthFt*course*(1+(random(g.seed,key+1)-.5)*variation*.2)
      const remaining=span.end-d
      if(remaining<length){
        const fitting=definition.components.filter(c=>c.nominalLengthFt/c.nominalWidthFt*course<=remaining*1.05)
        component=fitting.length?fitting[fitting.length-1]:fillers[index%fillers.length]
        length=Math.min(component.nominalLengthFt/component.nominalWidthFt*course,remaining)
      }
      length=Math.min(length,remaining)
      const nominal=component.nominalLengthFt/component.nominalWidthFt*course,sourceFraction=Math.min(1,length/nominal)
      const distance=d+length/2, at=pointAtDistance(path,distance)
      const wobble=(1-regularity)*variation
      // Sub-course movement is bounded; block top edges, not an envelope clip, form the silhouette.
      const lateral=offset+(random(g.seed,key+2)-.5)*course*wobble*.08
      const angle=Math.atan2(at.tangent.y,at.tangent.x)+(random(g.seed,key+3)-.5)*wobble*.12
      result.push({component,x:at.point.x-at.tangent.y*lateral,y:at.point.y+at.tangent.x*lateral,width:length*1.02,height:course*1.08,angle,distance,run:row,...(sourceFraction<.8?{sourceFraction}:{})})
      if(result.length>12000)throw Error('Generated wall exceeds 12,000 components. Shorten the wall or increase its width.')
      previous=component.id;d+=length;index++
    }
  }
  // Fill the outer turn with ordinary square filler blocks. Individual alpha edges remain visible.
  for (const distance of [...breaks,...(path.closed?[0]:[])]) {
    if(cuts.some(c=>distance>=c.start-width&&distance<=c.end+width))continue
    const a=pointAtDistance(path,distance===0?geometry.length-.01:distance-.01),b=pointAtDistance(path,distance+.01)
    const turn=Math.atan2(a.tangent.x*b.tangent.y-a.tangent.y*b.tangent.x,a.tangent.x*b.tangent.x+a.tangent.y*b.tangent.y)
    if(Math.abs(turn)<.2)continue
    const at=pointAtDistance(path,distance).point
    for(let row=0;row<rows;row++){
      const offset=(row+.5)*course-width/2-(outsideWall(path)?width*.5*wallWinding(path):0)
      if(offset*turn>=0)continue
      const radius=Math.abs(offset),steps=Math.max(1,Math.ceil(Math.abs(turn)*radius/course))
      const angle0=Math.atan2(a.tangent.x*offset,-a.tangent.y*offset)
      for(let i=0;i<=steps;i++){
        const angle=angle0+turn*i/steps,component=fillers[(row+i)%fillers.length]
        result.push({component,x:at.x+Math.cos(angle)*radius,y:at.y+Math.sin(angle)*radius,width:course*1.08,height:course*1.08,angle:angle+Math.PI/2,distance,run:row})
        if(result.length>12000)throw Error('Generated wall exceeds 12,000 components. Shorten the wall or increase its width.')
      }
    }
  }
  return result
}
