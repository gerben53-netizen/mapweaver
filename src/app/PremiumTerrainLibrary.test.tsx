import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TerrainBrushTools } from './TerrainBrushTools'
import { useEditorStore } from '../store/editorStore'
import { useTerrainBrushStore } from '../store/terrainBrushStore'
import { defaultTerrainBrush } from '../domain/terrainBrush'
vi.mock('../canvas/usePremiumTextures',()=>({usePremiumTextures:()=>({ready:false,error:'',retry:vi.fn()})}))
beforeEach(()=>{useEditorStore.setState({activeTool:'terrainBrush'});useTerrainBrushStore.setState({settings:{...defaultTerrainBrush},preview:null})})
it('selects material without changing brush behavior and can choose procedural material',()=>{
  render(<TerrainBrushTools/>)
  fireEvent.change(screen.getByLabelText('Material'),{target:{value:'painterly.v1.foothill'}})
  expect(useTerrainBrushStore.getState().settings).toMatchObject({textureId:'painterly.v1.foothill',style:'rocky',textureScale:.6,softness:.65,strength:.4,size:120})
  expect(screen.getByLabelText('Foothill Scree at current texture scale')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Material'),{target:{value:'classic:snow'}})
  expect(useTerrainBrushStore.getState().settings.textureId).toBeUndefined()
  expect(useTerrainBrushStore.getState().settings.style).toBe('snow')
})
it('finds materials by family, name and notes, with no fake brush controls in erase mode',()=>{
  render(<TerrainBrushTools/>)
  fireEvent.click(screen.getByText('Browse materials'))
  fireEvent.change(screen.getByLabelText('Terrain family'),{target:{value:'Swamp & marsh'}})
  expect(screen.getByRole('button',{name:/Mottled Wet Marsh/})).toBeEnabled()
  expect(screen.queryByRole('button',{name:/Foothill Scree/})).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Search materials'),{target:{value:'peat'}})
  fireEvent.click(screen.getByRole('button',{name:/Dark Peat Bog/}))
  expect(useTerrainBrushStore.getState().settings.textureId).toBe('painterly.v1.swamp-bog')
  fireEvent.change(screen.getByLabelText('Mode'),{target:{value:'erase'}})
  expect(screen.getByLabelText('Material')).toBeDisabled()
  expect(screen.getByRole('button',{name:/Dark Peat Bog/})).toBeDisabled()
})

it('applies a behavior preset without changing material or semantics',()=>{
  render(<TerrainBrushTools/>)
  fireEvent.change(screen.getByLabelText('Material'),{target:{value:'painterly.v1.forest-moss'}})
  fireEvent.change(screen.getByLabelText('Brush Preset'),{target:{value:'Fine detail'}})
  expect(useTerrainBrushStore.getState().settings).toMatchObject({textureId:'painterly.v1.forest-moss',style:'forest',size:40,softness:.65,strength:.5,textureScale:.35})
  expect(screen.getByText('Forest floor',{selector:'span'})).toBeInTheDocument()
  expect(screen.queryByLabelText('Style')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Strength (%)'),{target:{value:'25'}})
  expect(screen.getByLabelText('Brush Preset')).toHaveValue('')
})

it('finds and selects additional cave and desert materials with their image thumbnails',()=>{
 render(<TerrainBrushTools/>);fireEvent.click(screen.getByText('Browse materials'))
 expect(screen.getByText('Painterly Terrain · 32 materials')).toBeInTheDocument()
 fireEvent.change(screen.getByLabelText('Terrain family'),{target:{value:'Underground & cavern'}})
 fireEvent.change(screen.getByLabelText('Search materials'),{target:{value:'rubble'}})
 const choice=screen.getByRole('button',{name:/Rubble-Strewn Cavern/})
 expect(choice.querySelector('img')).toHaveAttribute('src','/terrain-textures-painterly/materials/cave-rubble.png')
 fireEvent.click(choice);expect(useTerrainBrushStore.getState().settings.textureId).toBe('painterly.v1.cave-rubble')
 fireEvent.change(screen.getByLabelText('Terrain family'),{target:{value:'Arid & dry'}})
 fireEvent.change(screen.getByLabelText('Search materials'),{target:{value:'dune'}})
 fireEvent.click(screen.getByRole('button',{name:/Wind-Swept Dunes/}))
 expect(useTerrainBrushStore.getState().settings).toMatchObject({textureId:'painterly.v1.dunes',style:'desert',size:120})
})
