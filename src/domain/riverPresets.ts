import type { RouteStyle } from './routes'
import type { PathObject } from './models'
import { defaultRiverAppearance } from './riverAppearance'
export const RIVER_PRESETS={
 minimalRiver:{name:'Minimal River',color:'#628b9b',outline:'#426778',bank:0,halo:'#abc8cf',glow:0,opacity:1,smoothing:'low'},
 fantasyRiver:{name:'Fantasy River',color:'#78b5c4',outline:'#467487',bank:.6,halo:'#b7d5cf',glow:3,opacity:1,smoothing:'medium'},
 parchmentRiver:{name:'Parchment River',color:'#65878c',outline:'#576969',bank:.8,halo:'#dbcda4',glow:1.5,opacity:.92,smoothing:'medium'},
 brightWater:{name:'Bright Water',color:'#91d5e2',outline:'#518795',bank:.6,halo:'#c9eef1',glow:4,opacity:1,smoothing:'medium'},
 darkWater:{name:'Dark Water',color:'#345a70',outline:'#243d4f',bank:.8,halo:'#6c949e',glow:2,opacity:1,smoothing:'low'},
} as const
export type RiverPresetId=keyof typeof RIVER_PRESETS
export function riverPreset(id:RiverPresetId,endWidth=8):RouteStyle {
 const p=RIVER_PRESETS[id];if(!p)throw Error('Unknown river preset.')
 return {opacity:p.opacity,stroke:{kind:'solid',color:p.color},strokeWidth:endWidth,cap:'round',join:'round',route:{kind:'river',unit:'px',pixelsPerUnit:1,preset:id,startWidth:Math.max(.1,endWidth*.25),endWidth,startFactor:1,endFactor:1,bank:{color:p.outline,width:p.bank},appearance:{...defaultRiverAppearance(),widthMode:'downstream',smoothing:p.smoothing,outlineEnabled:p.bank>0,halo:{enabled:p.glow>0,color:p.halo,width:p.glow,opacity:.18,softness:.75}}}}
}
export function applyRiverPreset(p:PathObject,id:RiverPresetId):PathObject {
 if(p.route?.kind!=='river')throw Error('Choose a river.')
 const s=riverPreset(id,p.route.endWidth*p.route.endFactor||p.strokeWidth)
 return {...p,...s,route:{...s.route,unit:p.route.unit,pixelsPerUnit:p.route.pixelsPerUnit}}
}
