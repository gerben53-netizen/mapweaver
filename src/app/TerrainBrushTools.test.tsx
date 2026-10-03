import { beforeEach, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TerrainBrushTools, TerrainPaintLayerControls } from './TerrainBrushTools'
import { useEditorStore } from '../store/editorStore'
import { useTerrainBrushStore } from '../store/terrainBrushStore'
import { useProjectStore } from '../store/projectStore'
import { defaultTerrainBrush } from '../domain/terrainBrush'
import { emptyTerrainPaint } from '../domain/terrainPaint'
import { history } from '../store/history'

beforeEach(()=>{useEditorStore.setState({activeTool:'terrainBrush'});useTerrainBrushStore.setState({settings:{...defaultTerrainBrush}});useProjectStore.setState(s=>({map:{...s.map,terrainPaint:emptyTerrainPaint()}}));history.reset()})
it('supports typing fractional scale through an empty field and exposes all primary controls',()=>{
  render(<TerrainBrushTools/>);const scale=screen.getByLabelText('Texture scale')
  fireEvent.change(scale,{target:{value:''}});expect(scale).toHaveValue(null)
  fireEvent.change(scale,{target:{value:'0.25'}});fireEvent.blur(scale)
  expect(useTerrainBrushStore.getState().settings.textureScale).toBe(.25)
  fireEvent.change(screen.getByLabelText('Size (map px)'),{target:{value:'256'}})
  expect(screen.getByLabelText('Brush size slider')).toHaveValue('256')
  fireEvent.change(screen.getByLabelText('Softness (%)'),{target:{value:'100'}})
  fireEvent.change(screen.getByLabelText('Strength (%)'),{target:{value:'40'}})
  expect(useTerrainBrushStore.getState().settings).toMatchObject({size:256,softness:1,strength:.4})
  fireEvent.change(screen.getByLabelText('Mode'),{target:{value:'erase'}});expect(scale).toBeDisabled();expect(screen.getByLabelText('Material')).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Mode'),{target:{value:'blend'}});expect(useTerrainBrushStore.getState().settings.mode).toBe('blend')
  fireEvent.click(screen.getByRole('button',{name:'Done'}));expect(useEditorStore.getState().activeTool).toBe('select');expect(screen.queryByLabelText('Terrain Brush controls')).not.toBeInTheDocument()
})
it('manages one logical layer with independently undoable visibility and locking',()=>{
  render(<TerrainPaintLayerControls/>)
  fireEvent.click(screen.getByRole('button',{name:'Hide Terrain paint'}));expect(useProjectStore.getState().map.terrainPaint?.visible).toBe(false)
  fireEvent.click(screen.getByRole('button',{name:'Lock Terrain paint'}));expect(useProjectStore.getState().map.terrainPaint?.locked).toBe(true)
  history.undo();expect(useProjectStore.getState().map.terrainPaint).toMatchObject({visible:false,locked:false})
})
