import { emptyTexturePaint, validateTexturePaint } from '../domain/terrainPaint'
import { EDITABLE_JSON_BYTES } from '../domain/documentLimits'
import { resourcesFit } from '../projects/assets'
import { referencedAssets } from '../projects/format'
import { history } from './history'
import { useProjectStore } from './projectStore'
import { emptyTerrainPaint, validateTerrainPaint, type TerrainPaint } from '../domain/terrainPaint'

export function commitTerrainPaint(paint:TerrainPaint, expected:TerrainPaint|undefined,label:string){
  if(useProjectStore.getState().map.terrainPaint!==expected)throw Error('Terrain paint changed while painting. Try the stroke again.')
  validateTerrainPaint(paint)
  history.run(label,()=>useProjectStore.setState(s=>({map:{...s.map,terrainPaint:paint}})))
}
export function changeTerrainPaint(patch:Partial<Pick<TerrainPaint,'visible'|'locked'|'opacity'>>){
  const before=useProjectStore.getState().map.terrainPaint
  commitTerrainPaint({...before||emptyTerrainPaint(),...patch},before,'Change terrain paint layer')
}

export function commitTexturePaint(paint:TerrainPaint,expected:TerrainPaint|undefined,label:string){
  const state=useProjectStore.getState()
  if(state.map.texturePaint!==expected)throw Error('Texture paint changed. Try the stroke again.')
  validateTexturePaint(paint)
  const map={...state.map,texturePaint:paint}
  if(!resourcesFit(new Set([...referencedAssets({...state,map})])))throw Error('Texture materials exceed the project image budget.')
  if(new TextEncoder().encode(JSON.stringify({map,objects:state.objects,layers:state.layers,objectGroups:state.objectGroups,layerTree:state.layerTree})).length>EDITABLE_JSON_BYTES)throw Error('Paint exceeds the editable document budget. Erase unused paint first.')
  history.run(label,()=>useProjectStore.setState({map}))
}
export function changeTexturePaint(patch:Partial<Pick<TerrainPaint,'visible'|'locked'|'opacity'>>){
  const before=useProjectStore.getState().map.texturePaint
  commitTexturePaint({...before||emptyTexturePaint(),...patch},before,'Change texture paint layer')
}
