import { EnvironmentalDetailNode } from './EnvironmentalDetailNode'
import { useEnvironmentalDetailStore } from '../store/environmentalDetailStore'
import { environmentalOrder, environmentalBoundary } from '../domain/environmentalDetail'
import { TexturePaintNode } from './TexturePaintNode'
import { useTextureBrushStore } from '../store/textureBrushStore'
import { texturePaintOrder, texturePaintBoundary } from '../domain/terrainPaint'
import { textureFloors } from '../domain/textureBrush'
import { paintCoastalContours } from './drawCoastalContours'
import { isHexGrid } from '../domain/hexGrid'
import { WaterDepthNode, WaterMouthNode } from './WaterDepthNode'
import { paintGeographyFinish } from './drawGeographyFinish'
import { useLandBrushStore } from '../store/landBrushStore'
import { isLandmass, clipsToLand, landBaseOrder } from '../domain/landEditing'
import { traceLandClip } from './landClip'
import { useTerrainBrushStore } from '../store/terrainBrushStore'
import { TerrainPaintNode } from './TerrainPaintNode'
import { terrainPaintOrder, terrainPaintBoundary } from '../domain/terrainPaint'
import { effectOrder, fogBoundary } from '../domain/mapEffects'
import { paintFog, paintVignette, paintFrame } from './drawMapEffects'
import { routeConnections } from '../domain/routes'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import { isLandMap,mapWorkspace } from '../domain/geography'
import { drawGeographicGrid } from './drawGeography'
import type { ScatterObject } from '../domain/scatter'
import { isOpening, createOpeningIndex } from '../domain/openings'
import { OpeningNode } from './OpeningNode'
import { wallConnections } from '../domain/walls'
import { editableProjectIds, projectObjects } from '../domain/projectView'
import { objectCapabilities } from '../domain/patterns'
import { MapGrid } from './MapGrid'
import { gridRenderPosition } from '../domain/mapSettings'
import { useProjectStore } from '../store/projectStore'
import { selectionBounds } from '../domain/layers'
import { Fragment,memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Group, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva/lib/ReactKonvaCore'
import type Konva from 'konva'
import 'konva/lib/shapes/Image'
import 'konva/lib/shapes/Transformer'
import type { MapDocument, PlacedObject, OpeningObject } from '../domain/models'
import { boundTransformBox, ROTATION_SNAPS, objectNodeProps } from '../domain/transforms'
import { useImage } from '../images/useImage'
import { useEditorStore } from '../store/editorStore'
import { EditableStamp } from './EditableStamp'

function BackgroundImage({ id, width, height }: { id: string; width: number; height: number }) {
  const { image, error } = useImage(id, 'background')
  return image ? <KonvaImage image={image} width={width} height={height} listening={false} /> : error ? <Text text="Background unavailable" x={20} y={20} fill="#733d30" listening={false} /> : null
}
export const MapContent = memo(function MapContent({ map: savedMap, objects: savedObjects, openingPreview, viewportSize, scatterPreview }: { map: MapDocument; scatterPreview?:ScatterObject|null; viewportSize?:{width:number;height:number}; objects: PlacedObject[]; openingPreview?: OpeningObject }) {
  const landPreview=useLandBrushStore(s=>s.preview)
  const map=landPreview?{...savedMap,landEditing:{version:1 as const,manual:true as const,revision:1}}:savedMap
  const objects=landPreview?savedObjects.filter(o=>!landPreview.removed.includes(o.id)).map(o=>landPreview.replacements.find(a=>a.id===o.id)||o):savedObjects
  const detailPreview=useEnvironmentalDetailStore(s=>s.preview!==null)
  const texturePreview=useTextureBrushStore(s=>s.preview!==null)
  const paintPreview=useTerrainBrushStore(s=>s.preview!==null)
  const annotationPreview=useEditorStore(s=>s.annotationPreview)
  const areaPreview=useEditorStore(s=>s.areaPreview)
  const selectedIds = useEditorStore((state) => state.selectedObjectIds)
  const activeTool = useEditorStore((state) => state.activeTool)
  const capabilities = objectCapabilities(objects.find((object) => selectedIds.length === 1 && object.id === selectedIds[0]))
  const layers = useProjectStore((state) => state.layers)
  const objectGroups = useProjectStore(state => state.objectGroups), layerTree = useProjectStore(state => state.layerTree), solo = useEditorStore(state => state.soloLayerId)
  const content = { layers, objects, objectGroups, layerTree }
  const ceilingsVisible=useEditorStore(s=>s.ceilingsVisible)
  const baseObjects = landBaseOrder(terrainPaintOrder(effectOrder([...projectObjects(content, true, solo).filter(o=>ceilingsVisible||!(o.kind==='area'&&o.ceiling)),...(landPreview?.added||[])].map(o=>annotationPreview.find(v=>v.id===o.id)|| (areaPreview?.id===o.id?areaPreview:scatterPreview?.id===o.id?scatterPreview:o)), map.effects),!!map.terrainPaint||paintPreview||!!map.landEditing||!!map.geographyFinish||!!map.waterDepth?.enabled||!!(map.coastalContours?.enabled&&map.coastalContours.count)),!!map.landEditing||!!map.geographyFinish||!!map.waterDepth?.enabled||!!(map.coastalContours?.enabled&&map.coastalContours.count))
  const visibleObjects=environmentalOrder(texturePaintOrder(baseObjects,!!map.texturePaint||texturePreview),!!map.environmentalDetail||detailPreview),textureBoundary=texturePaintBoundary(visibleObjects),restricted=textureFloors(objects).length>0
  const clip=map.landEditing?((c:Konva.Context)=>traceLandClip(c._context,visibleObjects.filter(isLandmass))):undefined
  const detailFloor=environmentalBoundary(visibleObjects),detailEdge=detailFloor
  const paintBoundary=terrainPaintBoundary(visibleObjects)
  const boundary = fogBoundary(visibleObjects, map.effects)
  const indexOpenings=useMemo(()=>createOpeningIndex(),[]),openingIndex=indexOpenings(openingPreview?[...visibleObjects,openingPreview]:visibleObjects),byId=new Map(objects.map(o=>[o.id,o]))
  const connections=new Map([...wallConnections(visibleObjects),...routeConnections(visibleObjects)])
  const editable = editableProjectIds(content, solo)
  const groupSelection = visibleObjects.filter((object) => selectedIds.includes(object.id))
  const zoom = useEditorStore((state) => state.viewport.zoom)
  const nodes = useRef(new Map<string, Konva.Group>())
  const transformer = useRef<Konva.Transformer | null>(null)
  const register = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodes.current.set(id, node)
    else nodes.current.delete(id)
  }, [])
  useLayoutEffect(() => {
    const control = transformer.current
    const selected = (selectedIds.length === 1 && activeTool === 'select' ? selectedIds : []).flatMap((id) => nodes.current.get(id) ? [nodes.current.get(id)!] : [])
    control?.nodes(selected)
    return () => { control?.nodes([]) }
  }, [selectedIds, objects.length, layers, activeTool])
  useLayoutEffect(() => { transformer.current?.forceUpdate() }, [objects])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Shift') transformer.current?.rotationSnaps(event.type === 'keydown' ? ROTATION_SNAPS : [])
    }
    const reset = () => transformer.current?.rotationSnaps([])
    window.addEventListener('keydown', key)
    window.addEventListener('keyup', key)
    window.addEventListener('blur', reset)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('keyup', key); window.removeEventListener('blur', reset) }
  }, [])
  return <>
    <Group name="map-art" clipX={0} clipY={0} clipWidth={map.width} clipHeight={map.height}>
      {map.background && <BackgroundImage id={map.background.id} width={map.background.width} height={map.background.height} />}
      <TexturePaintNode paint={map.texturePaint} objects={visibleObjects} restricted={false} base/>
      {!map.background && objects.length === 0 && !scatterPreview && !map.terrainPaint && !map.texturePaint && !map.environmentalDetail && activeTool!=='environmentalDetail' && activeTool!=='textureBrush' && activeTool!=='terrainBrush' && <Text x={0} y={map.height / 2 - 20} width={map.width} text="Choose Area, Path or Place asset to begin" align="center" fontFamily="Segoe UI, sans-serif" fontSize={28} fill="#585e59" listening={false} />}
      {(!isLandMap(map)||isHexGrid(map.grid))&&gridRenderPosition(map.grid) === 'below' && <MapGrid map={map} zoom={zoom} />}
      {isLandMap(map)&&!isHexGrid(map.grid)&&mapWorkspace(map).geography.graticule&&<Shape listening={false} sceneFunc={c=>drawGeographicGrid(c._context,map,zoom)}/>}
      {visibleObjects.map((object, index) => <Fragment key={object.id}>
        {index===textureBoundary&&<TexturePaintNode paint={map.texturePaint} objects={visibleObjects} restricted={restricted}/>}
        {index === paintBoundary && <><WaterDepthNode map={map} objects={visibleObjects}/><Shape listening={false} perfectDrawEnabled={false} sceneFunc={c=>paintCoastalContours(c._context,map,visibleObjects)}/></>}
        {index === paintBoundary && <Group clipFunc={clip}><TerrainPaintNode paint={map.terrainPaint}/><Shape listening={false} perfectDrawEnabled={false} sceneFunc={c=>paintGeographyFinish(c._context,map,visibleObjects,'relief')}/></Group>}
        {index===detailFloor&&<EnvironmentalDetailNode map={map} tier="floor"/>}{index===detailEdge&&<EnvironmentalDetailNode map={map} tier="edge"/>}
        {index === boundary && <Shape listening={false} sceneFunc={c=>paintFog(c._context,map,visibleObjects)}/>}
        {object.kind==='label'&&object.ownerId&&(object.leader||selectedIds.includes(object.id))&&byId.has(object.ownerId)&&<Shape listening={false} sceneFunc={c=>{const o=object,owner=byId.get(o.ownerId!)!,ctx=c._context;ctx.save();ctx.globalAlpha=o.opacity;ctx.strokeStyle=o.leader?o.style.color:'#579be5';ctx.lineWidth=o.leader?1:1/zoom;ctx.beginPath();ctx.moveTo(owner.x+owner.width/2,owner.y+owner.height/2);ctx.lineTo(o.x+o.width*o.anchor.x,o.y+o.height*o.anchor.y);ctx.stroke();ctx.restore()}}/>}
        <Group clipFunc={clipsToLand(object)?clip:undefined}>{isOpening(object) ? (()=>{const wall=byId.get(object.wallId);return wall?.kind==='path'?<OpeningNode object={object} wall={wall} locked={activeTool!=='select'||!editable.has(object.id)}/>:null})() : <EditableStamp viewportSize={viewportSize} openings={openingIndex.get(object.id)} object={object} connections={connections.get(object.id)} locked={activeTool !== 'select' || !editable.has(object.id)} register={register} />}</Group>
        {object.kind==='path'&&object.route?.kind==='river'&&<WaterMouthNode map={map} objects={visibleObjects} id={object.id}/>}
      </Fragment>)}
      {textureBoundary===visibleObjects.length&&<TexturePaintNode paint={map.texturePaint} objects={visibleObjects} restricted={restricted}/>}
      {paintBoundary===visibleObjects.length&&<><WaterDepthNode map={map} objects={visibleObjects}/><Shape listening={false} perfectDrawEnabled={false} sceneFunc={c=>paintCoastalContours(c._context,map,visibleObjects)}/></>}
      {paintBoundary===visibleObjects.length&&<Group clipFunc={clip}><TerrainPaintNode paint={map.terrainPaint}/><Shape listening={false} perfectDrawEnabled={false} sceneFunc={c=>paintGeographyFinish(c._context,map,visibleObjects,'relief')}/></Group>}
      {detailFloor===visibleObjects.length&&<EnvironmentalDetailNode map={map} tier="floor"/>}{detailEdge===visibleObjects.length&&<EnvironmentalDetailNode map={map} tier="edge"/>}
      {boundary === -1 && <Shape listening={false} sceneFunc={c=>paintFog(c._context,map,visibleObjects)}/>}
      {gridRenderPosition(map.grid) === 'above' && <MapGrid map={map} zoom={zoom} />}
      <Shape listening={false} sceneFunc={c=>{paintVignette(c._context,map);paintFrame(c._context,map)}}/>
    </Group>
    {groupSelection.length > 1 && <Group listening={false}>
      {groupSelection.map((object) => <Rect key={object.id} {...objectNodeProps(object)} stroke="#8cd6aa" strokeWidth={1 / zoom} />)}
      <Rect {...selectionBounds(groupSelection)} stroke="#8cd6aa" strokeWidth={1.5 / zoom} dash={[6 / zoom, 4 / zoom]} />
    </Group>}
    <Transformer ref={transformer} resizeEnabled={selectedIds.length === 1} rotateEnabled={selectedIds.length === 1 && capabilities.rotate} enabledAnchors={capabilities.keepRatio ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']} keepRatio={capabilities.keepRatio} shiftBehavior="none" flipEnabled={false}
      rotateAnchorOffset={32} rotateAnchorCursor="grab" rotationSnapTolerance={7.5001}
      anchorSize={12} anchorCornerRadius={3} anchorStyleFunc={(anchor) => anchor.cornerRadius(anchor.hasName('rotater') ? 6 : 3)} anchorFill="#eff5ef" anchorStroke="#4e8264" borderStroke="#8cd6aa" borderStrokeWidth={1.5}
      boundBoxFunc={(oldBox, nextBox) => {
        const zoom = useEditorStore.getState().viewport.zoom
        return boundTransformBox(oldBox, nextBox, zoom, transformer.current?.getActiveAnchor() === 'rotater')
      }} />
  </>
})








