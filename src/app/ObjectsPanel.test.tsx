import { Profiler } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ObjectsPanel } from './ObjectsPanel'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { createLayeredContent } from '../domain/layers'
import type { StampObject } from '../domain/models'
import { assetMetadataName } from '../projects/assets'

vi.mock('../projects/assets', async importOriginal => ({ ...await importOriginal<typeof import('../projects/assets')>(), assetMetadataName: vi.fn(async () => 'Pine tree') }))
const objects: StampObject[] = Array.from({ length: 1000 }, (_, index) => ({ id: `o${index}`, kind: 'stamp', assetId: 'tree', x: index, y: 0, width: 20, height: 40, rotation: 0, opacity: 1, scaleX: 1, scaleY: 1 }))
beforeEach(() => {
  project.setState(createLayeredContent(objects))
  editor.setState({ inspector: 'objects', selectedObjectIds: [], activeLayerId: 'objects', activeTool: 'select', layersPinned: false, layersUsedAt: 0 })
  vi.mocked(assetMetadataName).mockClear()
})
it('renders a bounded list, fetches one metadata name, and does not rerender on object movement', async () => {
  const renders = vi.fn()
  render(<Profiler id="objects" onRender={renders}><ObjectsPanel /></Profiler>)
  await waitFor(() => expect(screen.getAllByText('Pine tree').length).toBeGreaterThan(0))
  expect(screen.getAllByRole('option').filter(node => node.tagName !== 'OPTION').length).toBeLessThanOrEqual(13)
  expect(screen.queryByRole('img')).toBeNull()
  expect(assetMetadataName).toHaveBeenCalledTimes(1)
  renders.mockClear()
  act(() => project.setState({ objects: objects.map(object => ({ ...object, x: object.x + 10 })) }))
  expect(renders).not.toHaveBeenCalled()
})
it('searches and filters, selects without changing tabs, and reveals an offscreen selection', async () => {
  render(<ObjectsPanel />)
  await waitFor(() => expect(screen.getAllByText('Pine tree').length).toBeGreaterThan(0))
  fireEvent.click(screen.getAllByRole('option').find(node => node.getAttribute('aria-posinset') === '1')!)
  expect(editor.getState().selectedObjectIds).toEqual(['o999'])
  expect(editor.getState().inspector).toBe('objects')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } })
  expect(screen.getByText('No objects match these filters.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Reveal selected' }))
  expect(screen.getByRole('searchbox')).toHaveValue('')
  act(() => editor.setState({ selectedObjectIds: ['o0'] }))
  const option = screen.getAllByRole('option').find(node => node.getAttribute('aria-posinset') === '1000')!
  expect(option).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('listbox').scrollTop).toBeGreaterThan(0)
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'area' } })
  expect(screen.getByText('No objects match these filters.')).toBeInTheDocument()
})
it('supports keyboard list navigation and preserves locked selection guards', async () => {
  project.setState(createLayeredContent([objects[0], { ...objects[1], locked: true }]))
  render(<ObjectsPanel />)
  const list = screen.getByRole('listbox')
  fireEvent.keyDown(list, { key: 'Home' }); fireEvent.keyDown(list, { key: 'Enter' })
  expect(editor.getState().selectedObjectIds).toEqual([])
  fireEvent.keyDown(list, { key: 'End' }); fireEvent.keyDown(list, { key: 'Enter' })
  expect(editor.getState().selectedObjectIds).toEqual(['o0'])
  await waitFor(() => expect(assetMetadataName).toHaveBeenCalledTimes(1))
})
