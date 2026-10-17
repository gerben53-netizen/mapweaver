import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LandPrecision } from './LandPrecision'
import { createArea, normalizeGeometry } from '../domain/areas'
import { defaultLandArea } from '../domain/landAreas'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
vi.mock('./Modal',()=>({Modal:({children}:{children:import('react').ReactNode})=><div>{children}</div>}))
afterEach(cleanup)
it('selects and protects a point; preview and cancel never mutate the source document',()=>{
 const object={...createArea(normalizeGeometry({polygons:[{outer:[...Array.from({length:17},(_,i)=>({x:30+i*20,y:40+(i%2)*8})),{x:350,y:250},{x:30,y:250}],holes:[]}]})),land:defaultLandArea('landmass')}
 useProjectStore.setState({objects:[object]});render(<LandPrecision object={object}/>)
 fireEvent.click(screen.getByRole('button',{name:'Local contour precision'}))
 fireEvent.change(screen.getByLabelText('Contour point action'),{target:{value:'protect'}})
 fireEvent.click(screen.getByRole('button',{name:'Contour point 6'}))
 expect(screen.getByRole('button',{name:'Contour point 6 protected'})).toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Preview local smoothing'}))
 expect(useEditorStore.getState().areaPreview?.geometry).not.toEqual(object.geometry)
 expect(useProjectStore.getState().objects).toEqual([object])
 fireEvent.click(screen.getByRole('button',{name:'Cancel'}))
 expect(useEditorStore.getState().areaPreview).toBeNull();expect(useProjectStore.getState().objects).toEqual([object])
})
