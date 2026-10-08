import { effectiveRendering } from '../domain/rendering'
import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage } from 'react-konva/lib/ReactKonvaCore'
import { useProjectStore } from '../store/projectStore'
import { useProjectSession, currentSnapshot } from '../projects/session'
import { useAssetContext } from '../projects/assets'
import { useEditorStore } from '../store/editorStore'
import { useArlStore, type ArlMode } from '../store/arlStore'
import { currentRenderRequest } from '../export/currentRender'
import { assertCurrent } from '../export/renderCache'
import { useCanvasNavigation } from './useCanvasNavigation'
import { isLandMap, mapWorkspace } from '../domain/geography'
import { isHexGrid } from '../domain/hexGrid'
import styles from './MapCanvas.module.css'

export function MapPreview() {
  const surface = useRef<HTMLDivElement>(null), viewport = useEditorStore(s => s.viewport)
  const map = useProjectStore(s => s.map), objects = useProjectStore(s => s.objects), layers = useProjectStore(s => s.layers), groups = useProjectStore(s => s.objectGroups), tree = useProjectStore(s => s.layerTree)
  const generation = useAssetContext(s => s.generation), identity = useProjectSession(s => s.info.id), diagnostic = useArlStore(s => s.mode)
  const [scale, setScale] = useState<1 | 2>(1), [retry, setRetry] = useState(0), [size, setSize] = useState({ width: 0, height: 0 })
  const [result, setResult] = useState<{ key: string; image?: HTMLImageElement; error?: string }>({ key: '' })
  const effective = effectiveRendering(map).arl, mode = diagnostic ?? effective
  const key = JSON.stringify([identity, generation, map, objects, layers, groups, tree, scale, mode, retry])
  useCanvasNavigation(surface)
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(surface.current!); return () => observer.disconnect() }, [])
  useEffect(() => {
    let active = true, url = ''
    const request = currentRenderRequest(), isCurrent = request.isCurrent
    request.isCurrent = () => active && (!isCurrent || isCurrent())
    const snapshot = currentSnapshot()
    void import('../export/render').then(({ exportPng }) => exportPng(snapshot, { scale, arlMode: mode, includeGrid: isLandMap(map) && !isHexGrid(map.grid) ? mapWorkspace(map).geography.graticule : map.grid.visible, includeScaleBar: mapWorkspace(map).geography.exportScaleBar, transparent: false }, undefined, request)).then(async blob => {
      assertCurrent(request); url = URL.createObjectURL(blob)
      const image = new Image(); image.src = url; await image.decode(); assertCurrent(request)
      setResult({ key, image })
    }).catch(error => { if (active) setResult({ key, error: (error as Error).message }) })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [key, scale, mode, map])
  const current = result.key === key ? result : null
  return <section className={styles.workspace} aria-label="Kaartvoorbeeld">
    <div className={styles.toolbar}><span>Voorbeeld — alleen lezen</span>
      <label>ARL<select aria-label="Voorbeeld ARL" value={diagnostic ?? 'default'} onChange={e => useArlStore.getState().setMode(e.target.value === 'default' ? undefined : e.target.value as ArlMode)}><option value="default">{effective === 'OFF' ? 'ARL uit' : `ARL ${effective}`} ({map.rendering?.arl ? 'aangepast' : 'standaard'})</option><option value="OFF">OFF — diagnose</option><option value="B">B — contact</option><option value="C">C — contact, edge, mass</option></select></label>
      <label>Resolutie<select aria-label="Voorbeeld resolutie" value={scale} onChange={e => setScale(Number(e.target.value) as 1 | 2)}><option value={1}>1×</option><option value={2}>2×</option></select></label>
      <button onClick={() => useEditorStore.getState().fit(map, size)}>Fit</button><output>{Math.round(viewport.zoom * 100)}%</output>
    </div>
    <div className={styles.surface} ref={surface} tabIndex={0} role="region" aria-label="Voorbeeld canvas">
      {current?.image && size.width > 0 && <Stage width={size.width} height={size.height} x={viewport.pan.x} y={viewport.pan.y} scaleX={viewport.zoom} scaleY={viewport.zoom}><Layer listening={false}><KonvaImage image={current.image} width={map.width} height={map.height} listening={false}/></Layer></Stage>}
      {!current && <p className={styles.message} role="status">Hoogwaardig voorbeeld wordt opgebouwd…</p>}
      {current?.error && <div className={styles.message} role="alert">{current.error}<button onClick={() => setRetry(n => n + 1)}>Opnieuw proberen</button></div>}
    </div><footer className={styles.footer}>Muiswiel: zoom · Space + slepen / middelste muisknop: verschuiven · Diagnose is tijdelijk · Export gebruikt de opgeslagen kaartinstelling.</footer>
  </section>
}
