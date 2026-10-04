import { routePreset } from '../domain/routes'
import type { RouteStyle } from '../domain/routes'
import { scatterDefaults } from '../domain/scatter'
import type { ScatterSettings, ScatterSource } from '../domain/scatter'
import { SIMPLE_WALL } from '../domain/walls'
import type { WallStyle } from '../domain/walls'
import type { PathSnap } from '../domain/objectSnapping'
import type { AreaFill, PathStroke } from '../domain/models'
import type { AreaShape } from '../domain/areas'
import { create } from 'zustand'
import { fitToMap, zoomAtPoint } from '../canvas/viewport'
import type { Point, Size, Viewport } from '../canvas/viewport'
import type { PlacedObject, TypedAsset, AssetKind } from '../domain/models'
import { editableProjectIds, expandGroupSelection } from '../domain/projectView'
import type { ObjectGroup } from '../domain/grouping'
import { useProjectStore } from './projectStore'
import type { SnapGuide } from '../domain/objectSnapping'
interface EditorState {
  markerChoiceMapType:import('../domain/geography').MapType|null
  markerWizard:boolean
  markerChoice:import('../domain/markerRegistry').MarkerChoice|null
  focusMode: boolean
  elementPreset:import('../domain/cartographicPresets').ElementPreset|null
  placeType:string
  placeSizeMode:'cartographic'|'world'
  labelPosition:import('../domain/annotations').LabelPosition
  symbolAsset:TypedAsset|null
  annotationPreview:import('../domain/annotations').Annotation[]
  routeStyle:RouteStyle
  areaTerrain: import('../domain/landAreas').TerrainType
  areaRole: import('../domain/landAreas').AreaRole
  areaPreview: import('../domain/models').AreaObject | null
  scatterSettings:ScatterSettings
  scatterSources:ScatterSource[]
  scatterMode:'paint'|'erase'
  scatterSeed:number
  scatterBusy:boolean
  roomDialog: boolean
  roomFloorId: string | null
  openingKind: 'door' | 'window' | 'passage'
  openingWidth: number
  deleteOpeningIds: string[] | null

  wallStyle: WallStyle
  customWallStyle: WallStyle
  wallPreset: 'simple' | 'stone' | 'custom'
  wallSnap: PathSnap | null
  continueWall: {id:string;endpoint:'start'|'end'} | null
  editingGroupId: string | null
  groupSelection: boolean
  soloLayerId: string | null
  collapsedGroups: string[]
  collapsedLayers: string[]
  clipboardGroups: ObjectGroup[]
  objectSnap: boolean
  smartGuides: boolean
  snapGuides: SnapGuide[]
  stampBrowserOpen: boolean
  workspace: 'editor' | 'library'
  inspector: 'layers' | 'objects' | 'properties' | 'map'
  inspectorCollapsed: boolean
  layersPinned: boolean
  layersUsedAt: number
  libraryKind: AssetKind | 'prefab'
  picker: { kind: AssetKind; entryId?:string; replacementId?: string; replacementIds?:string[]; purpose?: 'applyMaterial' | 'textureBrush' | 'legendSymbol' | 'placeSymbol' | 'annotationSymbol' | 'pathTexture' | 'wallTexture' | 'openingSymbol' } | null
  stampAsset: TypedAsset | null
  recentAssets: { id: string; kind: AssetKind; source: 'library' | 'project' }[]
  pathMode: 'straight' | 'curved'
  pathWidth: number
  pathStroke: PathStroke
  areaShape: AreaShape
  areaFill: AreaFill
  areaStroke: boolean
  areaStrokeStyle: 'solid' | 'dashed' | 'dotted'
  editRing: number
  editPoint: number | null
  ceilingsVisible: boolean
  activeTool: import('../domain/mapCapabilities').EditorTool
  patternAsset: { id: string; name: string } | null
  patternReady: boolean
  patternReplacementId: string | null
  selectedObjectIds: string[]
  activeLayerId: string
  clipboard: PlacedObject[]
  pasteCount: number
  message: string
  select: (id: string | null, toggle?: boolean) => void
  viewport: Viewport
  panBy: (delta: Point) => void
  zoomAt: (point: Point, zoom: number) => void
  fit: (map: Size, canvas: Size) => void
}
export const useEditorStore = create<EditorState>((set) => ({
  markerChoiceMapType:null,markerWizard:false,markerChoice:null,
  focusMode: false,
  elementPreset:null,placeType:'city',placeSizeMode:'cartographic',labelPosition:'below',symbolAsset:null,annotationPreview:[],
  areaTerrain:'forest',routeStyle:routePreset('river'),areaRole:'area',areaPreview:null,scatterSettings:scatterDefaults(),scatterSources:[],scatterMode:'paint',scatterSeed:1,scatterBusy:false,
  roomDialog:false,roomFloorId:null,openingKind:'door', openingWidth:70, deleteOpeningIds:null,
  wallStyle: structuredClone(SIMPLE_WALL), customWallStyle: structuredClone(SIMPLE_WALL), wallPreset:'simple',wallSnap:null,continueWall:null,
  editingGroupId: null, groupSelection: true, soloLayerId: null, collapsedGroups: [], collapsedLayers: [], clipboardGroups: [],
  objectSnap: true, smartGuides: true, snapGuides: [],
  stampBrowserOpen: false, workspace: 'editor', inspector: 'layers', inspectorCollapsed: false, layersPinned: false, layersUsedAt: 0, libraryKind: 'stamp', picker: null, stampAsset: null, recentAssets: [],
  pathMode:'straight',pathWidth:8,pathStroke:{kind:'solid',color:'#dfbe85'},
  areaShape: 'rectangle', areaFill: {kind:'solid',color:'#769aa0'}, areaStroke:false, areaStrokeStyle:'solid', editRing:0,editPoint:null,
  ceilingsVisible: true, activeTool: 'select', patternAsset: null, patternReady: false, patternReplacementId: null,
  selectedObjectIds: [], activeLayerId: 'objects', clipboard: [], pasteCount: 0, message: '',
  select: (id, toggle = false) => set((state) => {
    if (id === null) return { selectedObjectIds: [] }
    const project = useProjectStore.getState()
    const allowed = editableProjectIds(project, state.soloLayerId)
    const ids = state.groupSelection ? expandGroupSelection([id], project.objectGroups, state.editingGroupId) : [id]
    if (ids.some(item => !allowed.has(item))) return state
    return { selectedObjectIds: toggle ? ids.every(item => state.selectedObjectIds.includes(item)) ? state.selectedObjectIds.filter(item => !ids.includes(item)) : [...new Set([...state.selectedObjectIds, ...ids])] : ids }
  }),
  viewport: { zoom: 1, pan: { x: 0, y: 0 } },
  panBy: (delta) => set(({ viewport }) => ({ viewport: { ...viewport, pan: { x: viewport.pan.x + delta.x, y: viewport.pan.y + delta.y } } })),
  zoomAt: (point, zoom) => set(({ viewport }) => ({ viewport: zoomAtPoint(viewport, point, zoom) })),
  fit: (map, canvas) => set({ viewport: fitToMap(map, canvas) }),
}))


useEditorStore.subscribe((state, previous) => {
  if (state.selectedObjectIds !== previous.selectedObjectIds && state.selectedObjectIds.length && state.inspector !== 'objects' && state.inspector !== 'layers' && !state.layersPinned && Date.now() - state.layersUsedAt > 5000) useEditorStore.setState({ inspector: 'properties', inspectorCollapsed: false })
})

