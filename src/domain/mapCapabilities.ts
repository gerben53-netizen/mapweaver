import type { MapType } from './geography'
export type EditorTool = 'environmentalDetail'|'ceiling'|'textureBrush'|'waterDepth'|'landBrush'|'terrainBrush'|'select'|'placeStamp'|'patternFill'|'scatter'|'path'|'route'|'area'|'wall'|'opening'|'measure'|'place'|'label'|'legend'|'compass'|'scaleBar'|'title'|'infoPanel'|'editArea'|'editPath'
const common: readonly EditorTool[] = ['environmentalDetail','select','placeStamp','scatter','path','area','place','label','legend','compass','scaleBar','title','infoPanel','editArea','editPath']
/** Creation context only. Existing artwork and property editors never depend on this matrix. */
export const MAP_TYPE_CAPABILITIES: Record<MapType,{tools:readonly EditorTool[]; geographicAreas:boolean; rooms:boolean}> = {
 battlemap:{tools:[...common,'wall','opening','ceiling','textureBrush'],geographicAreas:false,rooms:true},
 'regional-map':{tools:[...common,'route','measure','terrainBrush','landBrush','waterDepth'],geographicAreas:true,rooms:false},
 'world-map':{tools:[...common,'route','measure','terrainBrush','landBrush','waterDepth'],geographicAreas:true,rooms:false},
}
export const mapCapabilities = (type:MapType='battlemap') => MAP_TYPE_CAPABILITIES[type]
export const canCreateWithTool = (type:MapType|undefined,tool:EditorTool) => mapCapabilities(type).tools.includes(tool)
export const assetAppliesToMap = (types:readonly string[]|undefined,type:MapType='battlemap') => !types?.length || types.includes(type)
