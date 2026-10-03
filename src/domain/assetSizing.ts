/** Library defaults; geographic placement applies scope-matching world sizes.
 * Null dimensions/unit mean no physical or grid size has been assigned.
 */
export interface AssetSizing {
  applicableMapTypes?: import('./geography').MapType[]
  sizingMode: 'native' | 'grid' | 'world'
  defaultWidth: number | null
  defaultHeight: number | null
  sizingUnit: 'cells' | 'ft' | 'm' | null
  aspectRatioLocked: boolean
  sizingScope: 'battlemap' | 'regional-map' | 'world-map' | 'any'
}
