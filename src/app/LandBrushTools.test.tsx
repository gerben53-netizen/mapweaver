import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { LandBrushTools } from './LandBrushTools'
import { useLandBrushStore } from '../store/landBrushStore'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { defaultLandBrush } from '../domain/landBrush'
import { defaultGeography } from '../domain/geography'
afterEach(cleanup)
it('offers three simple organic profiles with useful defaults and preserves Round settings',()=>{
 useEditorStore.setState({activeTool:'landBrush'});useLandBrushStore.setState({settings:{...defaultLandBrush,action:'remove'},busy:false})
 render(<LandBrushTools/>);
 for(const shape of ['organicSoft','organicRugged','organicFine']){
  fireEvent.change(screen.getByLabelText('Land brush shape'),{target:{value:shape}})
  expect(useLandBrushStore.getState().settings).toMatchObject({shape,action:'remove',roughness:.65,softness:0,smoothing:'off'})
  expect(screen.queryByLabelText('Roughness (%)')).not.toBeInTheDocument();expect(screen.getByText(/Prototype/)).toBeInTheDocument()
 }
 const before=useLandBrushStore.getState().settings;fireEvent.change(screen.getByLabelText('Land brush shape'),{target:{value:'round'}})
 expect(useLandBrushStore.getState().settings).toEqual({...before,shape:'round'});expect(screen.getByLabelText('Roughness (%)')).toBeInTheDocument()
})
it('explains why Smooth Coast cannot paint with Smoothing Off',()=>{
 useEditorStore.setState({activeTool:'landBrush'});useLandBrushStore.setState({settings:{...defaultLandBrush,action:'smooth',smoothing:'off'},busy:false})
 render(<LandBrushTools/>);expect(screen.getByText(/Smoothing is Off/)).toBeInTheDocument()
})
it('offers working presets, action/shape controls and world-space fractional size',()=>{
 useProjectStore.setState(s=>({map:{...s.map,width:1000,mapType:'world-map',geography:{...defaultGeography('world-map'),widthKm:1000,unit:'km'}}}))
 useEditorStore.setState({activeTool:'landBrush'});useLandBrushStore.setState({settings:defaultLandBrush,busy:false})
 render(<LandBrushTools/>);fireEvent.change(screen.getByLabelText('Land brush preset'),{target:{value:'Rocky Coast'}})
 expect(useLandBrushStore.getState().settings).toMatchObject({action:'roughen',shape:'jagged'})
 fireEvent.change(screen.getByLabelText('Size (km)'),{target:{value:'25.5'}});expect(useLandBrushStore.getState().settings.size).toBe(25.5)
 fireEvent.change(screen.getByLabelText('Land action'),{target:{value:'remove'}});fireEvent.change(screen.getByLabelText('Land brush shape'),{target:{value:'island'}})
 expect(useLandBrushStore.getState().settings).toMatchObject({action:'remove',shape:'island'})
 fireEvent.click(screen.getByRole('button',{name:'Done'}));expect(useEditorStore.getState().activeTool).toBe('select')
})

it('exposes hex orientation and edges while hiding controls that cannot affect Exact',()=>{
 useEditorStore.setState({activeTool:'landBrush'});useLandBrushStore.setState({settings:{...defaultLandBrush,shape:'hexagon'},busy:false})
 render(<LandBrushTools/>)
 expect(screen.getByLabelText('Hex orientation')).toHaveValue('flat')
 expect(screen.getByLabelText('Hex edge style')).toHaveValue('exact')
 expect(screen.queryByLabelText('Roughness (%)')).not.toBeInTheDocument()
 expect(screen.queryByLabelText('Coast smoothing')).not.toBeInTheDocument()
 expect(screen.queryByLabelText('Softness (%)')).not.toBeInTheDocument()
 fireEvent.change(screen.getByLabelText('Hex orientation'),{target:{value:'pointy'}})
 fireEvent.change(screen.getByLabelText('Hex rotation (degrees)'),{target:{value:'30'}})
 for(const edge of ['soft','rough']){
  fireEvent.change(screen.getByLabelText('Hex edge style'),{target:{value:edge}})
  expect(screen.getByLabelText('Roughness (%)')).toBeEnabled()
  expect(screen.getByLabelText('Coast smoothing')).toBeEnabled()
 }
 expect(useLandBrushStore.getState().settings.hex).toEqual({orientation:'pointy',rotation:30,edge:'rough'})
 expect(screen.queryByLabelText('Snap to hex grid')).not.toBeInTheDocument()
})
