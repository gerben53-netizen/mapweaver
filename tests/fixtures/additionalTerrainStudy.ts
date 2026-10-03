import { PREMIUM_TERRAIN, premiumBrushPreset } from '../../src/domain/premiumTerrain'
import { TerrainStroke, defaultTerrainBrush } from '../../src/domain/terrainBrush'
import { defaultMapStyle } from '../../src/domain/mapSettings'
import { defaultGeography } from '../../src/domain/geography'
import { createLabel, restyleLabel } from '../../src/domain/annotations'
import { parseProject } from '../../src/projects/format'
import type { TerrainPaint } from '../../src/domain/terrainPaint'

/** An independent editable material board; source maps are never modified. */
export function additionalTerrainStudy(){
 const map={...defaultMapStyle(),width:1600,height:1440,background:null,mapType:'regional-map' as const,geography:defaultGeography('regional-map')}
 map.grid.visible=false;map.backgroundColor='#c8c1a8';map.geography.scaleBar=false
 let terrainPaint:TerrainPaint|undefined
 const objects=PREMIUM_TERRAIN.slice(14).map((t,i)=>{
  const x=270+(i%3)*530,y=130+Math.floor(i/3)*230
  const stroke=new TerrainStroke(terrainPaint,{...defaultTerrainBrush,...premiumBrushPreset(t.id),size:190,softness:.55,strength:.85},map)
  stroke.add({x:x-125,y});stroke.add({x:x+125,y});terrainPaint=stroke.finish()
  const label=createLabel({x,y:y+91},t.title),styled=restyleLabel(label,{...label.style,size:20,maxWidth:460,strokeWidth:0,backgroundOpacity:.85,padding:5})
  return {...styled,id:'material-'+i,x:x-styled.width/2,y:y+95}
 })
 return parseProject({formatVersion:12,id:'additional-terrain-study',name:'Additional Terrain Materials',createdAt:'2026-09-26T00:00:00.000Z',modifiedAt:'2026-09-26T00:00:00.000Z',map:{...map,terrainPaint},objects,layers:[{id:'objects',name:'Material labels',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]})
}
