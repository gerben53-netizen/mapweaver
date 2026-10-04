import type {CampfireMapContract,MapCeilingRegionV3} from './types.js';
export type CeilingModel = {kind:'LEGACY_UNKNOWN'}
 | {kind:'EXPLICIT_NO_CEILINGS';regions:MapCeilingRegionV3[]}
 | {kind:'EXPLICIT_CEILINGS';regions:MapCeilingRegionV3[]};
// Use only validated contracts. Absence is never normalized into an outdoor map.
export function ceilingModel(map:CampfireMapContract|undefined):CeilingModel{
 if(!map||map.version!==3||map.ceilingRegions===undefined)return {kind:'LEGACY_UNKNOWN'};
 return {kind:map.ceilingRegions.length?'EXPLICIT_CEILINGS':'EXPLICIT_NO_CEILINGS',regions:map.ceilingRegions};
}
