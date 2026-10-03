import { defaultGeography } from '../domain/geography'
import { applyPrepared } from '../projects/session'
import { parseProject } from '../projects/format'
import { WallTools } from '../app/WallTools'
import { useRef } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { usePathDrawing } from './usePathDrawing'
import { useOpeningPlacement } from './useOpeningPlacement'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history } from '../store/history'
import { createLayeredContent } from '../domain/layers'
import { defaultMapStyle } from '../domain/mapSettings'
import { createWall, SIMPLE_WALL, wallStyle } from '../domain/walls'
import { generatedWallStyle } from '../domain/generatedWalls'
import { isOpening, openingPlacement } from '../domain/openings'
import { pathGeometry, withPathGeometry } from '../domain/paths'
import { PathProperties } from '../app/PathProperties'
import type { PathObject } from '../domain/models'
const map={width:1200,height:800,background:null,...defaultMapStyle()}
function Harness(){const ref=useRef<HTMLDivElement>(null);usePathDrawing(ref);useOpeningPlacement(ref);return <div ref={ref} tabIndex={0} aria-label="Canvas"/>}
let canvas:HTMLElement
beforeEach(()=>{
 project.setState({...createLayeredContent(),map})
 editor.setState({activeTool:'wall',activeLayerId:'objects',soloLayerId:null,selectedObjectIds:[],pathMode:'straight',wallStyle:structuredClone(SIMPLE_WALL),continueWall:null,objectSnap:false,wallSnap:null,openingWidth:40,openingKind:'door',viewport:{zoom:1,pan:{x:0,y:0}}})
 history.reset();render(<Harness/>);canvas=screen.getByLabelText('Canvas');canvas.setPointerCapture=vi.fn();canvas.releasePointerCapture=vi.fn();canvas.hasPointerCapture=vi.fn(()=>false)
})
afterEach(cleanup)
function pointer(type:string,x:number,y:number){const e=new MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperty(e,'pointerId',{value:1});fireEvent(canvas,e)}
function click(x:number,y:number){pointer('pointerdown',x,y);pointer('pointerup',x,y)}
const walls=()=>project.getState().objects.filter((o):o is PathObject=>o.kind==='path')
it.each(['simple','generated'])('%s corridor: mixed straight/curve, Enter/double-click, three manual openings, both extension ends and undo',kind=>{
 if(kind==='generated')act(()=>editor.setState({wallStyle:generatedWallStyle(SIMPLE_WALL,map)}))
 click(100,150);click(500,150)
 act(()=>editor.setState({pathMode:'curved'}))
 pointer('pointerdown',900,150);pointer('pointermove',940,190);pointer('pointerup',940,190)
 fireEvent.keyDown(canvas,{key:'Enter'})
 act(()=>editor.setState({pathMode:'straight'}))
 click(100,350);click(500,350);click(900,350);click(900,350);fireEvent.doubleClick(canvas)
 expect(walls()).toHaveLength(2);expect(walls().every(w=>!w.closed)).toBe(true)
 expect(walls()[0].nodes).toHaveLength(3);expect(walls()[0].nodes[2].in).toEqual({x:-40,y:-40})
 expect(project.getState().objects.some(o=>o.kind==='area')).toBe(false)
 act(()=>editor.setState({activeTool:'opening',openingKind:'passage'}));click(250,150);click(250,350);click(650,350)
 expect(project.getState().objects.filter(isOpening)).toHaveLength(3)
 expect(project.getState().objects.filter(isOpening).every(o=>o.kind==='door'&&o.doorType==='passage')).toBe(true)
 for(const endpoint of ['end','start'] as const){
  const wall=walls()[1],before=structuredClone(project.getState().objects),openings=before.filter(isOpening).filter(o=>o.wallId===wall.id),centers=openings.map(o=>openingPlacement(o,wall).point)
  act(()=>editor.setState({activeTool:'wall',wallStyle:wallStyle(wall),continueWall:{id:wall.id,endpoint}}))
  click(endpoint==='end'?1050:50,350);fireEvent.keyDown(canvas,{key:'Enter'})
  const after=project.getState().objects,w=walls()[1]
  expect(w.closed).toBe(false);expect(w.nodes).toHaveLength(wall.nodes.length+1)
  for(const [i,o] of after.filter(isOpening).filter(o=>o.wallId===w.id).entries()){
   const p=openingPlacement(o,w).point;expect(p.x).toBeCloseTo(centers[i].x);expect(p.y).toBeCloseTo(centers[i].y)
  }
  act(()=>history.undo());expect(project.getState().objects).toEqual(before)
  act(()=>history.redo());expect(project.getState().objects).toEqual(after)
 }
})
it('explicit start click closes; Open/Close Path preserves nodes and attached centers',()=>{
 click(100,100);click(600,100);click(600,600);click(100,100)
 const closed=walls()[0];expect(closed.closed).toBe(true)
 act(()=>editor.setState({activeTool:'opening'}));click(300,100)
 const opening=project.getState().objects.find(isOpening)!,center=openingPlacement(opening,closed).point
 act(()=>editor.setState({activeTool:'select'}))
 const view=render(<PathProperties object={closed} section="geometry"/>);fireEvent.click(screen.getByRole('button',{name:'Open Path'}))
 const open=walls()[0];expect(open.closed).toBe(false);expect(open.nodes).toEqual(closed.nodes)
 expect(openingPlacement(project.getState().objects.find(isOpening)!,open).point.x).toBeCloseTo(center.x)
 view.rerender(<PathProperties object={open} section="geometry"/>);fireEvent.click(screen.getByRole('button',{name:'Close Path'}))
 expect(walls()[0].closed).toBe(true);expect(walls()[0].nodes).toEqual(closed.nodes)
 act(()=>history.undo());expect(walls()[0].closed).toBe(false)
})
it('refuses removal of a closing segment with an attached door without modifying the scene',()=>{
 const wall=createWall([{id:'a',x:100,y:100,mode:'corner'},{id:'b',x:600,y:100,mode:'corner'},{id:'c',x:600,y:600,mode:'corner'}],true)
 act(()=>project.getState().addPath(wall));act(()=>editor.setState({activeTool:'opening'}));click(300,300)
 expect(project.getState().objects.filter(isOpening)).toHaveLength(1)
 const before=project.getState().objects
 expect(()=>project.getState().updatePath(withPathGeometry({...wall,closed:false}))).toThrow()
 expect(project.getState().objects).toEqual(before)
 expect(pathGeometry(walls()[0]).segments).toHaveLength(3)
})

it.each(['Enter','double-click','start-node'])('loaded room style cannot classify a new 1ft generated wall as outside: %s',finish=>{
 const room=createWall([{id:'r1',x:50,y:50,mode:'corner'},{id:'r2',x:200,y:50,mode:'corner'},{id:'r3',x:200,y:200,mode:'corner'}],true,{...SIMPLE_WALL,strokeWidth:10,wall:{...SIMPLE_WALL.wall,alignment:'outside'}})
 const date=new Date().toISOString(),document=parseProject({formatVersion:12,id:'regression',name:'Room project',createdAt:date,modifiedAt:date,map:{...map,mapType:'battlemap',geography:defaultGeography()},objects:[room],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[room.id]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]})
 act(()=>{applyPrepared({document,assets:new Map()},()=>true);editor.setState({activeTool:'wall',pathMode:'curved'})})
 expect(editor.getState().wallStyle.wall.alignment).toBeUndefined()
 expect(editor.getState().customWallStyle.wall.alignment).toBeUndefined()
 render(<WallTools/>);fireEvent.change(screen.getByLabelText('Wall material or generator'),{target:{value:'living-root@production-1'}});fireEvent.change(screen.getByLabelText('Generated wall width'),{target:{value:'1'}})
 const unchanged=project.getState().objects[0]
 click(300,300);pointer('pointerdown',700,300);pointer('pointermove',750,330);pointer('pointerup',750,330);click(700,600)
 if(finish==='start-node')click(300,300);else if(finish==='Enter')fireEvent.keyDown(canvas,{key:'Enter'});else{click(700,600);fireEvent.doubleClick(canvas)}
 expect(walls()).toHaveLength(2);const created=walls()[1]
 expect(created.closed).toBe(finish==='start-node');expect(created.strokeWidth).toBe(10);expect(created.wall).toMatchObject({renderingMode:'generated',unit:'ft',pixelsPerUnit:10});expect(created.wall?.alignment).toBeUndefined()
 expect(project.getState().objects[0]).toEqual(unchanged)
 const after=project.getState().objects;act(()=>history.undo());expect(project.getState().objects).toEqual([unchanged]);act(()=>history.redo());expect(project.getState().objects).toEqual(after)
 const saved=parseProject({...document,objects:after,layers:project.getState().layers});act(()=>{applyPrepared({document:saved,assets:new Map()},()=>true)})
 expect(walls()[1]).toEqual(created);expect(walls()[0]).toEqual(unchanged)
})
it('freehand admission also ignores stale outside tool state without changing that source style',()=>{
 const stale={...generatedWallStyle(SIMPLE_WALL,map),wall:{...generatedWallStyle(SIMPLE_WALL,map).wall,alignment:'outside' as const}}
 act(()=>editor.setState({wallStyle:stale,pathMode:'curved'}));click(100,200);click(500,200);click(500,500);fireEvent.keyDown(canvas,{key:'Enter'})
 expect(walls()).toHaveLength(1);expect(walls()[0].closed).toBe(false);expect(walls()[0].wall?.alignment).toBeUndefined();expect(stale.wall.alignment).toBe('outside')
})
