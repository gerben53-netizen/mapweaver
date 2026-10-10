import type { MapType } from '../domain/geography'
import { mapTypeName } from '../domain/geography'
import { MAP_TYPE_CAPABILITIES } from '../domain/mapCapabilities'

export type LibraryMapType = MapType | ''
export const LIBRARY_MAP_TYPES = Object.keys(MAP_TYPE_CAPABILITIES) as MapType[]
export const MAP_TYPE_FILTER_OPTIONS = [{ value: '' as LibraryMapType, label: 'Alle' }, ...LIBRARY_MAP_TYPES.map(value => ({ value, label: mapTypeName(value) }))]
const preferenceKey = 'mapweaver.library.mapType'
export function readMapTypePreference(): LibraryMapType {
  try { const value = localStorage.getItem(preferenceKey); return LIBRARY_MAP_TYPES.includes(value as MapType) ? value as MapType : '' } catch { return '' }
}
export function rememberMapType(value: LibraryMapType) {
  try { localStorage.setItem(preferenceKey, value) } catch { /* Storage restrictions never prevent browsing. */ }
}
