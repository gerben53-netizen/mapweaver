import { riverPreset } from '../domain/riverPresets'
import { withPathGeometry } from '../domain/paths'
import { terrainAppearance, waterAppearance } from '../domain/terrainStyles'
import type { TerrainStyleId } from '../domain/terrainStyles'
import type { WorldResult } from './model'
/** Optional post-generation appearance v1. The world-v1 geography algorithm is unchanged. */
export function styleWorld(result: WorldResult): WorldResult {
  const water = waterAppearance('calm')
  const styles: Record<string,TerrainStyleId> = { Landmass:'land', Upland:'grassland', Hills:'rocky', Desert:'desert', Tundra:'tundra', Wetland:'swamp', Mountains:'rocky', Alpine:'snow', Forest:'forest', 'Dense forest':'forest', Lake:'shallow' }
  return {...result,map:{...result.map,water},objects:result.objects.map(o=>{
    if(o.kind==='path'&&o.pathKind==='river') {const style=riverPreset('fantasyRiver',result.map.width/600);return withPathGeometry({...o,...style,...(result.map.generation?.generatorVersion===2&&o.route?.kind==='river'&&style.route?.kind==='river'?{route:{...style.route,startWidth:o.route.startWidth,endWidth:o.route.endWidth,startFactor:1,endFactor:1}}:{})})}
    if(o.kind!=='area'||!o.land) return o
    const appearance = terrainAppearance(styles[o.name]??'land',result.map.width)
    if(o.land.role==='landmass') { appearance.coast='fantasy';appearance.feather=0 }
    if(o.name==='Lake') appearance.feather=Math.min(3,result.map.width/800)
    return {...o,land:{...o.land,appearance}}
  })}
}
