import { hexCorners } from './hexGrid'
import type { Point } from '../canvas/viewport'

export interface HexSettings { orientation:'flat'|'pointy'; rotation:number; edge:'exact'|'soft'|'rough' }
export const DEFAULT_HEX:HexSettings={orientation:'flat',rotation:0,edge:'exact'}
export const HEX_EDGES={exact:'Exact',soft:'Soft Coast',rough:'Rough Coast'} as const
export const HEX_HELP={exact:'Create a geometric six-sided land shape.',soft:'Keep a clear hex shape with subtle natural coastline variation.',rough:'Keep the overall hex shape with stronger coastline irregularity.'}
export function validateHexSettings(h:HexSettings){
  if(!['flat','pointy'].includes(h.orientation)||!['exact','soft','rough'].includes(h.edge)||!Number.isFinite(h.rotation)||h.rotation<0||h.rotation>360)throw Error('Invalid hexagon settings.')
}
/** Circumscribed (opposite-corner) diameter. Never follows pointer heading or viewport zoom. */
export function hexFootprint(center:Point,diameter:number,settings:HexSettings=DEFAULT_HEX,roughness=.4,softness=.25,smoothing:'off'|'low'|'medium'|'high'='medium',seed=1,anchors?:Point[]):Point[]{
  const radius=diameter/2,corners=anchors??hexCorners(center,diameter,settings.orientation,settings.rotation)
  if(settings.edge==='exact'||roughness===0)return corners
  const smooth={off:0,low:.25,medium:.6,high:.9}[smoothing]
  // Corners are anchors; bounded inward edge displacement preserves the six-sided envelope.
  const amplitude=radius*(settings.edge==='soft'?.035:.11)*roughness*(1-softness*.5)
  return corners.flatMap((a,edge)=>{
    const b=corners[(edge+1)%6],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)
    return Array.from({length:16},(_,i)=>{
      const t=i/16,phase=seed*1.37+edge*2.19
      const low=.5+.5*Math.sin(t*Math.PI*4+phase),high=.5+.5*Math.sin(t*Math.PI*12+phase*1.7)
      const wave=.2+.5*low+.3*(1-smooth)*(1-softness)*high
      const offset=amplitude*Math.sin(Math.PI*t)*wave
      return{x:a.x+dx*t-dy/length*offset,y:a.y+dy*t+dx/length*offset}
    })
  })
}
