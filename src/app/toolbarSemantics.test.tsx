import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { ToolRail } from './ToolRail'
import { useEditorStore as editor } from '../store/editorStore'
import { useProjectStore as project } from '../store/projectStore'
import { createLayeredContent } from '../domain/layers'
import { defaultGeography } from '../domain/geography'
import { defaultMapStyle } from '../domain/mapSettings'
import { createPlace } from '../domain/annotations'
import { parseProject } from '../projects/format'
import { history } from '../store/history'
import { handleEditorShortcut } from '../store/shortcuts'

beforeEach(() => {
  project.setState({ ...createLayeredContent(), objectGroups: [], layerTree: null, map: { width: 1200, height: 800, background: null, ...defaultMapStyle(), mapType: 'battlemap', geography: defaultGeography('battlemap') } })
  editor.setState({ ...editor.getInitialState(), workspace: 'editor', activeLayerId: 'objects' })
  history.reset()
})
it.each(['battlemap', 'regional-map', 'world-map'] as const)('offers one marker action, distinct icons and descriptive tooltips on %s', mapType => {
  project.setState(s => ({ map: { ...s.map, mapType } }))
  render(<ToolRail/>)
  const rail = screen.getByRole('navigation', { name: 'Map tools' })
  const buttons = within(rail).getAllByRole('button')
  for (const button of buttons) {
    expect(button.title.length).toBeGreaterThan(12)
    expect(button.title).not.toBe(button.getAttribute('aria-label'))
  }
  const icons = buttons.map(b => b.querySelector('path')?.getAttribute('d'))
  expect(new Set(icons).size).toBe(icons.length)
  fireEvent.click(screen.getByRole('button', { name: 'Map Elements' }))
  const palette = within(screen.getByRole('region', { name: 'Insert Map Elements' }))
  expect(palette.getAllByRole('button')).toHaveLength(6)
  for (const button of palette.getAllByRole('button')) expect(button.title).not.toBe(button.getAttribute('aria-label'))
  expect(screen.queryByRole('button', { name: 'Marker' })).toBeNull()
  expect(screen.getAllByRole('button', { name: 'Place Marker' })).toHaveLength(1)
  for (const name of ['Route', 'Routes', 'Landmass', 'Pattern fill']) expect(screen.queryByRole('button', { name })).toBeNull()
  fireEvent.keyDown(document, { key: 'Escape' })
  const before = project.getState().objects
  fireEvent.click(screen.getByRole('button', { name: 'Place Marker' }))
  expect(editor.getState().markerWizard).toBe(true)
  expect(project.getState().objects).toBe(before)
  act(() => editor.setState({ activeTool: 'place', markerWizard: false }))
  expect(screen.getByRole('button', { name: 'Place Marker' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Map Elements' })).toHaveAttribute('aria-pressed', 'false')
})
it('retains legacy Place identity and fields across project parsing and edits without introducing marker defaults', () => {
  const map = project.getState().map
  const legacy = { ...createPlace({ x: 100, y: 100 }, 'Old marker', 'bespoke', map), width: 73, height: 41, note: 'Keep me', tags: ['old'], importance: 2 }
  const content = createLayeredContent([legacy])
  const doc = { formatVersion: 12, id: 'legacy', name: 'Legacy map', createdAt: '2026-09-24T00:00:00.000Z', modifiedAt: '2026-09-24T00:00:00.000Z', map, ...content, objectGroups: [], layerTree: { roots: ['objects'], groups: [] }, assets: [] }
  const parsed = parseProject(JSON.parse(JSON.stringify(doc)))
  expect(parsed.objects).toEqual([legacy])
  project.setState(content)
  project.getState().updateAnnotations([{ ...legacy, name: 'Renamed' }])
  expect(project.getState().objects[0]).toEqual({ ...legacy, name: 'Renamed' })
  history.undo(); expect(project.getState().objects).toEqual([legacy])
})
it('leaves no Marker/Route/Pattern drawing shortcuts and preserves Select', () => {
  render(<div data-mapweaver-editor tabIndex={0} aria-label="Editor" onKeyDown={e => handleEditorShortcut(e.nativeEvent)}/>)
  for (const key of ['m', 'r', 'p']) {
    fireEvent.keyDown(screen.getByLabelText('Editor'), { key })
    expect(editor.getState()).toMatchObject({ activeTool: 'select', markerWizard: false, picker: null })
  }
  act(() => editor.setState({ activeTool: 'area' }))
  fireEvent.keyDown(screen.getByLabelText('Editor'), { key: 'v' })
  expect(editor.getState().activeTool).toBe('select')
})
