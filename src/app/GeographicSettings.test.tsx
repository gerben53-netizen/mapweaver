import {beforeEach,expect,it} from 'vitest'
import {fireEvent,render,screen,cleanup} from '@testing-library/react'
import {GeographicSettings} from './GeographicSettings'
import {defaultGeography} from '../domain/geography'
import {defaultMapStyle} from '../domain/mapSettings'
import {useProjectStore as store} from '../store/projectStore'
import {history} from '../store/history'
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false};cleanup();store.setState({map:{width:1000,height:600,...defaultMapStyle(),background:null,mapType:'regional-map',geography:defaultGeography()},objects:[],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:null});history.reset()})
it('keeps an invalid numeric draft editable and reports errors without crashing or changing the map',()=>{
 const map=store.getState().map;render(<GeographicSettings map={map}/>);fireEvent.change(screen.getByLabelText('Map width in distance'),{target:{value:''}});fireEvent.click(screen.getByText('Preview workspace change'));expect(screen.getByRole('alert').textContent).toMatch(/positive/);expect(store.getState().map).toBe(map)
})
it('previews scale/type consequences, cancels and applies exactly one undoable change',()=>{
 const map=store.getState().map;render(<GeographicSettings map={map}/>);fireEvent.change(screen.getByLabelText('Map type'),{target:{value:'world-map'}});fireEvent.change(screen.getByLabelText('Map width in distance'),{target:{value:'20000'}});fireEvent.click(screen.getByText('Preview workspace change'));expect(store.getState().map).toBe(map);fireEvent.click(screen.getByText('Cancel'));expect(store.getState().map).toBe(map);fireEvent.click(screen.getByText('Preview workspace change'));fireEvent.click(screen.getByText('Apply workspace change'));expect(store.getState().map.mapType).toBe('world-map');expect(store.getState().map.geography?.widthKm).toBe(20000);history.undo();expect(store.getState().map).toEqual(map)
})
