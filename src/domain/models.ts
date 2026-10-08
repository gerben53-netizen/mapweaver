export type AssetKind = 'stamp' | 'fillPattern'
// Optional only at the legacy import boundary; repositories and pickers return TypedAsset.
export interface StampAsset {
  family?: import("./stampFamilies").StampFamily
  quality?: import('./assetQuality').AssetQuality | null
  patternScale?:number|null
  sizing?: import('./assetSizing').AssetSizing
  kind?: AssetKind
  blobId?: string
  id: string
  name: string
  mimeType: string
  naturalWidth: number
  naturalHeight: number
  categoryId: string
  createdAt: string
  contentHash: string
}
export type TypedAsset = StampAsset & { kind: AssetKind }
export interface StampCategory { id: string; name: string; createdAt: string }
interface ObjectBase {
  name?: string; visible?: boolean
  id: string; assetId: string; x: number; y: number; width: number; height: number
  opacity: number; locked?: boolean
}
export interface Background { id: string; name: string; width: number; height: number }
export interface GridSettings { type?: import('./hexGrid').GridType; physicalScale?: { distancePerCell: number; unit: 'ft' | 'm' }; visible: boolean; snapEnabled: boolean; cellSize: number; offsetX: number; offsetY: number; color: string; opacity: number; renderAboveObjects: boolean }
export interface MapDocument { rendering?: import('./rendering').RenderingSettings; environmentalDetail?: import('./environmentalDetail').EnvironmentalDetail; ceilingExposure?: 'explicit'; campfireRevision?: number; lighting?: import('../campfire/generated/index').MapLightingV1; texturePaint?: import('./terrainPaint').TerrainPaint; coastalContours?: import('./coastalContours').CoastalContours; waterDepth?: import('./waterDepth').WaterDepth; geographyFinish?: import('./geographyFinish').GeographyFinish; landEditing?: import('./landEditing').LandEditing; terrainPaint?: import('./terrainPaint').TerrainPaint; theme?: import('./worldThemes').WorldThemeState; effects?: import('./mapEffects').MapEffects; water?: import('./terrainStyles').WaterAppearance; generation?: import('../world/model').WorldGeneration; mapType?: import('./geography').MapType; geography?: import('./geography').Geography; width: number; height: number; background: Background | null; backgroundColor: string; grid: GridSettings }
export interface MapLayer { id: string; name: string; visible: boolean; locked: boolean; objectIds: string[] }

export interface StampObject extends ObjectBase { family?: import("./stampFamilies").FamilySelection; effects?: import('./mapEffects').StampEffects; kind: 'stamp'; rotation: number; scaleX: number; scaleY: number }
export interface PatternFillObject extends ObjectBase {
  kind: 'patternFill'; mode: 'repeat' | 'stretch'
  patternScale: number; patternRotation: number; patternOffsetX: number; patternOffsetY: number
  // Fixed orientation keeps the existing shared transform adapter simple; these cannot be edited.
  rotation: 0; scaleX: 1; scaleY: 1
}
export interface AreaGeometry { polygons: { outer: { x: number; y: number }[]; holes: { x: number; y: number }[][] }[] }
export type AreaFill = { kind: 'none' } | { kind: 'solid'; color: string } | { kind: 'pattern'; assetId: string; mode: 'repeat' | 'stretch'; scale: number; rotation: number; offsetX: number; offsetY: number }
export interface AreaObject extends Omit<ObjectBase, 'assetId'> {
  ceiling?: true
  land?: import('./landAreas').LandArea
  roomSource?: { wallIds: string[]; fingerprint: string; seed: { x: number; y: number } }
  patternTransform?: [number, number, number, number, number, number]
  kind: 'area'; assetId?: never; name: string; geometry: AreaGeometry; fill: AreaFill
  // Bounds are derived from map-coordinate geometry and checked at every admission boundary.
  rotation: 0; scaleX: 1; scaleY: 1
  strokeColor: string; strokeOpacity: number; strokeWidth: number; strokeStyle: 'solid' | 'dashed' | 'dotted'
  // Stable map-coordinate pattern frame: point edits do not move the texture.
  patternFrame: { x: number; y: number; width: number; height: number }
}
export interface PathNode { junction?: string; id: string; x: number; y: number; mode: 'corner' | 'smooth'; in?: { x: number; y: number }; out?: { x: number; y: number } }
export type PathStroke = { kind: 'solid'; color: string } | { kind: 'dashed'; color: string; dash: number; gap: number } | { kind: 'texture'; assetId: string; scale: number; spacing: number; offset: number }
export interface WallSettings {
  renderingMode?: 'generated'
  generated?: import('./generatedWalls').GeneratedWall
  alignment?: 'outside'
  material?: import('./wallSets').WallMaterial

  unit: 'px' | 'cells' | 'ft' | 'm'; pixelsPerUnit: number
  flip: boolean
  outline: { enabled: boolean; color: string; width: number; opacity: number }
}
export interface PathObject extends Omit<ObjectBase, 'assetId'> {
  kind: 'path'; assetId?: never; pathKind: 'generic' | 'wall' | import('./routes').RouteKind; route?: import('./routes').RouteSettings; wall?: WallSettings; name: string; nodes: PathNode[]; closed: boolean
  strokeWidth: number; stroke: PathStroke; cap: 'butt' | 'round' | 'square'; join: 'miter' | 'round' | 'bevel'
  rotation: 0; scaleX: 1; scaleY: 1
}
interface OpeningBase extends Omit<ObjectBase, 'assetId'> {
  assetId?: string
  wallId: string; position: number; openingWidth: number
  unit: WallSettings['unit']; pixelsPerUnit: number; side: 1 | -1; flip: boolean
  rotation: 0; scaleX: 1; scaleY: 1
}
export interface DoorObject extends OpeningBase { kind: 'door'; doorType: 'single' | 'double' | 'passage'; status: 'closed' | 'open-left' | 'open-right' }
export interface WindowObject extends OpeningBase { kind: 'window'; windowType: 'simple' | 'wide'; exteriorLight?: Pick<import('../campfire/generated/index').MapWindowV2,'transmitsExteriorLight'|'exteriorLightTransmission'> }
export type OpeningObject = DoorObject | WindowObject
export type MapObject = import('./annotations').Annotation | import('./scatter').ScatterObject | StampObject | PatternFillObject | AreaObject | PathObject | OpeningObject
export type PlacedObject = MapObject
