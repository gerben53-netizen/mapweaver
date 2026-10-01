import { validateLighting } from '../campfire/authoring'
import { validateCoastalContours } from '../domain/coastalContours'
import { validateWaterDepth } from '../domain/waterDepth'
import { validateGeographyFinish } from '../domain/geographyFinish'
import { validateLandEditing } from '../domain/landEditing'
import { validateTerrainPaint, validateTexturePaint, texturePaintAssetIds } from '../domain/terrainPaint'
import { validateWorldThemeState } from '../domain/worldThemes'
import { validateMapEffects, validateStampEffects } from '../domain/mapEffects'
import { validateWaterAppearance, type WaterAppearance } from '../domain/terrainStyles'
import { validateWorldGeneration } from '../world/model'
import type { WorldGeneration } from '../world/model'
import { isAnnotation,validateAnnotation,annotationBudget,reconcileLabels } from '../domain/annotations'
import type { Annotation } from '../domain/annotations'
import { routeBudget } from '../domain/routes'
import { mapWorkspace } from '../domain/geography'
import { landBudget } from '../domain/landAreas'
import { validateScatter, scatterDocumentCount } from '../domain/scatter'
import type { ScatterObject } from '../domain/scatter'
import { validateOpening, reconcileOpenings, isOpening } from '../domain/openings'
import type { OpeningObject } from '../domain/models'
import { flatLayerTree, validateLayerTree, validateObjectGroups } from '../domain/grouping'
import { validatePath, pathGeometry, PATH_LIMITS } from '../domain/paths'
import type { PathObject } from '../domain/models'
import { migratePattern, objectAssetIds, validateArea } from '../domain/areas'
import type { AreaObject } from '../domain/models'
import { migrateAssetKinds } from './migrateAssets'
import { DEFAULT_GRID } from '../domain/mapSettings'
import type { GridSettings, MapObject, MapLayer, Background } from '../domain/models'
import { validateDimensions } from '../imports/limits'
import { PROJECT_LIMITS as L } from './limits'
import type { AssetManifest, ProjectFile } from './types'
function fail(field: string): never { throw new Error(`Invalid project: ${field}.`) }
function record(value: unknown, keys: string[], field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(field)
  const result = value as Record<string, unknown>
  if (Object.keys(result).some((key) => !keys.includes(key))) fail(`${field} contains unknown fields`)
  return result
}
function text(value: unknown, field: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || [...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return fail(field)
  return value
}
const id = (value: unknown) => { const s = text(value, 'identifier', 80); if (!/^[a-zA-Z0-9_-]+$/.test(s)) fail('identifier'); return s }
function num(value: unknown, field: string, min: number = -L.geometry, max: number = L.geometry): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return fail(field)
  return value
}
function bool(value: unknown): boolean { if (typeof value !== 'boolean') return fail('boolean'); return value }
function list(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) return fail('array limit'); return value }
function color(value: unknown): string { const s = text(value, 'color'); if (!/^#[a-fA-F0-9]{6}$/.test(s)) fail('color'); return s }
function date(value: unknown): string { const s = text(value, 'timestamp'); if (!Number.isFinite(Date.parse(s)) || new Date(s).toISOString() !== s) fail('timestamp'); return s }
function unique(values: string[]) { if (new Set(values).size !== values.length) fail('duplicate identifiers/references') }
const rotation = (value: unknown) => { const n = num(value, 'rotation', 0, 360); if (n === 360) fail('rotation'); return n }
export const extension = (mime: string) => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' })[mime]
export function referencedAssets(state: Pick<ProjectFile, 'map' | 'objects'>) { return new Set([...texturePaintAssetIds(state.map.texturePaint),...state.objects.flatMap((o) => objectAssetIds(o)), ...(state.map.background ? [state.map.background.id] : [])]) }
// The only version dispatch/migration entry point. No v0 or future guessing.
export function parseProject(value: unknown): ProjectFile {
  if (!value || typeof value !== 'object' || !('formatVersion' in value)) fail('missing formatVersion')
  if (value.formatVersion !== 1 && value.formatVersion !== 2 && value.formatVersion !== 3 && value.formatVersion !== 4 && value.formatVersion !== 5 && value.formatVersion !== 6 && value.formatVersion !== 7 && value.formatVersion !== 8 && value.formatVersion !== 9 && value.formatVersion !== 10 && value.formatVersion !== 11 && value.formatVersion !== 12) throw new Error(`Unsupported project format version ${String(value.formatVersion)}. Use a compatible Mapweaver version.`)
  const legacy = value.formatVersion === 1
  const root = record(value, ['formatVersion', 'id', 'name', 'createdAt', 'modifiedAt', 'map', 'objects', 'layers', 'assets', ...((value.formatVersion === 5 || value.formatVersion === 6 || value.formatVersion === 7 || value.formatVersion === 8 || value.formatVersion === 9 || (value.formatVersion === 10 || value.formatVersion === 11 || value.formatVersion === 12)) ? ['objectGroups', 'layerTree'] : [])], 'document')
  const m = record(root.map, ['width', 'height', 'backgroundColor', 'background', 'grid', ...(root.formatVersion===12?['campfireRevision','lighting','generation','water','effects','theme','texturePaint','terrainPaint','landEditing','geographyFinish','waterDepth','coastalContours']:[]), ...((root.formatVersion===10 || root.formatVersion === 11 || root.formatVersion === 12)?['mapType','geography']:[])], 'map')
  if((root.formatVersion===10 || root.formatVersion === 11 || root.formatVersion === 12)&&(!m.mapType||!m.geography))fail('map type and geographic metadata required')
  if(m.campfireRevision!==undefined&&(!Number.isSafeInteger(m.campfireRevision)||Number(m.campfireRevision)<1))fail('Campfire revision')
  const workspace={campfireRevision:m.campfireRevision===undefined?1:Number(m.campfireRevision),...(m.lighting!==undefined?{lighting:validateLighting(m.lighting)}:{}),...(m.texturePaint!==undefined?{texturePaint:validateTexturePaint(m.texturePaint)}:{}),...(m.coastalContours!==undefined?{coastalContours:validateCoastalContours(m.coastalContours)}:{}),...(m.waterDepth!==undefined?{waterDepth:validateWaterDepth(m.waterDepth)}:{}),...(m.geographyFinish!==undefined?{geographyFinish:validateGeographyFinish(m.geographyFinish)}:{}),...(m.landEditing!==undefined?{landEditing:validateLandEditing(m.landEditing)}:{}),...(m.terrainPaint!==undefined?{terrainPaint:validateTerrainPaint(m.terrainPaint)}:{}),...(m.theme!==undefined?{theme:validateWorldThemeState(m.theme)}:{}),...(m.effects!==undefined?{effects:validateMapEffects(m.effects)}:{}),...(m.water!==undefined?{water:validateWaterAppearance(m.water as WaterAppearance)}:{}),...mapWorkspace(m as Parameters<typeof mapWorkspace>[0]),...(m.generation!==undefined?{generation:validateWorldGeneration(m.generation as WorldGeneration)}:{})}
  const width = num(m.width, 'map width'), height = num(m.height, 'map height'); validateDimensions(width, height)
  const g = { ...DEFAULT_GRID, ...record(m.grid === undefined ? {} : m.grid, [...Object.keys(DEFAULT_GRID), 'physicalScale','type'], 'grid') }
  const grid: GridSettings = { visible: bool(g.visible), snapEnabled: bool(g.snapEnabled), cellSize: num(g.cellSize, 'grid size', 4, 1024), offsetX: num(g.offsetX, 'grid offset'), offsetY: num(g.offsetY, 'grid offset'), color: color(g.color), opacity: num(g.opacity, 'grid opacity', 0, 1), renderAboveObjects: bool(g.renderAboveObjects) }
  if(g.type!==undefined){if(!['square','hex-flat','hex-pointy'].includes(g.type as string))fail('invalid grid type');grid.type=g.type as GridSettings['type']}
  if (g.physicalScale !== undefined) { const scale = record(g.physicalScale, ['distancePerCell','unit'], 'physical grid scale'); if (scale.unit !== 'ft' && scale.unit !== 'm') throw Error('Invalid physical scale unit.'); grid.physicalScale = { distancePerCell: num(scale.distancePerCell, 'physical distance', .000001, 1e6), unit: scale.unit } }
  let background: Background | null = null
  if (m.background !== undefined && m.background !== null) {
    const b = record(m.background, ['id', 'name', 'width', 'height'], 'background')
    background = { id: id(b.id), name: text(b.name, 'background name', 255), width: num(b.width, 'background width'), height: num(b.height, 'background height') }; validateDimensions(background.width, background.height)
  }
  let pathNodes=0,pathSamples=0
  const objects: MapObject[] = list(root.objects, L.objects).map((value) => {
    if(value&&typeof value==='object'&&'kind' in value&&typeof value.kind==='string'&&isAnnotation(value as {kind:string})){if(root.formatVersion!==12)fail('annotations require format 12');return validateAnnotation(value as Annotation)}
    if (typeof value === 'object' && value && 'kind' in value && value.kind === 'scatter') { if(root.formatVersion!==9&&root.formatVersion!==10 && root.formatVersion !== 11 && root.formatVersion !== 12)fail('scatter requires format v9');return validateScatter(value as ScatterObject) }
    if (typeof value === 'object' && value && 'kind' in value && (value.kind === 'door' || value.kind === 'window')) {
      if (root.formatVersion !== 7 && root.formatVersion !== 8 && root.formatVersion !== 9 && root.formatVersion !== 10 && root.formatVersion !== 11 && root.formatVersion !== 12) fail('opening requires format v7')
      return validateOpening(value as OpeningObject)
    }
    if (typeof value === 'object' && value && 'kind' in value && value.kind === 'path') {
      if(root.formatVersion !== 4 && root.formatVersion !== 5 && root.formatVersion !== 6 && root.formatVersion !== 7 && root.formatVersion !== 8 && root.formatVersion !== 9 && root.formatVersion !== 10 && root.formatVersion !== 11 && root.formatVersion !== 12) fail('path requires format v4')
      const raw=value as PathObject;if(['river','road','border'].includes(raw.pathKind)&&root.formatVersion!==11&&root.formatVersion!==12)fail('routes require format v11');if(raw.pathKind==='wall'&&root.formatVersion!==6&&root.formatVersion!==7 && root.formatVersion!==8&&root.formatVersion!==9&&root.formatVersion!==10 && root.formatVersion !== 11 && root.formatVersion !== 12)fail('wall requires format v6');pathNodes+=Array.isArray(raw.nodes)?raw.nodes.length:0
      if(pathNodes>PATH_LIMITS.documentNodes)fail('project path node budget')
      if(raw.wall?.material && root.formatVersion!==8&&root.formatVersion!==9&&root.formatVersion!==10 && root.formatVersion !== 11 && root.formatVersion !== 12)fail('wall material requires format v8');const path=validatePath({name:'Path',opacity:1,cap:'round',join:'round',rotation:0,scaleX:1,scaleY:1,...value} as PathObject)
      pathSamples+=pathGeometry(path).samples.length;if(pathSamples>PATH_LIMITS.documentSamples)fail('project path sample budget')
      return path
    }
    if (typeof value === 'object' && value && 'kind' in value && value.kind === 'area') {
      if(root.formatVersion !== 3 && root.formatVersion !== 4 && root.formatVersion !== 5 && root.formatVersion !== 6 && root.formatVersion !== 7 && root.formatVersion !== 8 && root.formatVersion !== 9 && root.formatVersion !== 10 && root.formatVersion !== 11 && root.formatVersion !== 12) fail('area requires format v3')
      const area = record(value, ['kind','id','name','geometry','fill','opacity','strokeColor','strokeOpacity','strokeWidth','strokeStyle','patternFrame','x','y','width','height','rotation','scaleX','scaleY','locked','visible','patternTransform','roomSource',...((root.formatVersion===10 || root.formatVersion === 11 || root.formatVersion === 12)?['land']:[])], 'area')
      const fill = (area as unknown as AreaObject).fill
      return validateArea({ ...area, ...(fill?.kind === 'pattern' && fill.scale === undefined ? { fill: { ...fill, scale: 1 } } : {}) } as unknown as AreaObject)
    }
    const o = record(value, ['effects', 'kind', 'id', 'assetId', 'x', 'y', 'width', 'height', 'opacity', 'locked', 'name', 'visible', 'rotation', 'scaleX', 'scaleY', ...(typeof value === 'object' && value && 'kind' in value && value.kind === 'patternFill' ? ['mode', 'patternScale', 'patternRotation', 'patternOffsetX', 'patternOffsetY'] : [])], 'object')
    const base = { id: id(o.id), assetId: id(o.assetId), x: num(o.x, 'x'), y: num(o.y, 'y'), width: num(o.width, 'width', Number.MIN_VALUE), height: num(o.height, 'height', Number.MIN_VALUE), opacity: num(o.opacity, 'opacity', 0, 1), ...(o.locked === undefined ? {} : { locked: bool(o.locked) }), ...(o.visible === undefined ? {} : { visible: bool(o.visible) }), ...(o.name === undefined ? {} : { name: text(o.name, 'object name') }) }
    if (o.kind === 'stamp') {
      if (![1, -1].includes(Number(o.scaleX)) || typeof o.scaleX !== 'number' || ![1, -1].includes(Number(o.scaleY)) || typeof o.scaleY !== 'number') fail('stamp mirror signs')
      return { ...base, ...(o.effects===undefined?{}:{effects:validateStampEffects(o.effects)}), kind: 'stamp', rotation: rotation(o.rotation), scaleX: o.scaleX as number, scaleY: o.scaleY as number }
    }
    if(o.effects!==undefined)fail('effects require a stamp')
    if (o.kind !== 'patternFill' || !['repeat', 'stretch'].includes(String(o.mode)) || base.width < 8 || base.height < 8 || (o.rotation === undefined ? 0 : o.rotation) !== 0 || (o.scaleX === undefined ? 1 : o.scaleX) !== 1 || (o.scaleY === undefined ? 1 : o.scaleY) !== 1) return fail('pattern')
    return { ...base, kind: 'patternFill', mode: o.mode as 'repeat' | 'stretch', rotation: 0, scaleX: 1, scaleY: 1, patternScale: num(o.patternScale === undefined ? 1 : o.patternScale, 'pattern scale', .01, 100), patternRotation: rotation(o.patternRotation), patternOffsetX: num(o.patternOffsetX, 'pattern offset'), patternOffsetY: num(o.patternOffsetY, 'pattern offset') }
  })
  annotationBudget(objects);routeBudget(objects);scatterDocumentCount(objects); landBudget(objects)
  unique(objects.map((o) => o.id))
  const layers: MapLayer[] = list(root.layers, L.layers).map((value) => { const l = record(value, ['id', 'name', 'visible', 'locked', 'objectIds'], 'layer'); return { id: id(l.id), name: text(l.name, 'layer name'), visible: bool(l.visible), locked: bool(l.locked), objectIds: list(l.objectIds, L.objects).map(id) } })
  if (!layers.length) fail('at least one layer required')
  unique(layers.map((l) => l.id)); const members = layers.flatMap((l) => l.objectIds); unique(members)
  const objectIds = new Set(objects.map((o) => o.id))
  if (members.length !== objects.length || members.some((member) => !objectIds.has(member))) fail('layer membership')
  reconcileOpenings(objects,layers,true);reconcileLabels(objects,layers,undefined,true)
  const assets: AssetManifest[] = list(root.assets, legacy ? 256 : L.assets).map((value) => {
    const a = record(value, ['id', 'fileName', 'mimeType', 'width', 'height', 'hash', 'path', ...(!legacy ? ['kind'] : [])], 'asset')
    if (!legacy && a.kind !== 'stamp' && a.kind !== 'fillPattern') fail('asset kind')
    const asset: AssetManifest = { ...(!legacy ? { kind: a.kind as 'stamp' | 'fillPattern' } : {}), id: id(a.id), fileName: text(a.fileName, 'asset filename', 255), mimeType: text(a.mimeType, 'MIME'), width: num(a.width, 'image width'), height: num(a.height, 'image height'), hash: text(a.hash, 'hash'), path: text(a.path, 'asset path', 120) }
    if (!extension(asset.mimeType) || (legacy ? asset.path !== `assets/${asset.id}.${extension(asset.mimeType)}` : !new RegExp(`^assets/[A-Za-z0-9_-]{1,80}\\.${extension(asset.mimeType)}$`).test(asset.path)) || !/^[a-f0-9]{64}$/.test(asset.hash)) fail('asset manifest')
    validateDimensions(asset.width, asset.height); return asset
  })
  unique(assets.map((a) => a.id))
  if ([...new Map(assets.map((a) => [a.path, a])).values()].reduce((total, a) => total + a.width * a.height, 0) > L.pixels) fail('total decoded pixels')
  const paths = new Map<string, AssetManifest>()
  for (const asset of assets) { const prior = paths.get(asset.path); if (prior && (prior.hash !== asset.hash || prior.width !== asset.width || prior.height !== asset.height || prior.mimeType !== asset.mimeType)) fail('conflicting shared asset path'); paths.set(asset.path, asset) }
  if (!legacy && objects.some((o) => objectAssetIds(o).some(id=>assets.find(a=>a.id===id)?.kind !== (isAnnotation(o) || o.kind === 'scatter' || o.kind === 'stamp' || isOpening(o) ? 'stamp' : 'fillPattern')))) fail('object asset kind')
  for(const o of objects)if(o.kind==='path'&&o.wall?.material&&o.stroke.kind==='texture'){
    const assetId=o.stroke.assetId,a=assets.find(a=>a.id===assetId),set=o.wall.material.set
    if(!a||a.width!==set.atlasWidth||a.height!==set.atlasHeight)fail('wall atlas dimensions')
  }
  if(texturePaintAssetIds(workspace.texturePaint).some(id=>assets.find(a=>a.id===id)?.kind!=='fillPattern'))fail('texture paint asset kind')
  const refs = referencedAssets({ map: { ...workspace, width, height, backgroundColor: color(m.backgroundColor), grid, background }, objects })
  if (refs.size !== assets.length || assets.some((a) => !refs.has(a.id))) fail('asset references')
  if (background && !assets.some((a) => a.id === background.id && a.width === background.width && a.height === background.height)) fail('background dimensions')
  const createdAt = date(root.createdAt), modifiedAt = date(root.modifiedAt)
  if (modifiedAt < createdAt) fail('timestamp order')
  const name = text(root.name, 'project name'); if (name !== name.trim()) fail('project name whitespace')
  const document: ProjectFile = { formatVersion: legacy ? 1 : 2, id: id(root.id), name, createdAt, modifiedAt, map: { ...workspace, width, height, backgroundColor: color(m.backgroundColor), grid, background }, layers, objects, assets }
  const migrated = legacy ? migrateAssetKinds(document) : document
  const objectGroups = (root.formatVersion === 5 || root.formatVersion === 6 || root.formatVersion === 7 || root.formatVersion === 8 || root.formatVersion === 9 || (root.formatVersion === 10 || root.formatVersion === 11 || root.formatVersion === 12)) ? validateObjectGroups(root.objectGroups, layers, objects) : []
  const layerTree = (root.formatVersion === 5 || root.formatVersion === 6 || root.formatVersion === 7 || root.formatVersion === 8 || root.formatVersion === 9 || (root.formatVersion === 10 || root.formatVersion === 11 || root.formatVersion === 12)) ? validateLayerTree(root.layerTree, layers) : flatLayerTree(layers)
  return { ...migrated, objectGroups, layerTree, formatVersion: 12, objects: migrated.objects.map(o => o.kind === 'patternFill' ? migratePattern(o) : o) }
}
