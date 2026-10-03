import { withPathGeometry } from '../../src/domain/paths'
import { createArea } from '../../src/domain/areas'
import { createRoute, routePreset } from '../../src/domain/routes'
import { defaultMapStyle } from '../../src/domain/mapSettings'
import { defaultGeography } from '../../src/domain/geography'
import { defaultLandArea } from '../../src/domain/landAreas'
import { terrainAppearance, waterAppearance } from '../../src/domain/terrainStyles'
import { waterDepthPreset, waterStroke, defaultWaterDepthBrush } from '../../src/domain/waterDepth'
import { waterContains, waterGeometry } from '../../src/domain/waterGeometry'
import type { ProjectSnapshot } from '../../src/store/history'
const ring=(points:number[][])=>points.map(([x,y])=>({x,y}))
export function waterDepthStudy(painted=false):ProjectSnapshot {
 const outer=ring([[0,0],[880,0],[860,100],[720,160],[650,220],[620,320],[750,390],[880,380],[960,440],[900,520],[790,565],[760,660],[820,735],[700,835],[710,1000],[0,1000]])
 const lake=ring([[260,650],[320,610],[410,620],[480,690],[460,775],[370,805],[280,765]])
 const continent={...createArea({polygons:[{outer,holes:[lake]}]}),id:'study-continent',name:'Continent',land:{...defaultLandArea('landmass'),appearance:{...terrainAppearance('grassland'),coast:'fantasy' as const,feather:0}}}
 const island={...createArea({polygons:[{outer:ring([[1120,190],[1220,160],[1290,220],[1250,320],[1180,350],[1110,280]]),holes:[]}]}),id:'study-island',name:'Island',land:{...defaultLandArea('landmass'),appearance:{...terrainAppearance('rocky'),coast:'fantasy' as const,feather:0}}}
 const river=(id:string,pts:number[][],width:number)=>{const p=createRoute(ring(pts).map((p,i)=>({...p,id:id+i,mode:'corner' as const})),false,routePreset('river'));return withPathGeometry({...p,id,route:p.route?.kind==='river'?{...p.route,startWidth:width*.3,endWidth:width,bank:{color:'#477b89',width:1}}:p.route})}
 const objects=[continent,island,river('study-river',[[290,180],[390,210],[455,260],[540,282],[650,325]],18),river('study-lake-river',[[110,575],[170,605],[210,650],[273,693]],5)]
 const map:ProjectSnapshot['map']={...defaultMapStyle(),width:1600,height:1000,background:null,mapType:'world-map',geography:defaultGeography('world-map'),water:waterAppearance('deep')};map.grid.visible=false
 if(painted){map.waterDepth=waterDepthPreset('deep');const stroke=waterStroke(undefined,{...defaultWaterDepthBrush,size:210,strength:.55},map,waterContains(waterGeometry(map,objects)));stroke.add({x:1080,y:700});stroke.add({x:1250,y:740});map.waterDepth.paint=stroke.finish()}
 return {map,objects,layers:[{id:'study-layer',name:'Geography',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:null}
}
