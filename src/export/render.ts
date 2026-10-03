import { loadGeneratedWall } from '../canvas/drawGeneratedWall'
import { softShadowStyle } from '../domain/mapEffects'
import { drawTexturePaint } from '../canvas/drawTexturePaint'
import { texturePaintAssetIds } from '../domain/terrainPaint'
import { paintCoastalContours } from '../canvas/drawCoastalContours'
import { isHexGrid } from '../domain/hexGrid'
import { paintWaterDepth, paintWaterMouth } from '../canvas/drawWaterDepth'
import { paintGeographyFinish } from '../canvas/drawGeographyFinish'
import { isLandmass, clipsToLand } from '../domain/landEditing'
import { traceLandClip } from '../canvas/landClip'
import { paintTerrain } from '../canvas/drawTerrainPaint'
import { loadPaintTextures } from '../canvas/premiumTerrainTextures'
import { acquireImage, acquireAssetImage, acquireBackgroundImage } from '../images/imageCache'
import { paintStampEffects } from '../canvas/drawStampEffects'
import { paintFog, paintVignette, paintFrame } from '../canvas/drawMapEffects'
import { paintWater } from '../canvas/drawWater'
import { isAnnotation } from '../domain/annotations'
import { paintAnnotation } from '../canvas/drawAnnotation'
import { loadAnnotationFonts } from '../canvas/annotationFonts'
import { routeConnections } from '../domain/routes'
import { drawGeographicGrid,drawScaleBar } from '../canvas/drawGeography'
import { isLandMap } from '../domain/geography'
import { paintScatter } from '../canvas/drawScatter'
import { isOpening, reconcileOpenings } from '../domain/openings'
import { paintOpening } from '../canvas/drawOpening'
import { wallConnections } from '../domain/walls'
import { Group } from 'konva/lib/Group'
import { Image as KonvaImage } from 'konva/lib/shapes/Image'
import { Shape } from 'konva/lib/Shape'
import { paintPath } from '../canvas/drawPath'
import { validatePath } from '../domain/paths'
import { paintArea } from '../canvas/drawArea'
import { objectAssetId, objectAssetIds, validateArea } from '../domain/areas'
import { objectNodeProps } from '../domain/transforms'
import { drawGrid } from '../canvas/drawGrid'
import { resolveAsset, useAssetContext } from '../projects/assets'
import { encodedDimensions } from '../imports/readImage'
import { validateDimensions, validateFile } from '../imports/limits'
import { EXPORT_LIMITS, exportScene } from './scene'
import type { ExportScene, ExportOptions } from './scene'
import type { AssetKind } from '../domain/models'
import type { ProjectSnapshot } from '../store/history'

export type ExportImage = CanvasImageSource & { width: number; height: number }
export function buildScene(scene: ExportScene, images: Map<string, ExportImage>) {
  const root = new Group({ listening: false, clipX: 0, clipY: 0, clipWidth: scene.map.width, clipHeight: scene.map.height })
  const connections=new Map([...wallConnections(scene.items.flatMap(item=>item.kind==='object'?[item.object]:[])),...routeConnections(scene.items.flatMap(item=>item.kind==='object'?[item.object]:[]))])
  const objects=scene.items.flatMap(item=>item.kind==='object'?[item.object]:[])
  reconcileOpenings(objects)
  const lands=objects.filter(isLandmass)
  try {
    for (const item of scene.items) {
      if (item.kind === 'color') root.add(new Shape({ perfectDrawEnabled: false, sceneFunc: c => paintWater(c._context, scene.map, objects) }))
      if (item.kind === 'background') root.add(new KonvaImage({ image: images.get(item.background.id)!, width: item.background.width, height: item.background.height, perfectDrawEnabled: false }))
      if (item.kind === 'grid') root.add(new Shape({ perfectDrawEnabled: false, sceneFunc: (context) => isLandMap(scene.map)&&!isHexGrid(scene.map.grid)?drawGeographicGrid(context._context,scene.map,1):drawGrid(context, scene.map, 1) }))
      if(item.kind==='scaleBar')root.add(new Shape({listening:false,sceneFunc:c=>drawScaleBar(c._context,scene.map)}))
      if(item.kind==='coastalContours')root.add(new Shape({listening:false,perfectDrawEnabled:false,sceneFunc:c=>paintCoastalContours(c._context,scene.map,objects)}))
      if(item.kind==='waterDepth')root.add(new Shape({listening:false,perfectDrawEnabled:false,sceneFunc:c=>paintWaterDepth(c._context,scene.map,objects)}))
      if(item.kind==='baseTexturePaint')root.add(new Shape({listening:false,perfectDrawEnabled:false,sceneFunc:c=>drawTexturePaint(c._context,scene.map.texturePaint,objects,false,images,true)}))
      if(item.kind==='texturePaint')root.add(new Shape({listening:false,perfectDrawEnabled:false,sceneFunc:c=>drawTexturePaint(c._context,scene.map.texturePaint,objects,!!scene.textureRestricted,images)}))
      if(item.kind==='terrainPaint')root.add(new Shape({listening:false,perfectDrawEnabled:false,sceneFunc:c=>{const ctx=c._context;ctx.save();if(scene.map.landEditing){traceLandClip(ctx,lands);ctx.clip()}paintTerrain(ctx,scene.map.terrainPaint);ctx.restore()}}))
      if(item.kind==='relief')root.add(new Shape({listening:false,perfectDrawEnabled:false,sceneFunc:c=>{const ctx=c._context;ctx.save();if(scene.map.landEditing){traceLandClip(ctx,lands);ctx.clip()}paintGeographyFinish(ctx,scene.map,objects,'relief');ctx.restore()}}))
      if(item.kind==='fog')root.add(new Shape({listening:false,sceneFunc:c=>paintFog(c._context,scene.map,objects)}))
      if(item.kind==='finish')root.add(new Shape({listening:false,sceneFunc:c=>{paintVignette(c._context,scene.map);paintFrame(c._context,scene.map)}}))
      if (item.kind !== 'object') continue
      const o = item.object, image = images.get(objectAssetId(o) || "")!, group = new Group(objectNodeProps(o))
      if(o.kind==='label'&&o.ownerId&&o.leader){const owner=objects.find(v=>v.id===o.ownerId);if(owner)root.add(new Shape({sceneFunc:c=>{const ctx=c._context;ctx.save();ctx.globalAlpha=o.opacity;ctx.strokeStyle=o.style.color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(owner.x+owner.width/2,owner.y+owner.height/2);ctx.lineTo(o.x+o.width*o.anchor.x,o.y+o.height*o.anchor.y);ctx.stroke();ctx.restore()}}))}
      if(scene.map.landEditing&&clipsToLand(o)){const clipped=new Group({clipFunc:c=>traceLandClip(c._context,lands)});clipped.add(group);root.add(clipped)}else root.add(group)
      if(o.kind==='stamp'&&(softShadowStyle(o,scene.map.effects).enabled||o.effects?.shadow.enabled||o.effects?.glow.enabled)){group.add(new Shape({width:o.width,height:o.height,perfectDrawEnabled:false,sceneFunc:c=>paintStampEffects(c._context,o,image,scene.map.effects)}))}
      if(isAnnotation(o))group.add(new Shape({width:o.width,height:o.height,perfectDrawEnabled:false,sceneFunc:c=>paintAnnotation(c._context,o,images,scene.map)}))
      else if (o.kind === 'stamp') group.add(new KonvaImage({ image, width: o.width, height: o.height, x: o.scaleX < 0 ? o.width : 0, y: o.scaleY < 0 ? o.height : 0, scaleX: o.scaleX, scaleY: o.scaleY, opacity: o.opacity, perfectDrawEnabled: false }))
      else if(o.kind === 'scatter') { group.add(new Shape({width:o.width,height:o.height,perfectDrawEnabled:false,sceneFunc:c=>paintScatter(c._context,o,images)})) }
      else if(o.kind === 'path') { validatePath(o);group.add(new Shape({width:o.width,height:o.height,perfectDrawEnabled:false,sceneFunc:c=>paintPath(c._context,o,image,connections.get(o.id),objects.filter(isOpening).filter(v=>v.wallId===o.id))})) }
      else if(isOpening(o)){const wall=objects.find(v=>v.id===o.wallId);if(wall?.kind!=='path')throw new Error('Restore the missing opening wall before exporting.');group.add(new Shape({sceneFunc:c=>paintOpening(c._context,o,wall,image),perfectDrawEnabled:false}))}
      else if(o.kind === 'area') {
        validateArea(o)
        group.add(new Shape({width:o.width,height:o.height,perfectDrawEnabled:false,sceneFunc:c=>paintArea(c._context,o,image,scene.map.geographyFinish)}))
      } else throw new Error('Legacy pattern must be migrated before export.')
      if(o.kind==='path'&&o.route?.kind==='river')root.add(new Shape({listening:false,perfectDrawEnabled:false,sceneFunc:c=>paintWaterMouth(c._context,scene.map,objects,o.id)}))
    }
    return root
  } catch (cause) { root.destroy(); throw cause }
}
export function renderScene(scene: ExportScene, images: Map<string, ExportImage>) {
  const root = buildScene(scene, images)
  try { return root.toCanvas({ x: 0, y: 0, width: scene.map.width, height: scene.map.height, pixelRatio: scene.scale }) }
  finally { root.destroy() }
}

type Resolver = typeof resolveAsset
export async function exportPng(project: ProjectSnapshot, options: ExportOptions, resolve: Resolver = resolveAsset): Promise<Blob> {
  const generation = useAssetContext.getState().generation
  await loadPaintTextures(project.map.terrainPaint)
  if(project.objects.some(isAnnotation))await loadAnnotationFonts()
  const scene = exportScene(project, options), sources = new Map<string, { blob: Blob; name: string }>(), failures: string[] = []
  await Promise.all(scene.items.flatMap(i=>i.kind==='object'&&i.object.kind==='path'&&i.object.wall?.generated?[loadGeneratedWall(i.object.wall.generated)]:[]))
  const refs = new Map<string, { background: boolean; kind?: AssetKind }>()
  for (const item of scene.items) {
    if (item.kind === 'background') refs.set(item.background.id, { background: true })
    if (item.kind === 'object') { for(const id of objectAssetIds(item.object)) refs.set(id, { background: refs.get(id)?.background || false, kind: isAnnotation(item.object) || item.object.kind === 'scatter' || item.object.kind === 'stamp' || isOpening(item.object) ? 'stamp' : 'fillPattern' }) }
  }
  if(scene.map.texturePaint?.visible)texturePaintAssetIds(scene.map.texturePaint).forEach(id=>refs.set(id,{background:false,kind:'fillPattern'}))
  const optional=new Set(scene.items.flatMap(item=>item.kind==='object'&&isOpening(item.object)&&item.object.assetId?[item.object.assetId]:[]))
  for(const item of scene.items){if(item.kind==='background')optional.delete(item.background.id);if(item.kind==='object'&&!isOpening(item.object))objectAssetIds(item.object).forEach(id=>optional.delete(id))}
  let estimatedPixels = 0
  for (const [id, { background, kind }] of refs) {
    try {
      const source = await resolve(id, background, kind), file = new File([source.blob], source.name, { type: source.blob.type })
      validateFile(file)
      const size = encodedDimensions(new Uint8Array(await file.arrayBuffer()), file.type)
      validateDimensions(size.width, size.height); estimatedPixels += size.width * size.height
      sources.set(id, source)
    } catch (cause) { if(!optional.has(id))failures.push(`${id}: ${cause instanceof Error ? cause.message : 'Image unavailable'}`) }
  }
  if (failures.length) throw new Error(`Export needs readable images:\n${failures.join('\n')}`)
  const materialBytes=project.objects.some(o=>o.kind==='path'&&(o.wall?.material?.set.continuous||o.wall?.generated))?192*1024*1024:0
  const checkMemory = (pixels: number) => { if (scene.width * scene.height * 8 + pixels * 4 + materialBytes > EXPORT_LIMITS.workingBytes) throw new Error('Export image memory estimate exceeds 512 MiB. Choose 1×, hide unused layers or use smaller source images.') }
  checkMemory(estimatedPixels)
  const images = new Map<string, HTMLImageElement>(), leases: ReturnType<typeof acquireImage>[] = []; let canvas: HTMLCanvasElement | undefined, decodedPixels = 0
  try {
    for (const [id, source] of sources) {
      try {
        // Share the editor's decoded sources: fresh browser decodes can sample
        // translucent images differently at fractional map positions.
        const ref = refs.get(id)!
        const lease = resolve === resolveAsset ? ref.background ? acquireBackgroundImage(id) : acquireAssetImage(id, ref.kind) : acquireImage('export:' + crypto.randomUUID(), async () => source.blob)
        leases.push(lease)
        const image = await lease.promise
        images.set(id, image); validateDimensions(image.width, image.height)
        decodedPixels += image.width * image.height
      } catch (cause) { if(!optional.has(id))failures.push(`${source.name} (${id}): ${cause instanceof Error ? cause.message : 'Cannot decode image'}`) }
      checkMemory(decodedPixels)
    }
    if (failures.length) throw new Error(`Export needs readable images:\n${failures.join('\n')}`)
    if (resolve === resolveAsset && generation !== useAssetContext.getState().generation) throw Error('Project changed while preparing export. Try again.')
    canvas = renderScene(scene, images)
    return await new Promise<Blob>((resolve, reject) => canvas!.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The browser could not create the PNG. Try 1× or a smaller map.')), 'image/png'))
  } finally { leases.forEach(lease => lease.release()); if (canvas) { canvas.width = 0; canvas.height = 0 } }
}

