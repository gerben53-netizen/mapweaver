import { beforeEach, expect, it } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { ToolRail } from './ToolRail'
import { PathTools } from './PathTools'
import { AreaTools } from './AreaTools'
import { AreaIntentProperties } from './AreaIntentProperties'
import { SelectionToolbar } from './SelectionToolbar'
import { RouteFields } from './RouteFields'
import { useEditorStore as editor } from '../store/editorStore'
import { useProjectStore as project } from '../store/projectStore'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
import { createLayeredContent } from '../domain/layers'
import { createArea } from '../domain/areas'
import { semanticTerrain } from '../domain/terrainIntent'
import { createRoute, routePreset } from '../domain/routes'
import { handleEditorShortcut } from '../store/shortcuts'
import { history } from '../store/history'

beforeEach(() => {
  project.setState({ map: { width: 1000, height: 800, background: null, ...defaultMapStyle(), mapType: 'world-map', geography: defaultGeography('world-map') }, ...createLayeredContent() })
  editor.setState({ activeTool: 'select', areaRole: 'area', areaTerrain: 'forest', workspace: 'editor', selectedObjectIds: [] })
  history.reset()
})

it('groups intent tools and keeps Path active for every semantic type', () => {
  render(<><ToolRail/><PathTools/><SelectionToolbar/></>)
  const geo = within(screen.getByRole('group', { name: 'Terrain and surface' }))
  expect(geo.getByRole('button', { name: 'Terrain Region' })).toHaveAttribute('title', expect.stringContaining('semantic biome'))
  expect(geo.getByRole('button', { name: 'Terrain Brush' })).toHaveAttribute('title', expect.stringContaining('without changing biome'))
  expect(screen.queryByRole('button', { name: 'Route' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Landmass' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Path' }))
  for (const kind of ['river','road','border','generic']) {
    fireEvent.change(screen.getByLabelText('Path type'), { target: { value: kind } })
    expect(editor.getState().activeTool).toBe(kind === 'generic' ? 'path' : 'route')
    expect(screen.getByRole('button', { name: 'Path' })).toHaveAttribute('aria-pressed', 'true')
    if (kind !== 'generic') expect(screen.getByText(`Path · ${kind[0].toUpperCase()}${kind.slice(1)}`)).toBeVisible()
  }
})

it('filters geography and semantic path creation on battlemaps', () => {
  project.setState(s => ({ map: { ...s.map, mapType: 'battlemap' } }))
  render(<><ToolRail/><PathTools/></>)
  expect(screen.getByRole('group', { name: 'Terrain and surface' })).toContainElement(screen.getByRole('button', { name: 'Texture Brush' }))
  expect(screen.getByRole('button', { name: 'Wall' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Path' }))
  expect(screen.queryByRole('option', { name: 'River' })).not.toBeInTheDocument()
})

it('separates generic Area from biome creation and active identity', () => {
  render(<><ToolRail/><AreaTools/><SelectionToolbar/></>)
  fireEvent.click(screen.getByRole('button', { name: 'Terrain Region' }))
  fireEvent.change(screen.getByLabelText('Biome'), { target: { value: 'swamp' } })
  expect(editor.getState()).toMatchObject({ areaRole: 'terrain-region', areaTerrain: 'swamp' })
  expect(screen.getByRole('button', { name: 'Area' })).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(screen.getByRole('button', { name: 'Area' }))
  expect(editor.getState().areaRole).toBe('area')
  expect(screen.queryByLabelText('Biome')).not.toBeInTheDocument()
  expect(screen.getByText(/no biome classification/)).toBeVisible()
})

it('edits semantic classification with undo without changing visual appearance', () => {
  const area = createArea({ polygons: [{ outer: [{x:10,y:10},{x:100,y:10},{x:100,y:100},{x:10,y:100}], holes: [] }] }, { kind: 'solid', color: '#567856' })
  area.land = semanticTerrain('swamp', 1000)
  project.setState({ objects: [area], layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[area.id]}], layerTree:{roots:['objects'],groups:[]} })
  render(<AreaIntentProperties object={area}/>)
  expect(screen.getByRole('region', { name: 'Semantic terrain' })).toBeVisible()
  fireEvent.change(screen.getByLabelText('Region biome'), { target: { value: 'forest' } })
  expect(project.getState().objects[0]).toEqual({ ...area, land: { ...area.land, terrain: 'forest' } })
  act(() => history.undo())
  expect(project.getState().objects[0]).toEqual(area)
})

it.each(['road','border'] as const)('shows only relevant %s properties', kind => {
  const route = createRoute([{id:'a',x:10,y:10,mode:'corner'},{id:'b',x:100,y:80,mode:'corner'}], false, routePreset(kind))
  render(<RouteFields value={route} onChange={()=>{}}/>)
  expect(!!screen.queryByLabelText('Road class')).toBe(kind === 'road')
  expect(!!screen.queryByLabelText('Border style')).toBe(kind === 'border')
  expect(screen.queryByLabelText('Source taper factor')).not.toBeInTheDocument()
})

it('has no hidden Route or Landmass keyboard activation', () => {
  render(<div data-mapweaver-editor tabIndex={0} aria-label="Editor test"/>)
  for (const key of ['r','l']) {
    const event = new KeyboardEvent('keydown', {key,bubbles:true,cancelable:true})
    Object.defineProperty(event, 'target', {value:screen.getByLabelText('Editor test')})
    handleEditorShortcut(event)
    expect(editor.getState().activeTool).toBe('select')
  }
})
