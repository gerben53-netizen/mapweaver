import { applyLandStroke, defaultLandBrush } from '../../src/domain/landBrush'
import { DEFAULT_HEX } from '../../src/domain/hexLandShape'
import { createArea, rectangleGeometry } from '../../src/domain/areas'
import { defaultMapStyle } from '../../src/domain/mapSettings'
import { defaultGeography } from '../../src/domain/geography'
import { semanticTerrain } from '../../src/domain/terrainIntent'
import { waterAppearance } from '../../src/domain/terrainStyles'
import { waterDepthPreset } from '../../src/domain/waterDepth'
import { parseProject } from '../../src/projects/format'
import type { AreaObject } from '../../src/domain/models'

export function hexLandStudy(){
  const size={width:1200,height:800},objects:AreaObject[]=[]
  for(const [row,orientation] of (['flat','pointy'] as const).entries())for(const [col,edge] of (['exact','soft','rough'] as const).entries()){
    const name=`${orientation}-${edge}`,center={x:250+col*350,y:230+row*330}
    const result=applyLandStroke({lands:[],editable:[],map:size,brush:{...defaultLandBrush,shape:'hexagon',size:260,roughness:1,softness:0,smoothing:'low',hex:{...DEFAULT_HEX,orientation,edge}},points:[center],seed:1,newId:name})
    objects.push({...result.added[0],name})
  }
  // One deliberately oversize semantic region demonstrates shared land clipping.
  const terrain=createArea(rectangleGeometry({x:0,y:0,...size}));terrain.land=semanticTerrain('forest',1200);terrain.name='Forest clipped to hex land';objects.push(terrain)
  const map={...defaultMapStyle(),...size,background:null,mapType:'world-map' as const,geography:defaultGeography('world-map'),water:waterAppearance('deep'),waterDepth:{...waterDepthPreset(),shelf:35},landEditing:{version:1,manual:true,revision:1}}
  map.grid.visible=false
  return parseProject({formatVersion:12,id:'hex-land-study',name:'Hex Land Study',createdAt:'2026-09-26T00:00:00.000Z',modifiedAt:'2026-09-26T00:00:00.000Z',map,objects,layers:[{id:'objects',name:'Geography',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]})
}
