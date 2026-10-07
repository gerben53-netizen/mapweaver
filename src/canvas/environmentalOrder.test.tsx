import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { MapContent } from './MapContent'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { defaultMapStyle } from '../domain/mapSettings'
import { createArea, rectangleGeometry } from '../domain/areas'
import { createWall } from '../domain/walls'
import { createOpening } from '../domain/openings'
import { emptyEnvironmentalDetail } from '../domain/environmentalDetail'
import { exportScene } from '../export/scene'
import type { StampObject } from '../domain/models'
vi.mock('react-konva/lib/ReactKonvaCore',()=>({Group:({children}:{children:ReactNode})=><div>{children}</div>,Shape:()=>null,Text:()=>null,Image:()=>null,Rect:()=>null,Transformer:()=>null}))
vi.mock('./EnvironmentalDetailNode',()=>({EnvironmentalDetailNode:({tier}:{tier:string})=><i data-order={'environmental'+(tier==='floor'?'Floor':'Edge')}/>}))
vi.mock('./EditableStamp',()=>({EditableStamp:({object}:{object:{id:string}})=><i data-order={object.id}/>}))
vi.mock('./OpeningNode',()=>({OpeningNode:({object}:{object:{id:string}})=><i data-order={object.id}/>}))
it('the actual editor component inserts both strata before wall and opening, exactly like 1×/2× export; overlays remain separate',()=>{
 const map={...defaultMapStyle(),width:600,height:400,background:null,environmentalDetail:emptyEnvironmentalDetail()},floor=createArea(rectangleGeometry({x:0,y:0,width:600,height:400})),wall=createWall([{id:'a',x:40,y:100,mode:'corner'},{id:'b',x:500,y:100,mode:'corner'}]),door=createOpening(wall,.5,'door',40),window=createOpening(wall,.8,'window',30)
 const prop:StampObject={kind:'stamp',id:'prop',assetId:'image',x:40,y:40,width:30,height:30,opacity:1,rotation:0,scaleX:1,scaleY:1},ceiling={...floor,id:'ceiling',ceiling:true as const},objects=[prop,wall,door,window,floor,ceiling],layers=[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],state={map,objects,layers,objectGroups:[],layerTree:{roots:['objects'],groups:[]}}
 useProjectStore.setState(state);useEditorStore.setState({activeTool:'select',selectedObjectIds:[],ceilingsVisible:true,soloLayerId:null,annotationPreview:[],areaPreview:null})
 const view=render(<MapContent map={map} objects={objects}/>),order=Array.from(view.container.querySelectorAll('[data-order]'),e=>e.getAttribute('data-order'))
 expect(order).toEqual([floor.id,'environmentalFloor','environmentalEdge',wall.id,door.id,prop.id,window.id,ceiling.id])
 for(const scale of [1,2] as const)expect(exportScene(state,{scale,includeGrid:false,transparent:true}).items.map(i=>i.kind==='object'?i.object.id:i.kind)).toEqual(order.filter(id=>id!==ceiling.id))
})
