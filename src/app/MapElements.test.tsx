import { useRef } from 'react'
import { act,fireEvent,render,screen } from '@testing-library/react'
import { beforeEach,expect,it,vi } from 'vitest'
import { MapElementsMenu } from './MapElementsMenu'
import { AnnotationTools } from './AnnotationTools'
import { AnnotationProperties } from './AnnotationProperties'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { createLayeredContent } from '../domain/layers'
import { createMapElement } from '../domain/decorations'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
import { history,useHistoryStore } from '../store/history'
const map={width:1200,height:800,background:null,...defaultMapStyle(),mapType:'world-map' as const,geography:defaultGeography('world-map')}
beforeEach(()=>{project.setState({map,...createLayeredContent(),objectGroups:[],layerTree:null});editor.setState({activeTool:'select',elementPreset:null,activeLayerId:'objects',soloLayerId:null,selectedObjectIds:[],viewport:{zoom:1,pan:{x:0,y:0}}});history.reset()})
it('groups six choices, uses map defaults and restores focus on Escape',()=>{
 render(<MapElementsMenu/>);const trigger=screen.getByRole('button',{name:'Map Elements'});expect(screen.queryByRole('button',{name:'Compass'})).toBeNull();fireEvent.click(trigger)
 expect(screen.getByRole('region',{name:'Insert Map Elements'})).toBeVisible();expect(screen.getByRole('button',{name:'Compass'})).toHaveFocus()
 fireEvent.keyDown(document,{key:'Escape'});expect(screen.queryByRole('region')).toBeNull();expect(trigger).toHaveFocus()
 fireEvent.click(trigger);fireEvent.click(screen.getByRole('button',{name:'Compass'}));expect(editor.getState()).toMatchObject({activeTool:'compass',elementPreset:'ornate'});expect(trigger).toHaveFocus()
})
it('places a preset title without a creation modal, selects it and opens Properties as one undo action',()=>{
 function Harness(){const ref=useRef<HTMLDivElement>(null);return <><MapElementsMenu/><div ref={ref} aria-label="Canvas"/><AnnotationTools surface={ref}/></>}
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Map Elements'}));fireEvent.click(screen.getByRole('button',{name:/Title \/ Cartouche/}));fireEvent.change(screen.getByLabelText('New element preset'),{target:{value:'banner'}})
 const canvas=screen.getByLabelText('Canvas');for(const type of ['pointerdown','pointerup'])fireEvent(canvas,new MouseEvent(type,{bubbles:true,clientX:300,clientY:200,button:0}))
 expect(project.getState().objects).toHaveLength(1);expect(project.getState().objects[0]).toMatchObject({kind:'title',elementPreset:'banner'});expect(screen.queryByRole('dialog')).toBeNull();expect(editor.getState()).toMatchObject({activeTool:'select',inspector:'properties',selectedObjectIds:[project.getState().objects[0].id]});expect(useHistoryStore.getState().undoCount).toBe(1)
 act(()=>history.undo());expect(project.getState().objects).toHaveLength(0)
})
it.each(['title','infoPanel','legend','compass','scaleBar'] as const)('shows applicable %s fields and commits preset/content edits with undo',kind=>{
 const object=createMapElement(kind,{x:200,y:200},map);project.setState(createLayeredContent([object]));editor.setState({selectedObjectIds:[object.id]});render(<AnnotationProperties object={object}/>)
 fireEvent.change(screen.getByLabelText('Element style preset'),{target:{value:kind==='title'?'banner':'parchment'}})
 if(kind==='title'||kind==='infoPanel'){fireEvent.change(screen.getByLabelText('Element title'),{target:{value:'Amber Coast'}});fireEvent.change(screen.getByLabelText(kind==='title'?'Subtitle':'Panel content'),{target:{value:'Harbor\nNorth gate'}});expect(screen.queryByLabelText('Label background style')).toBeNull()}
 if(kind==='compass'){fireEvent.click(screen.getByRole('checkbox',{name:'North label'}));expect(screen.queryByLabelText('Panel content')).toBeNull()}
 if(kind==='scaleBar'){expect(screen.getByRole('spinbutton',{name:'Displayed distance'})).toBeVisible();fireEvent.change(screen.getByLabelText('Scale bar unit'),{target:{value:'mi'}})}
 if(kind==='legend'){fireEvent.click(screen.getByRole('button',{name:'Add entry'}));fireEvent.change(screen.getByLabelText('Entry 1'),{target:{value:'Capital'}})}
 fireEvent.click(screen.getByRole('button',{name:'Apply properties'}));expect(project.getState().objects[0]).toMatchObject({elementPreset:kind==='title'?'banner':'parchment'})
 if(kind==='title'||kind==='infoPanel')expect(project.getState().objects[0]).toMatchObject({title:'Amber Coast',body:'Harbor\nNorth gate'})
 if(kind==='compass')expect(project.getState().objects[0]).toMatchObject({northLabel:false})
 if(kind==='legend')expect(project.getState().objects[0]).toMatchObject({entries:[{text:'Capital'}]})
 expect(screen.queryByRole('alert')).toBeNull();act(()=>history.undo());expect(project.getState().objects[0]).toEqual(object)
})
it('shows scale configuration state instead of an editable fabricated distance',()=>{
 const battle={...map,mapType:'battlemap' as const};project.setState({map:battle});const object=createMapElement('scaleBar',{x:200,y:200},battle);render(<AnnotationProperties object={object}/>)
 expect(screen.getByRole('status')).toHaveTextContent('Scale unavailable');expect(screen.queryByRole('spinbutton',{name:'Displayed distance'})).toBeNull()
})
it('allows normal keyboard text entry without triggering object deletion',()=>{
 const object=createMapElement('infoPanel',{x:200,y:200},map);project.setState(createLayeredContent([object]));render(<AnnotationProperties object={object}/>);const text=screen.getByLabelText('Panel content');text.focus();fireEvent.change(text,{target:{value:'Keep note'}});fireEvent.keyDown(text,{key:'Delete'});expect(project.getState().objects).toHaveLength(1)
 const spy=vi.spyOn(project.getState(),'updateAnnotations');fireEvent.click(screen.getByRole('button',{name:'Apply properties'}));expect(spy).toHaveBeenCalledOnce()
})
