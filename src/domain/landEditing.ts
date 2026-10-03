import type { AreaObject, MapObject } from './models'

export interface LandEditing { version: 1; manual: true; revision: number }
export function validateLandEditing(value: unknown): LandEditing {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k=>!['version','manual','revision'].includes(k))) throw Error('Invalid manual geography metadata.')
  const v=value as LandEditing
  if(v.version!==1||v.manual!==true||!Number.isSafeInteger(v.revision)||v.revision<1||v.revision>1e9)throw Error('Invalid manual geography revision.')
  return {...v}
}
export const isLandmass=(o:MapObject):o is AreaObject=>o.kind==='area'&&o.land?.role==='landmass'
export const clipsToLand=(o:MapObject)=>o.kind==='area'&&o.land?.role==='terrain-region'

export const landBaseOrder=(objects:MapObject[],edited:boolean)=>edited?[...objects.filter(isLandmass),...objects.filter(o=>!isLandmass(o))]:objects
