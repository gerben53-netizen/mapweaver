import { useRenderViewStore, setRenderView } from '../store/renderViewStore'
import { MapPreview } from './MapPreview'
import { EnvironmentalDetailTools } from '../app/EnvironmentalDetailTools'
import { EnvironmentalDetailController, EnvironmentalDetailFootprint } from './EnvironmentalDetailController'
import { history } from '../store/history'
import { WindowLightPreview } from './WindowLightPreview'
import { LightingControls } from '../app/LightingControls'
import { LightingPreview } from './LightingPreview'
import { StampPalette } from '../library/StampPalette'
import { StampPlacementGhost } from './StampPlacementGhost'
import { TextureBrushTools } from '../app/TextureBrushTools'
import { isHexGrid, hexGridRange, MAX_HEX_CELLS } from '../domain/hexGrid'
import { WaterDepthTools } from '../app/WaterDepthTools'
import { WaterDepthController } from './WaterDepthController'
import { WaterDepthFootprint } from './WaterDepthFootprint'
import { projectObjects } from '../domain/projectView'
import { AutomaticLabels } from '../app/AutomaticLabels'
import { LandBrushTools } from '../app/LandBrushTools'
import { LandBrushController } from './LandBrushController'
import { LandBrushFootprint } from './LandBrushFootprint'
import { TerrainBrushTools } from '../app/TerrainBrushTools'
import { TerrainBrushController } from './TerrainBrushController'
import { TerrainBrushFootprint } from './TerrainBrushFootprint'
import { paintWater } from './drawWater'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import { SelectionToolbar } from '../app/SelectionToolbar'
import { toolHelp, mapSizeText } from '../app/editorUx'
import { fitEditorView } from './viewActions'
import { PrefabCreate } from '../library/PrefabCreate'
import { PrefabPlacementOverlay } from '../library/PrefabPlacement'
import { AnnotationTools } from '../app/AnnotationTools'
import { useMeasure } from './useMeasure'
import { MeasureLines,GeographicReadout } from './GeographicOverlay'
import { isLandMap } from '../domain/geography'
import { ScatterTools } from '../app/ScatterTools'
import { useScatterDrawing } from './useScatterDrawing'
import { ScatterPreview } from './ScatterPreview'
import { RoomTools } from '../app/RoomTools'
import { OpeningTools, OpeningDeleteDialog } from '../app/OpeningTools'
import { useOpeningPlacement } from './useOpeningPlacement'
import { OpeningPreview } from './OpeningPreview'
import { usePathDrawing } from './usePathDrawing'
import { PathPreview, PathPoints } from './PathPoints'
import { PathTools } from '../app/PathTools'
import { useEffect, useRef, useState } from 'react'
import { Layer, Rect, Stage, Line, Text } from 'react-konva/lib/ReactKonvaCore'
import 'konva/lib/shapes/Rect'
import 'konva/lib/shapes/Text'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useCanvasNavigation } from './useCanvasNavigation'
import { useAreaDrawing } from './useAreaDrawing'
import { AreaTools } from '../app/AreaTools'
import { AreaPoints } from './AreaPoints'
import 'konva/lib/shapes/Line'
import { useStampPlacement } from './useStampPlacement'
import { MapContent } from './MapContent'
import { PatternTools } from '../app/PatternTools'
import { Icon } from '../app/Icon'
import styles from './MapCanvas.module.css'
export function MapCanvas() {
  const view = useRenderViewStore(s => s.view)
  const fittedMapRef = useRef<string | null>(null)
  return <section className={styles.workspace}><div className={`${styles.toolbar} ${styles.viewSwitch}`} role="group" aria-label="Kaartweergave">{(['edit','preview'] as const).map(v => <button key={v} aria-pressed={view === v} onClick={() => { try { setRenderView(v) } catch(e) { useEditorStore.setState({message: (e as Error).message}) } }}>{v === 'edit' ? 'Bewerken' : 'Voorbeeld'}</button>)}</div>{view === 'edit' ? <EditCanvas fittedMapRef={fittedMapRef}/> : <MapPreview/>}</section>
}
function EditCanvas({ fittedMapRef }: { fittedMapRef: React.RefObject<string | null> }) {
  const selectedCount = useEditorStore(s=>s.selectedObjectIds.length)
  const focus = useEditorStore(s=>s.focusMode)
  const guides = useEditorStore(state => state.snapGuides), objectSnap = useEditorStore(state => state.objectSnap), smartGuides = useEditorStore(state => state.smartGuides)
  const surface = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const viewport = useEditorStore((s) => s.viewport), fit = useEditorStore((s) => s.fit), tool = useEditorStore((s) => s.activeTool), message = useEditorStore((s) => s.message)
  const map = useProjectStore((s) => s.map), objects = useProjectStore((s) => s.objects)
  const { spaceHeld, panning } = useCanvasNavigation(surface)
  const measure=useMeasure(surface)
  const scatterPreview=useScatterDrawing(surface)
  const openingPreview=useOpeningPlacement(surface)
  const pathPreview=usePathDrawing(surface); const areaPreview=useAreaDrawing(surface); useStampPlacement(surface)
  useEffect(() => { const observer = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0 && entry.contentRect.height > 0) setSize({ width: entry.contentRect.width, height: entry.contentRect.height }) }); observer.observe(surface.current!); return () => observer.disconnect() }, [])
  useEffect(() => { if (size.width > 0 && size.height > 0 && fittedMapRef.current !== `${map.width}:${map.height}`) { fit(map, size); fittedMapRef.current = `${map.width}:${map.height}` } }, [fit, fittedMapRef, map, size])
  const ceilingsVisible=useEditorStore(s=>s.ceilingsVisible)
  const grid = (key: 'visible' | 'snapEnabled') => { useProjectStore.getState().applyMapSettings({ ...map, grid: { ...map.grid, [key]: !map.grid[key] } }, () => true) }
  const zoom = (factor: number) => useEditorStore.getState().zoomAt({ x: size.width / 2, y: size.height / 2 }, viewport.zoom * factor)
  return <section className={styles.workspace} aria-label="Map workspace"><div className={styles.toolbar}>
    <SelectionToolbar />{isHexGrid(map.grid)&&map.grid.visible&&(map.grid.cellSize*useEditorStore.getState().viewport.zoom<6||hexGridRange(map,map.grid).count>MAX_HEX_CELLS)&&<small>Hex grid too dense: zoom in or increase diameter.</small>}<details className={styles.snapOptions}><summary>Map actions</summary><div><LightingControls/><button disabled={map.ceilingExposure==='explicit'} onClick={()=>history.run('Use explicit sky exposure',()=>useProjectStore.setState(s=>({map:{...s.map,ceilingExposure:'explicit'}})))}>Use explicit sky exposure</button><label><input type="checkbox" checked={ceilingsVisible} onChange={e=>useEditorStore.setState({ceilingsVisible:e.target.checked})}/>Ceilings</label><AutomaticLabels/><PrefabCreate /><RoomTools/><details><summary>Keyboard help</summary><p>Path type selects Generic, River, Road or Border; Trail is a Road class. Land / Water shapes geography; Terrain Region classifies biomes; Area draws generic zones.</p><p>V Select · F Fit map · Shift+F Fit selection · Backslash Focus mode</p><p>Delete/Backspace Delete · Ctrl/Cmd+D Duplicate · Ctrl/Cmd+G Group · Ctrl/Cmd+Shift+G Ungroup</p><p>Ctrl/Cmd+Z Undo · Ctrl/Cmd+Shift+Z or Ctrl+Y Redo · Ctrl/Cmd+S Save now</p><p>Wheel/Ctrl+wheel zoom over canvas · Space+drag or middle-drag pan · Esc cancel or clear selection. Text fields keep normal editing keys.</p></details></div></details><div className={styles.controls}>
      {(!isLandMap(map)||isHexGrid(map.grid))&&<><button className="icon-button" title="Show grid" aria-label="Show grid" aria-pressed={map.grid.visible} onClick={() => grid('visible')}><Icon name="pattern" /></button>
      <button className="icon-button" title="Snap to grid" aria-label="Snap to grid" aria-pressed={map.grid.snapEnabled} onClick={() => grid('snapEnabled')}><Icon name="snap" /></button></>}
      <details className={styles.snapOptions}><summary title="Snapping options">Snap</summary><div><label><input type="checkbox" checked={objectSnap} onChange={event => useEditorStore.setState({ objectSnap: event.target.checked })} /> Objects</label><label><input type="checkbox" checked={smartGuides} onChange={event => useEditorStore.setState({ smartGuides: event.target.checked, snapGuides: [] })} /> Guides</label></div></details>
      <button className="icon-button" title="Zoom out" aria-label="Zoom out" disabled={viewport.zoom <= .01} onClick={() => zoom(1 / 1.2)}><Icon name="minus" /></button>
      <output aria-label="Zoom level">{Math.round(viewport.zoom * 100)}%</output>
      <button className="icon-button" title="Zoom in" aria-label="Zoom in" disabled={viewport.zoom >= 4} onClick={() => zoom(1.2)}><Icon name="plus" /></button>
      <button aria-label="Fit to map" title="Fit the full map (F); fit selection (Shift+F)" disabled={!size.width} onClick={() => fit(map, size)}><Icon name="fit" /> Fit</button>
      {selectedCount>0&&<button title="Fit selection (Shift+F)" onClick={()=>fitEditorView(true)}>Fit selection</button>}
      <button title="Toggle canvas focus (backslash)" aria-pressed={focus} onClick={()=>useEditorStore.setState({focusMode:!focus})}><Icon name="focus" />{focus?'Exit focus':'Focus'}</button>
    </div></div>
    {['placeStamp','patternFill'].includes(tool)&&<PatternTools/>}
    <EnvironmentalDetailController surface={surface}/><EnvironmentalDetailTools/><LandBrushController surface={surface}/><LandBrushTools/><TerrainBrushController surface={surface}/><TerrainBrushController surface={surface} texture/><TextureBrushTools/><TerrainBrushTools/><WaterDepthController surface={surface}/><WaterDepthTools/><AnnotationTools surface={surface}/><ScatterTools /><AreaTools /><PathTools /><OpeningTools /><OpeningDeleteDialog />
    <div ref={surface} className={styles.surface} tabIndex={0} role="region" aria-label="Map canvas" aria-describedby="canvas-help" style={{ cursor: panning ? 'grabbing' : spaceHeld ? 'grab' : tool !== 'select' ? 'crosshair' : 'default' }}>
      {size.width > 0 && size.height > 0 && <Stage width={size.width} height={size.height} x={viewport.pan.x} y={viewport.pan.y} scaleX={viewport.zoom} scaleY={viewport.zoom} onMouseDown={(e) => { if (tool === 'select' && e.evt.button === 0 && !e.evt.shiftKey && (e.target === e.target.getStage() || e.target.name() === 'map-surface')) useEditorStore.getState().select(null) }}>
        <Layer><Rect name="map-surface" width={map.width} height={map.height} fill={map.backgroundColor} stroke="#f1f0e7" strokeWidth={1 / viewport.zoom} shadowColor="#000" shadowBlur={24} shadowOpacity={.25} /><Shape name="water-surface" listening={false} perfectDrawEnabled={false} sceneFunc={c=>paintWater(c._context,map,projectObjects(useProjectStore.getState(),true,useEditorStore.getState().soloLayerId))}/><MapContent scatterPreview={scatterPreview.preview} viewportSize={size} map={map} objects={objects} openingPreview={openingPreview?.error?undefined:openingPreview?.opening} /><OpeningPreview preview={openingPreview}/><ScatterPreview {...scatterPreview}/><AreaPoints /><PathPoints /><PathPreview nodes={pathPreview} /><Line points={areaPreview.flatMap(p=>[p.x,p.y])} closed={areaPreview.length>2} fill="#80aaff22" stroke="#5ca7ff" strokeWidth={2/viewport.zoom} listening={false} /><StampPlacementGhost/></Layer>
        <Layer><LightingPreview/><WindowLightPreview/></Layer>
        <Layer listening={false}><EnvironmentalDetailFootprint/><LandBrushFootprint/><TerrainBrushFootprint/><TerrainBrushFootprint texture/><WaterDepthFootprint/><MeasureLines points={measure}/>{guides.map(guide => <Line key={guide.axis} points={guide.axis === 'x' ? [guide.position, guide.start, guide.position, guide.end] : [guide.start, guide.position, guide.end, guide.position]} stroke="#edbb74" strokeWidth={1 / viewport.zoom} dash={[5 / viewport.zoom, 3 / viewport.zoom]} listening={false} />)}{guides.filter(guide=>guide.label).map(guide=><Text key={'label-'+guide.axis} x={guide.axis==='x'?guide.position:guide.start} y={guide.axis==='y'?guide.position:guide.start} text={guide.label} fontSize={12/viewport.zoom} fill="#edbb74" listening={false}/>)}</Layer>
      </Stage>}
      <PrefabPlacementOverlay/><GeographicReadout points={measure}/>{message && <div className={styles.message} role="status">{message}<button title="Dismiss message" aria-label="Dismiss message" onClick={() => useEditorStore.setState({ message: '' })}><Icon name="close" /></button></div>}
    </div><StampPalette/><footer className={styles.footer}><span id="canvas-help">{toolHelp(tool)}</span><span>{Math.round(viewport.zoom * 100)}% · {mapSizeText(map)}</span></footer></section>
}
