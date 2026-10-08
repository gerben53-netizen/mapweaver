import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Util } from 'konva/lib/Util'
import { MapContent } from './MapContent'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { useArlStore } from '../store/arlStore'
import { defaultMapStyle } from '../domain/mapSettings'
import { createArea, rectangleGeometry } from '../domain/areas'
import { createWall, SIMPLE_WALL } from '../domain/walls'
import { generatedWallStyle } from '../domain/generatedWalls'
import { createOpening } from '../domain/openings'
import { emptyEnvironmentalDetail } from '../domain/environmentalDetail'
import { exportScene } from '../export/scene'
import { buildScene } from '../export/render'
import { paintArlBatch } from './drawArchitecturalReadability'
import type { StampObject } from '../domain/models'
vi.mock('react-konva/lib/ReactKonvaCore', () => ({ Group: ({ children }: { children: ReactNode }) => <div>{children}</div>, Shape: () => null, Text: () => null, Image: () => null, Rect: () => null, Transformer: () => null }))
vi.mock('./EnvironmentalDetailNode', () => ({ EnvironmentalDetailNode: ({ tier }: { tier: string }) => <i data-order={'environmental' + tier} /> }))
vi.mock('./EditableStamp', () => ({ EditableStamp: ({ object, suppressArtwork = false }: { object: { id: string }; suppressArtwork?: boolean }) => <i data-order={object.id} data-suppressed={String(suppressArtwork)} /> }))
vi.mock('./ArchitecturalReadabilityNode', () => ({ ArchitecturalReadabilityNode: ({ batch, mode, objects }: { batch: { walls: { id: string }[] }; mode: string; objects: { id: string; kind: string }[] }) => <i data-order={'arl-' + batch.walls[0].id} data-mode={mode} data-openings={objects.filter(o=>o.kind==='door'||o.kind==='window').map(o=>o.id).join(',')} /> }))
vi.mock('./drawArchitecturalReadability', () => ({ paintArlBatch: vi.fn() }))
afterEach(() => { useArlStore.getState().setMode('OFF'); vi.restoreAllMocks() })
it.each(['B', 'C'] as const)('Edit avoids %s ARL rebuilds while explicit export retains shared batches and strata', mode => {
  vi.spyOn(Util, 'isCanvasFarblingActive').mockReturnValue(false)
  const map = { ...defaultMapStyle(), width: 600, height: 400, background: null, environmentalDetail: emptyEnvironmentalDetail() }, floor = createArea(rectangleGeometry({x:0,y:0,width:map.width,height:map.height}))
  const a = createWall([{ id: 'a', x: 40, y: 100, mode: 'corner' }, { id: 'b', x: 400, y: 100, mode: 'corner' }], false, generatedWallStyle(SIMPLE_WALL, map, 'marble', 'production-1')), b = { ...a, id: 'second' }
  const stamp: StampObject = { kind: 'stamp', id: 'prop', assetId: 'image', x: 40, y: 40, width: 30, height: 30, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1 }
  const objects = [floor, a, b, stamp], state = { map, objects, layers: [{ id: 'objects', name: 'Objects', visible: true, locked: false, objectIds: objects.map(o => o.id) }], objectGroups: [], layerTree: null }, before = JSON.stringify(state)
  useProjectStore.setState(state); useEditorStore.setState({ activeTool: 'select', selectedObjectIds: [], ceilingsVisible: false, soloLayerId: null, annotationPreview: [], areaPreview: null }); useArlStore.getState().setMode(mode)
  const view = render(<MapContent map={map} objects={objects} />)
  expect(Array.from(view.container.querySelectorAll('[data-order]'), e => e.getAttribute('data-order'))).toEqual([floor.id, 'environmentalfloor', 'environmentaledge', a.id, b.id, stamp.id])
  expect(view.container.querySelector(`[data-order="${a.id}"]`)).toHaveAttribute('data-suppressed', 'false')
  expect(view.container.querySelector('[data-order="prop"]')).toHaveAttribute('data-suppressed', 'false')
  const image = Object.assign(new Image(), { width: 10, height: 10 })
  for (const scale of [1, 2] as const) {
    const root = buildScene(exportScene(state, { arlMode: mode, scale, includeGrid: false, transparent: true }), new Map([['image', image]]))
    const shapes = root.getChildren().filter(n => n.getClassName() === 'Shape')
    const arl = shapes[2] as import('konva/lib/Shape').Shape
    arl.sceneFunc()({ _context: {} } as never, arl)
    expect(paintArlBatch).toHaveBeenLastCalledWith({}, expect.objectContaining({ walls: [a, b], floors: [floor] }), expect.objectContaining({ width: 600 }), objects, mode)
    expect(root.find('Image')).toHaveLength(1); expect(root.find('Transformer')).toHaveLength(0)
    root.destroy()
  }
  const preview = createOpening(a, .5, 'door', 30)
  view.rerender(<MapContent map={map} objects={objects} openingPreview={preview} />)
  expect(view.container.querySelector(`[data-order="arl-${a.id}"]`)).toBeNull()
  expect(JSON.stringify(state)).toBe(before)
})
