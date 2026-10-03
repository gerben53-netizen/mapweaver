import {beforeEach,expect,it,vi} from 'vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {IllustratedMarkerPicker} from './IllustratedMarkerPicker'
import {MarkerWizard} from './MarkerWizard'
import {useEditorStore as editor} from '../store/editorStore'
import {useProjectStore as project} from '../store/projectStore'
import {defaultMapStyle} from '../domain/mapSettings'
import {defaultGeography} from '../domain/geography'
import {loadBundledMarkers,prepareMarkerAsset} from '../library/illustratedMarkers'
vi.mock('../library/illustratedMarkers',()=>({loadBundledMarkers:vi.fn(),prepareMarkerAsset:vi.fn()}))
vi.mock('../storage/api',()=>({api:()=>Promise.resolve({assets:[],total:0})}))
vi.mock('../canvas/annotationFonts',()=>({loadAnnotationFonts:()=>new Promise(()=>{})}))
const a={id:'city',name:'Stone city',tags:['marker:city','style:painterly'],applicableMapTypes:['world-map' as const],width:400,height:300,source:'bundled' as const,file:'city.png'}
beforeEach(()=>{vi.mocked(loadBundledMarkers).mockResolvedValue([a,{...a,id:'fort',name:'Castle',tags:['marker:fort']}]);vi.mocked(prepareMarkerAsset).mockResolvedValue({id:'adopted',aspect:4/3});HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};project.setState({map:{...defaultMapStyle(),background:null,width:2000,height:1200,mapType:'world-map',geography:defaultGeography('world-map')}});editor.setState(editor.getInitialState())})
it('offers semantic candidates, manual override and an unambiguous adopted selection',async()=>{
 const choose=vi.fn(),view=render(<IllustratedMarkerPicker type="city" mapType="world-map" onChoose={choose}/>)
 await screen.findByRole('button',{name:'Stone city'});expect(screen.queryByRole('button',{name:'Castle'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Stone city'}));await waitFor(()=>expect(choose).toHaveBeenCalledWith({id:'adopted',aspect:4/3}))
 view.rerender(<IllustratedMarkerPicker type="city" mapType="world-map" selected="adopted" onChoose={choose}/>);expect(screen.getByRole('button',{name:'Stone city'})).toHaveAttribute('aria-pressed','true')
 fireEvent.click(screen.getByLabelText(/manual override/));expect(await screen.findByRole('button',{name:'Castle'})).toBeVisible()
})
it('does not apply an asynchronous selection after the marker type changes',async()=>{
 let done!:(a:{id:string;aspect:number})=>void;vi.mocked(prepareMarkerAsset).mockImplementation(()=>new Promise(resolve=>{done=resolve}))
 const choose=vi.fn(),view=render(<IllustratedMarkerPicker type="city" mapType="world-map" onChoose={choose}/>)
 fireEvent.click(await screen.findByRole('button',{name:'Stone city'}));view.rerender(<IllustratedMarkerPicker type="fort" mapType="world-map" onChoose={choose}/>);done({id:'adopted',aspect:1});await screen.findByRole('button',{name:'Castle'});expect(choose).not.toHaveBeenCalled()
})
it('requires an illustration before placement and returns explicitly to intact Symbol controls',async()=>{
 render(<MarkerWizard/>);fireEvent.change(screen.getByLabelText('Marker type'),{target:{value:'city'}});fireEvent.change(screen.getByLabelText('Marker visual mode'),{target:{value:'illustrated'}})
 expect(screen.getByRole('button',{name:'Place on map'})).toBeDisabled();expect(screen.queryByLabelText('Marker style')).toBeNull()
 fireEvent.click(await screen.findByRole('button',{name:'Stone city'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Place on map'})).toBeEnabled());expect(screen.getByLabelText('Illustrated width (km)')).toHaveValue(1300)
 fireEvent.change(screen.getByLabelText('Marker visual mode'),{target:{value:'symbol'}});expect(screen.getByLabelText('Marker style')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Place on map'}));expect(editor.getState().markerChoice?.illustration).toBeUndefined()
})
