import {beforeEach,expect,it,vi} from 'vitest'
import {fireEvent,render,screen,within} from '@testing-library/react'
import {MarkerWizard} from './MarkerWizard'
import {MarkerProperties} from './MarkerProperties'
import {createMarkerBundle} from '../domain/markers'
import {markerDefaults} from '../domain/markerRegistry'
import {createPlace} from '../domain/annotations'
import type {PlaceObject} from '../domain/annotations'
import {defaultMapStyle} from '../domain/mapSettings'
import {defaultGeography} from '../domain/geography'
import {createLayeredContent} from '../domain/layers'
import {useEditorStore as editor} from '../store/editorStore'
import {useProjectStore as project} from '../store/projectStore'
import {history} from '../store/history'
vi.mock('../canvas/annotationFonts',()=>({loadAnnotationFonts:()=>new Promise(()=>{})}))
const map={width:1200,height:800,...defaultMapStyle(),background:null,mapType:'regional-map' as const,geography:defaultGeography()}
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};project.setState({map,...createLayeredContent(),objectGroups:[],layerTree:null});editor.setState({...editor.getInitialState(),activeLayerId:'objects',markerWizard:true});history.reset()})
it('filters icons by type, accepts style/prominence/label choices and enters placement without creating objects',()=>{
 render(<MarkerWizard/>);expect(screen.getByLabelText('Marker name')).toHaveFocus();expect(screen.getByLabelText('Show label')).toBeChecked()
 fireEvent.change(screen.getByLabelText('Marker type'),{target:{value:'harbor'}});expect(screen.getByRole('button',{name:'Anchor'})).toBeVisible();expect(screen.queryByRole('button',{name:'Broken tower'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Sailing harbor'}));fireEvent.change(screen.getByLabelText('Marker style'),{target:{value:'parchment'}})
 fireEvent.change(screen.getByLabelText('Marker prominence'),{target:{value:'primary'}});fireEvent.change(screen.getByLabelText('Marker label position'),{target:{value:'left'}})
 fireEvent.change(screen.getByLabelText('Marker name'),{target:{value:'Port Hope'}});fireEvent.submit(screen.getByLabelText('Marker name').closest('form')!)
 expect(editor.getState()).toMatchObject({activeTool:'place',markerWizard:false,markerChoice:{name:'Port Hope',type:'harbor',label:true,position:'left',marker:{iconId:'ship',style:'parchment',prominence:'primary'}}});expect(project.getState().objects).toEqual([])
})
it('Cancel and Escape leave the map and active tool unchanged',()=>{
 const view=render(<MarkerWizard/>);fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(project.getState().objects).toEqual([]);expect(editor.getState()).toMatchObject({activeTool:'select',markerWizard:false});view.unmount()
 editor.setState({markerWizard:true});render(<MarkerWizard/>);fireEvent.keyDown(screen.getByLabelText('Marker name'),{key:'Escape'});expect(editor.getState().markerWizard).toBe(false)
})
it('edits semantic Properties before Advanced, including icon, style, type, label and prominence',()=>{
 const bundle=createMarkerBundle({x:300,y:300},markerDefaults('regional-map'),map);project.getState().addAnnotations(bundle);render(<MarkerProperties object={bundle[0] as PlaceObject}/>)
 const form=screen.getByLabelText('Marker name').closest('form')!,advanced=screen.getByText('Advanced').closest('details')!
 expect(within(advanced).getByLabelText('Symbol anchor')).toBeInTheDocument();expect(within(advanced).getByLabelText('Symbol size mode')).toBeInTheDocument();expect(form.compareDocumentPosition(advanced)&Node.DOCUMENT_POSITION_CONTAINED_BY).toBeTruthy()
 expect(screen.queryByRole('button',{name:'Choose symbol'})).toBeNull();expect(screen.queryByRole('button',{name:'Use custom asset…'})).toBeNull()
 fireEvent.change(screen.getByLabelText('Marker type'),{target:{value:'ruin'}});fireEvent.change(screen.getByLabelText('Marker style'),{target:{value:'technical'}});fireEvent.click(screen.getByRole('button',{name:'Change marker icon…'}));fireEvent.click(screen.getByRole('button',{name:'Ruined arch'}));fireEvent.change(screen.getByLabelText('Marker prominence'),{target:{value:'minor'}})
 fireEvent.change(screen.getByLabelText('Marker name'),{target:{value:'Old ruins'}});fireEvent.change(screen.getByLabelText('Marker label position'),{target:{value:'above'}});fireEvent.click(screen.getByRole('button',{name:'Apply properties'}))
 expect(project.getState().objects[0]).toMatchObject({name:'Old ruins',placeType:'ruin',marker:{iconId:'arch',style:'technical',prominence:'minor'}});expect(project.getState().objects[1]).toMatchObject({text:'Old ruins',preset:'above'})
 fireEvent.click(screen.getByLabelText('Show label'));fireEvent.click(screen.getByRole('button',{name:'Apply properties'}));expect(project.getState().objects).toHaveLength(1);history.undo();expect(project.getState().objects).toHaveLength(2)
})
it('keeps legacy custom assets editable only under Advanced and converts only explicitly',()=>{
 const old={...createPlace({x:100,y:100},'Legacy','bespoke',map),assetId:'old-image',width:73,height:41};render(<MarkerProperties object={old}/>)
 expect(screen.getByText(/Legacy \/ Custom symbol/)).toBeVisible();const advanced=screen.getByText('Advanced').closest('details')!
 expect(within(advanced).getByText('Use custom asset…')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Use built-in marker…'}));expect(screen.getByLabelText('Marker type')).toHaveValue('custom');expect(screen.getByRole('spinbutton',{name:'Symbol width (px at 1×)',hidden:true})).toHaveValue(73)
})
