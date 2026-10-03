import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore'
import { MAP_SIZE } from '../canvas/map'

describe('editor store', () => {
  beforeEach(() => useEditorStore.setState({ viewport: { zoom: 1, pan: { x: 0, y: 0 } } }))
  it('pans the viewport without changing map geometry or zoom', () => {
    useEditorStore.getState().panBy({ x: -35, y: 70 })
    expect(useEditorStore.getState().viewport).toEqual({ zoom: 1, pan: { x: -35, y: 70 } })
    expect(MAP_SIZE).toEqual({ width: 1600, height: 1000 })
  })
  it('resets arbitrary navigation to the same fitted viewport', () => {
    const canvas = { width: 850, height: 550 }
    useEditorStore.getState().fit(MAP_SIZE, canvas)
    const fitted = useEditorStore.getState().viewport
    useEditorStore.getState().panBy({ x: -100, y: 600 })
    useEditorStore.getState().zoomAt({ x: 100, y: 200 }, 4)
    useEditorStore.getState().fit(MAP_SIZE, canvas)
    expect(useEditorStore.getState().viewport).toEqual(fitted)
  })
})
