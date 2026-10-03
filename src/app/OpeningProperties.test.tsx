import { render,screen,fireEvent } from '@testing-library/react'
import { expect,it } from 'vitest'
import { OpeningProperties } from './OpeningProperties'
import { createWall,SIMPLE_WALL } from '../domain/walls'
import { createOpening } from '../domain/openings'
import { defaultMapStyle } from '../domain/mapSettings'
import { useProjectStore as store } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history } from '../store/history'
import type { WindowObject } from '../domain/models'
it('authors only aperture transmission, validates Apply, and preserves native window identity',()=>{
 const wall=createWall([{id:'a',x:50,y:100,mode:'corner'},{id:'b',x:350,y:100,mode:'corner'}],false,SIMPLE_WALL),window=createOpening(wall,.5,'window',40) as WindowObject
 store.setState({map:{...defaultMapStyle(),width:400,height:300,background:null,campfireRevision:1},objects:[wall,window],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[wall.id,window.id]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]}});editor.setState({activeLayerId:'objects',soloLayerId:null});history.reset()
 render(<OpeningProperties object={window}/>);fireEvent.click(screen.getByLabelText('Transmit exterior light'));fireEvent.change(screen.getByLabelText('Exterior light transmission'),{target:{value:'.6'}});fireEvent.click(screen.getByRole('button',{name:'Apply opening properties'}))
 expect(store.getState().objects.find(o=>o.id===window.id)).toMatchObject({exteriorLight:{transmitsExteriorLight:true,exteriorLightTransmission:.6}})
 fireEvent.change(screen.getByLabelText('Exterior light transmission'),{target:{value:'2'}});fireEvent.submit(screen.getByRole('button',{name:'Apply opening properties'}).closest('form')!);expect(screen.getByRole('alert')).toHaveTextContent('Invalid Window Light');expect((store.getState().objects[1] as WindowObject).exteriorLight!.exteriorLightTransmission).toBe(.6)
 history.undo();expect(store.getState().objects[1]).toEqual(window)
})
