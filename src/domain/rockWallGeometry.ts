import type { OpeningObject, PathObject } from './models'
import { generatedDefinition, generatedPixelsPerFoot } from './generatedWalls'
import type { GeneratedPlacement } from './generatedWallGeometry'
import { pathGeometry, pointAtDistance } from './paths'
import { openingPlacement } from './openings'
import { outsideWall, wallWinding } from './wallAlignment'
import { wallStyle } from './walls'

function random(seed: number, key: number) {
  let x = (seed ^ Math.imul(key + 1, 0x9e3779b1)) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad)
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97)
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296
}
/** Dense overlapping opaque rock cores, not longitudinal masonry courses. */
export function rockPlacements(path: PathObject, openings: OpeningObject[] = []): GeneratedPlacement[] {
  const recipe = path.wall!.generated!, definition = generatedDefinition(recipe)
  const geometry = pathGeometry(path), width = path.strokeWidth, pixels = generatedPixelsPerFoot(wallStyle(path))
  const columns = Math.max(1, Math.ceil(width / pixels))
  const diameter = width / columns * 1.6, step = diameter * .3
  const result: GeneratedPlacement[] = [], cuts = openings.map(o => openingPlacement(o, path)).sort((a,b) => a.start-b.start)
  const intervals: {start: number; end: number}[] = []
  let start = 0
  for (const cut of cuts) { if (cut.start > start) intervals.push({start,end:cut.start}); start = Math.max(start,cut.end) }
  if (start < geometry.length) intervals.push({start,end:geometry.length})
  const add = (distance: number, lateral: number, size: number, key: number, detail = false) => {
    const candidates = definition.components.filter(c => c.role === (detail ? 'rock-small' : size > pixels ? 'rock-large' : 'rock-medium'))
    let roll = (random(recipe.seed,key)*recipe.variation!+.5*(1-recipe.variation!)) * candidates.reduce((n,c) => n+c.weight,0)
    const component = candidates.find(c => (roll -= c.weight) <= 0) || candidates[candidates.length-1]
    const at = pointAtDistance(path,distance), offset = lateral - (outsideWall(path) ? width*.5*wallWinding(path) : 0)
    result.push({component,x:at.point.x-at.tangent.y*offset,y:at.point.y+at.tangent.x*offset,width:size*(component.nominalLengthFt/component.nominalWidthFt),height:size,angle:Math.atan2(at.tangent.y,at.tangent.x)+random(recipe.seed,key+1)*Math.PI*2*recipe.variation!,distance,run:0})
    if (result.length > 12000) throw Error('Generated wall exceeds 12,000 components. Shorten the wall or increase its width.')
  }
  for (const interval of intervals) {
    const span = interval.end-interval.start, size = Math.min(diameter,span)
    const loop = path.closed && !cuts.length
    const from = interval.start+(loop ? 0 : size*.5), to = interval.end-(loop ? 0 : size*.5)
    const count = Math.max(1,Math.ceil((to-from)/step))
    // Predict before allocation; indexed samples preserve earlier spans under local edits.
    if ((count+1)*columns*3+result.length > 12000) throw Error('Generated wall exceeds component budget.')
    for (let i=0;i<=count;i++) {
      const distance = Math.min(to,from+i*step), key = Math.round(interval.start)*1009+i*197
      for (let j=0;j<columns;j++) {
        const index = key+j*100003, variation = recipe.variation!, roughness = recipe.roughness!
        const offset = (j-(columns-1)/2)*width/columns+(random(recipe.seed,index+2)-.5)*size*.04*variation
        const scale = 1+(random(recipe.seed,index+3)-.5)*variation*.08
        add(distance,offset,size*scale,index)
        // Edge masses overlap the core by construction. No disconnected detail stones.
        if (i%2===j%2) {
          const side = random(recipe.seed,index+4)<.5 ? -1 : 1
          const edge = offset+side*size*(.12+.1*roughness)
          add(distance,edge,size*(.65+.15*roughness),index+700000,true)
        }
      }
    }
    // Scatter ordinary surface masses across the covered band. They bridge the
    // coverage lattice so wide walls do not read as several parallel courses.
    for (let i=0;i<=count;i++) {
      const key = Math.round(interval.start)*1009+i*197+900001
      const distance = Math.max(from,Math.min(to,from+(i+(random(recipe.seed,key)-.5)*recipe.variation!*.5)*step))
      const lateral = (random(recipe.seed,key+1)*2-1)*Math.max(0,width*.45-size*.25)
      add(distance,lateral,size*(.72+.25*random(recipe.seed,key+2)*recipe.variation!),key+3)
    }
    // Ordinary masses round abrupt turns and closed seams; no dedicated corner sprite.
    const joints = [...geometry.segments.slice(1).map(s => s.start),...(loop ? [0] : [])]
    for (const d of joints) {
      if (d < interval.start || d > interval.end) continue
      const a = pointAtDistance(path,d===0 ? geometry.length-.01 : d-.01).tangent, b = pointAtDistance(path,d+.01).tangent
      if (a.x*b.x+a.y*b.y>.8) continue
      const radius = Math.max(0,width*.5-size*.35)
      const rings = Math.ceil(radius/(size*.3))
      for (let ring=0;ring<=rings;ring++) {
        const r = rings ? radius*ring/rings : 0, n = Math.max(1,Math.ceil(2*Math.PI*r/(size*.3)))
        for (let k=0;k<n;k++) {
          const angle = k/n*Math.PI*2
          add(d,0,size,Math.round(d)*139+ring*17+k)
          const p = result[result.length-1]
          p.x += Math.cos(angle)*r; p.y += Math.sin(angle)*r
        }
      }
    }
  }
  return result
}
