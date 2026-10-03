import { createArea } from '../../src/domain/areas'
import { defaultLandArea } from '../../src/domain/landAreas'
import { terrainAppearance } from '../../src/domain/terrainStyles'
import { createPath } from '../../src/domain/paths'
import { createRoute, routePreset } from '../../src/domain/routes'
import { defaultMapStyle } from '../../src/domain/mapSettings'
import { defaultGeography } from '../../src/domain/geography'
import { parseProject } from '../../src/projects/format'

/** Representative pre-consolidation object shapes; no new UX helpers or schema. */
export function toolIntentFixture() {
  const rect = (x:number,y:number,w:number,h:number) => createArea({polygons:[{outer:[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}],holes:[]}]},{kind:'solid',color:'#c6bd94'})
  const land=rect(80,90,600,470);land.name='Existing landmass';land.land=defaultLandArea('landmass')
  const biome=rect(180,180,200,150);biome.name='Existing forest';biome.land={...defaultLandArea('terrain-region'),terrain:'forest',appearance:terrainAppearance('forest',1000)}
  const area=rect(450,200,100,90);area.name='Existing generic zone';area.fill={kind:'none'};area.strokeWidth=2
  const nodes=(y:number)=>[{id:crypto.randomUUID(),x:120,y,mode:'corner' as const},{id:crypto.randomUUID(),x:300,y:y+30,mode:'corner' as const},{id:crypto.randomUUID(),x:570,y:y-10,mode:'corner' as const}]
  const path=createPath(nodes(490),false,4,{kind:'solid',color:'#865930'})
  const river=createRoute(nodes(410),false,routePreset('river'))
  const road=createRoute(nodes(360),false,routePreset('road','trail'))
  const border=createRoute(nodes(130),false,routePreset('border'))
  const objects=[land,biome,area,path,river,road,border]
  return parseProject({formatVersion:12,id:'tool-intent-fixture',name:'Tool intent compatibility',createdAt:'2026-09-26T00:00:00.000Z',modifiedAt:'2026-09-26T00:00:00.000Z',map:{width:1000,height:700,background:null,...defaultMapStyle(),mapType:'world-map',geography:defaultGeography('world-map')},objects,layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]})
}
