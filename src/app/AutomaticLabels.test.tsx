import { StrictMode } from 'react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AutomaticLabels } from './AutomaticLabels'
import { useProjectStore } from '../store/projectStore'
import { history, useHistoryStore } from '../store/history'
import { defaultMapStyle } from '../domain/mapSettings'
import { createArea, rectangleGeometry } from '../domain/areas'
vi.mock('../export/render',()=>({exportPng:vi.fn(async()=>new Blob(['png'],{type:'image/png'}))}))
beforeEach(()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false};URL.createObjectURL=vi.fn(()=>'blob:preview');URL.revokeObjectURL=vi.fn()
 const o={...createArea(rectangleGeometry({x:100,y:100,width:600,height:400})),id:'region',name:'Amber Reach'}
 useProjectStore.setState({map:{...defaultMapStyle(),width:1000,height:700,mapType:'world-map',background:null},objects:[o],layers:[{id:'source',name:'Sources',visible:true,locked:false,objectIds:[o.id]}],objectGroups:[],layerTree:null});history.reset()
})
afterEach(cleanup)
it('renders a StrictMode preview without mutation, invalidates options and applies one transaction',async()=>{
 render(<StrictMode><AutomaticLabels/></StrictMode>);fireEvent.click(screen.getByRole('button',{name:'Automatic labels…'}));const before=useProjectStore.getState().objects
 fireEvent.click(screen.getByRole('button',{name:'Preview labels'}));await screen.findByAltText('Automatic label preview');expect(useProjectStore.getState().objects).toBe(before);expect(useHistoryStore.getState().undoCount).toBe(0)
 fireEvent.change(screen.getByLabelText('Automatic label density'),{target:{value:'high'}});expect(screen.getByRole('button',{name:'Apply labels'})).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'Preview labels'}));await screen.findByAltText('Automatic label preview');fireEvent.click(screen.getByRole('button',{name:'Apply labels'}));await waitFor(()=>expect(useHistoryStore.getState().undoCount).toBe(1));expect(screen.queryByRole('dialog')).toBeNull()
})
it('does not expose the action on battlemaps',()=>{useProjectStore.setState(s=>({map:{...s.map,mapType:'battlemap'}}));render(<AutomaticLabels/>);expect(screen.queryByRole('button')).toBeNull()})
