import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AssetPicker } from './AssetPicker'
import { AreaTools } from '../app/AreaTools'
import { AreaQuick } from '../app/InspectorQuickProperties'
import { SelectionToolbar } from '../app/SelectionToolbar'
import { registerTestAssets } from '../test/assets'
import { projectAssets } from '../projects/assets'
import { defaultMapStyle } from '../domain/mapSettings'
import { createLayeredContent } from '../domain/layers'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { cancelMaterial, useMaterialPreview } from '../store/materialApplication'
vi.mock('./AssetThumbnail', () => ({ AssetThumbnail: () => null }))
vi.mock('./useLibrary', () => ({ useLibrary: () => ({ assets: [], categories: [], total: 0, loading: false, error: '' }) }))
vi.mock('../images/imageCache', () => ({ acquireAssetImage: () => ({ promise: Promise.resolve({ width: 40, height: 60 }), release: vi.fn() }), acquireThumbnail: () => ({ promise: Promise.resolve({}), release: vi.fn() }) }))
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  cancelMaterial(); history.cancel(); registerTestAssets({ floor: 'fillPattern', wood: 'fillPattern' })
  project.setState({ map: { width: 600, height: 400, background: null, ...defaultMapStyle() }, ...createLayeredContent(), objectGroups: [], layerTree: null })
  editor.setState({ selectedObjectIds: [], soloLayerId: null, activeLayerId: 'objects', activeTool: 'select', picker: null, recentAssets: [] })
  history.reset()
})
it('disables the contextual action without a selection, then previews and cancels safely across StrictMode remounts', async () => {
  render(<StrictMode><SelectionToolbar/><AssetPicker/></StrictMode>)
  expect(screen.getByRole('button', { name: 'Apply Material' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Apply Material' })).toHaveAttribute('title', 'Select an Area or Floor first')
  act(() => { project.getState().createPattern('floor', { x: 10, y: 10, width: 100, height: 100 }, 'objects'); history.reset() })
  const before = project.getState().objects
  for (let i = 0; i < 2; i++) {
    fireEvent.click(screen.getByRole('button', { name: 'Apply Material' }))
    expect(useMaterialPreview.getState().targets).toHaveLength(1)
    const tab = screen.getByRole('tab', { name: 'Project assets' }); fireEvent.click(tab)
    fireEvent.click(screen.getByRole('button', { name: 'Choose wood' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled())
    expect(project.getState().objects).toBe(before)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(useMaterialPreview.getState().asset).toBeNull()
    expect(useHistoryStore.getState().undoCount).toBe(0)
  }
})
it('reuses the same browser for Inspector application and initial Area creation with distinct outcomes', async () => {
  project.getState().createPattern('floor', { x: 10, y: 10, width: 100, height: 100 }, 'objects'); history.reset()
  const object = project.getState().objects[0]
  if (object.kind !== 'area') throw Error('Area expected')
  const view = render(<><AreaQuick object={object}/><AssetPicker/></>)
  fireEvent.click(screen.getByRole('button', { name: /Browse materials/ }))
  fireEvent.click(screen.getByRole('tab', { name: 'Project assets' }))
  fireEvent.click(screen.getByRole('button', { name: 'Choose wood' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  expect(project.getState().objects).toHaveLength(1)
  expect(project.getState().objects[0]).toMatchObject({ id: object.id, fill: { assetId: 'wood' } })
  expect(useHistoryStore.getState().undoCount).toBe(1)
  view.unmount()
  editor.setState({ activeTool: 'area', areaFill: { kind: 'solid', color: '#ffffff' } })
  render(<><AreaTools/><AssetPicker/></>)
  fireEvent.change(screen.getByLabelText('Area fill'), { target: { value: 'pattern' } })
  expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Choose a fill pattern')
  fireEvent.click(screen.getByRole('tab', { name: 'Project assets' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Choose wood' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Choose asset' }))
  await waitFor(() => expect(editor.getState().picker).toBeNull())
  expect(editor.getState()).toMatchObject({ activeTool: 'area', areaFill: { kind: 'pattern', assetId: 'wood' } })
  expect(project.getState().objects).toHaveLength(1)
  expect(projectAssets()).toHaveLength(2)
})
