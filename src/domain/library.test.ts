import {parseProject} from '../projects/format'
import { describe,it,expect } from 'vitest'
import { resolvePlacementSize } from './placement'
import { defaultMapStyle } from './mapSettings'
import { defaultGeography } from './geography'
import { validateDefaultSize } from './library'
import type { AssetSizing } from './assetSizing'
const map={mapType:'battlemap' as const,geography:defaultGeography('battlemap'),width:1600,height:1000,background:null,...defaultMapStyle()}
const sizing:AssetSizing={sizingMode:'grid',defaultWidth:2,defaultHeight:1,sizingUnit:'cells',aspectRatioLocked:false,sizingScope:'any'}
const asset={naturalWidth:400,naturalHeight:200,sizing}
describe('shared asset default resolver',()=>{
 it('resolves grid sizes independent of natural pixels and viewport',()=>{expect(resolvePlacementSize(asset,{...map,grid:{...map.grid,cellSize:50}})).toEqual({width:100,height:50})})
 it('converts 10 feet at 5 feet per cell to 100 pixels',()=>{expect(resolvePlacementSize({...asset,sizing:{...sizing,sizingMode:'world',defaultWidth:10,defaultHeight:5,sizingUnit:'ft'}},{...map,grid:{...map.grid,cellSize:50,physicalScale:{distancePerCell:5,unit:'ft'}}})).toEqual({width:100,height:50})})
 it('converts feet/metres on geographic maps and explains missing scale',()=>{const world={...map,mapType:'regional-map' as const,geography:{...defaultGeography('regional-map'),widthKm:1.6}};expect(resolvePlacementSize({...asset,sizing:{...sizing,sizingMode:'world',defaultWidth:10,defaultHeight:5,sizingUnit:'ft'}},world).width).toBeCloseTo(3.048);expect(resolvePlacementSize({...asset,sizing:{...sizing,sizingMode:'world'}},map).reason).toMatch(/physical/);expect(resolvePlacementSize({...asset,sizing:{...sizing,sizingScope:'world-map'}},map).reason).toMatch(/map type/)})
 it('rejects nonfinite sizes and conflicting aspect locked dimensions',()=>{expect(()=>validateDefaultSize({mode:'grid',width:Infinity,height:1,unit:'cells',lockAspectRatio:false})).toThrow();expect(()=>validateDefaultSize({mode:'grid',width:1,height:1,unit:'cells',lockAspectRatio:true},2)).toThrow(/aspect/);expect(validateDefaultSize({mode:'grid',width:2,height:1,unit:'cells',lockAspectRatio:true},2).width).toBe(2)})
 it('persists only explicitly configured physical grid scale and rejects invalid values',()=>{const now=new Date().toISOString(),input={formatVersion:12,id:'project',name:'Scale',createdAt:now,modifiedAt:now,map:{...map,grid:{...map.grid,physicalScale:{distancePerCell:5,unit:'ft'}}},layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],objects:[],assets:[],objectGroups:[],layerTree:{roots:['objects'],groups:[]}};expect(parseProject(input).map.grid.physicalScale).toEqual({distancePerCell:5,unit:'ft'});expect(()=>parseProject({...input,map:{...input.map,grid:{...input.map.grid,physicalScale:{distancePerCell:0,unit:'ft'}}}})).toThrow();expect(parseProject({...input,map}).map.grid.physicalScale).toBeUndefined()})

})
