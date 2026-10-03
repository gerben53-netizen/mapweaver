import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { TitleProperties } from './TitleProperties'
import { TitlePresetPicker } from './TitlePresetPicker'
import { createMapElement, panelLayout } from '../domain/decorations'
import type { TextPanelObject } from '../domain/decorations'
import { elementPreset, defaultElementPreset } from '../domain/cartographicPresets'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { createLayeredContent } from '../domain/layers'
import { validateAnnotation } from '../domain/annotations'
import { parseProject } from '../projects/format'
import { defaultGeography } from '../domain/geography'
import { history } from '../store/history'
vi.mock('../canvas/annotationFonts',()=>({loadAnnotationFonts:()=>new Promise(()=>{})}))
const make=(id='ribbon')=>createMapElement('title',{x:500,y:300},project.getState().map,[],elementPreset('title',id).id) as TextPanelObject
beforeEach(()=>{history.reset();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}})
it('registers internal carriers for all map types and defaults only new titles',()=>{
 for(const id of ['ribbon','scroll','fantasy','plaque']){const p=elementPreset('title',id),o=make(id);expect(p.titleCarrier).toBeDefined();expect(p.mapTypes).toEqual(['battlemap','regional-map','world-map']);expect(validateAnnotation(o)).toEqual(o)}

 expect(defaultElementPreset('title','battlemap')).toBe('simple');expect(defaultElementPreset('title','regional-map')).toBe('ribbon');expect(defaultElementPreset('title','world-map')).toBe('fantasy')
 expect(elementPreset('title',undefined).id).toBe('simple');expect(elementPreset('title','unknown').id).toBe('simple')
})
it('fits long text to a minimum and reports overflow without truncating content',()=>{
 const o=make(),normal=panelLayout(o),long=panelLayout({...o,title:'The ancient kingdoms of the northern coast'})
 expect(long.titleStyle.size).toBeLessThan(normal.titleStyle.size);expect(long.titleStyle.size).toBeGreaterThanOrEqual(12)
 const extreme=panelLayout({...o,title:'W'.repeat(120),body:'subtitle'.repeat(100)})
 expect(extreme.overflow).toBe(true);expect(extreme.title.lines.join('')).toBe('W'.repeat(120))
 expect(extreme.body.lines.join('')).toBe('subtitle'.repeat(100))
 expect(panelLayout({...o,body:'An atlas'}).overflow).toBe(false)
})
it('keeps old layouts and saved title/preset/overrides independent',()=>{
 for(const id of ['simple','banner','cartouche','ornate','parchment','ribbon','scroll','fantasy','plaque']){
  const o={...make(id),title:'The Amber Coast',body:'An atlas',color:'#123456',style:{...make(id).style,italic:true},rotation:21,opacity:.6}
  const layered=createLayeredContent([o]),doc={formatVersion:12,id:'titles',name:'Titles',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',map:{...project.getState().map,mapType:'battlemap',geography:defaultGeography('battlemap')},...layered,objectGroups:[],layerTree:{roots:layered.layers.map(l=>l.id),groups:[]},assets:[]}
  expect(parseProject(JSON.parse(JSON.stringify(doc))).objects).toEqual([o]);expect(o).not.toHaveProperty('titleCarrier')
  if(['simple','banner','cartouche','ornate','parchment'].includes(id)){expect(panelLayout(o).pad).toBe(22+o.style.strokeWidth);expect(panelLayout(o).width).toBe(o.style.maxWidth+44+2*o.style.strokeWidth)}
 }
})
it('edits title and subtitle, switches carrier, resizes proportionally, and undoes the edit',()=>{
 const o=make();const layered=createLayeredContent([o]);project.setState(layered);editor.setState({activeLayerId:layered.layers[0].id,selectedObjectIds:[o.id],soloLayerId:null});history.reset()
 render(<TitleProperties object={o}/>);fireEvent.change(screen.getByLabelText('Element title'),{target:{value:'Northern lands'}});fireEvent.change(screen.getByLabelText('Subtitle'),{target:{value:'An atlas'}})
 fireEvent.change(screen.getByLabelText('Element style preset'),{target:{value:'scroll'}});fireEvent.change(screen.getByLabelText('Element width'),{target:{value:'800'}});fireEvent.blur(screen.getByLabelText('Element width'));fireEvent.click(screen.getByRole('button',{name:'Apply properties'}))
 const saved=project.getState().objects[0] as TextPanelObject;expect(saved).toMatchObject({title:'Northern lands',body:'An atlas',elementPreset:'scroll',width:800});expect(saved.width/saved.height).toBeCloseTo(4)
 history.undo();expect(project.getState().objects[0]).toEqual(o);history.redo();expect(project.getState().objects[0]).toEqual(saved)
})
it('offers accessible previews and arrow-key navigation without changing until chosen',()=>{
 const change=vi.fn();render(<TitlePresetPicker value="ribbon" onChange={change}/>);fireEvent.click(screen.getByRole('button',{name:'Preview title styles…'}))
 const ribbon=screen.getByRole('button',{name:'Ribbon Banner'});expect(ribbon).toHaveAttribute('aria-pressed','true');expect(ribbon).toHaveTextContent('✓')
 ribbon.focus();fireEvent.keyDown(ribbon,{key:'ArrowRight'});expect(screen.getByRole('button',{name:'Parchment Banner'})).toHaveFocus();expect(change).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'Parchment Banner'}));expect(change).toHaveBeenCalledWith('scroll')
})
