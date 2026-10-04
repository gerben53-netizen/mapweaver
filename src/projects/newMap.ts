import { defaultMapStyle, normalizeMapSettings } from '../domain/mapSettings'
import { defaultGeography, landLayers, type MapType } from '../domain/geography'
import { createLayeredContent } from '../domain/layers'
import { flatLayerTree } from '../domain/grouping'
import { applyWorldTheme } from '../domain/applyWorldTheme'
import type { ProjectSnapshot } from '../store/history'

/** Prepare the complete initial state before persistence or opening the editor. */
export function newMapSnapshot(width:number,height:number,backgroundColor:string,mapType:MapType,widthKm?:number,themeId=''):ProjectSnapshot {
  const content=mapType==='battlemap'?createLayeredContent():{objects:[],layers:landLayers()}
  const geography=defaultGeography(mapType);if(widthKm!==undefined)geography.widthKm=widthKm
  const snapshot:ProjectSnapshot={map:{...normalizeMapSettings({width,height,backgroundColor,grid:{...defaultMapStyle().grid,visible:mapType==='battlemap'},mapType,geography}),background:null,ceilingExposure:'explicit'},...content,objectGroups:[],layerTree:flatLayerTree(content.layers)}
  return themeId?applyWorldTheme(snapshot,themeId,{reset:true,elements:true,assets:false}).snapshot:snapshot
}

export interface NewMapDraft { name:string; width:string; height:string; color:string; mapType:MapType; widthKm:string; themeId:string; startingPoint:'blank'|'generate' }
export const initialMapDraft:NewMapDraft={name:'Untitled map',width:'1600',height:'1000',color:'#d7d7cf',mapType:'battlemap',widthKm:'1000',themeId:'',startingPoint:'blank'}
