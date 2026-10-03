import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { AnnotationProperties } from './AnnotationProperties'
import { createLabel, DEFAULT_TEXT, labelTextStyle, restyleLabel, validateAnnotation } from '../domain/annotations'
import { paintAnnotation, paintText } from '../canvas/drawAnnotation'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { createLayeredContent } from '../domain/layers'
import { history } from '../store/history'
import { defaultGeography } from '../domain/geography'
import type { MapType } from '../domain/geography'
import { parseProject } from '../projects/format'
import { exportScene } from '../export/scene'
it.each(['battlemap','regional-map','world-map'] as MapType[])('creates explicit outlined, boxless labels for %s and round-trips the stored style',type=>{
 const label=createLabel({x:200,y:200},'Harbor',undefined,'below',type)
 expect(label.style).toEqual(labelTextStyle(type));expect(label.style.backgroundOpacity).toBe(0);expect(label.style.strokeWidth).toBeGreaterThan(0)
 const layered=createLayeredContent([label]),map={...project.getState().map,mapType:type,geography:defaultGeography(type)}
 const doc={...layered,objectGroups:[],layerTree:{roots:layered.layers.map(l=>l.id),groups:[]},map,formatVersion:12,id:'labels',name:'Labels',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',assets:[]}
 expect(parseProject(JSON.parse(JSON.stringify(doc))).objects).toEqual([label])
 const ctx={save:vi.fn(),restore:vi.fn(),scale:vi.fn(),fillRect:vi.fn(),fillText:vi.fn(),strokeText:vi.fn(),globalAlpha:1} as unknown as CanvasRenderingContext2D
 paintAnnotation(ctx,label,new Map());expect(ctx.fillRect).not.toHaveBeenCalled();expect(ctx.strokeText).toHaveBeenCalled();expect(ctx.fillText).toHaveBeenCalled()
})
it('preserves explicitly boxed legacy labels without adding new model fields',()=>{
 const legacy=restyleLabel(createLabel({x:200,y:200},'Old annotation'),{...DEFAULT_TEXT})
 const restored=validateAnnotation(JSON.parse(JSON.stringify(legacy)));expect(restored).toEqual(legacy)
 const ctx={save:vi.fn(),restore:vi.fn(),scale:vi.fn(),fillRect:vi.fn(),fillText:vi.fn(),strokeText:vi.fn(),globalAlpha:1} as unknown as CanvasRenderingContext2D
 paintAnnotation(ctx,legacy,new Map());expect(ctx.fillRect).toHaveBeenCalledOnce()
 expect(labelTextStyle('world-map').size).toBeGreaterThan(labelTextStyle('regional-map').size)
 expect(labelTextStyle('regional-map').size).toBeGreaterThan(labelTextStyle().size)
})
it('paints the whole halo before glyph fills to prevent overlaps from covering adjacent letters',()=>{
 const calls:string[]=[],ctx={strokeText:()=>calls.push('outline'),fillText:()=>calls.push('fill')} as unknown as CanvasRenderingContext2D
 paintText(ctx,'Town',0,30,labelTextStyle('regional-map'));expect(calls).toEqual(['outline','outline','outline','outline','fill','fill','fill','fill'])
})
it('edits independent label colors, halo and explicit background through Properties with undo',()=>{
 const label=createLabel({x:200,y:200},'Harbor');project.setState(createLayeredContent([label]));editor.setState({selectedObjectIds:[label.id],activeLayerId:'objects',soloLayerId:null});history.reset();render(<AnnotationProperties object={label}/>)
 expect(screen.getByLabelText('Label background style')).toHaveValue('none');expect(screen.queryByLabelText('Box color')).toBeNull()
 fireEvent.change(screen.getByLabelText('Text color'),{target:{value:'#eeeeee'}});fireEvent.change(screen.getByLabelText('Outline / halo color'),{target:{value:'#223344'}})
 fireEvent.change(screen.getByRole('spinbutton',{name:'Outline / halo width'}),{target:{value:'3'}});fireEvent.keyDown(screen.getByRole('spinbutton',{name:'Outline / halo width'}),{key:'Enter'})
 fireEvent.click(screen.getByRole('button',{name:'Apply properties'}));expect(project.getState().objects[0]).toMatchObject({style:{color:'#eeeeee',strokeColor:'#223344',strokeWidth:3,backgroundOpacity:0}})
 history.undo();expect(project.getState().objects[0]).toEqual(label)
})
it('export scene includes styled model labels and excludes editor selection state',()=>{
 const label=createLabel({x:200,y:200},'Export');const data={...project.getState(),...createLayeredContent([label])}
 editor.setState({selectedObjectIds:[label.id]})
 const scene=exportScene(data,{scale:1,transparent:true,includeGrid:false})
 expect(scene.items.find(i=>i.kind==='object')).toMatchObject({object:label})
 expect(JSON.stringify(scene)).not.toMatch(/selectedObjectIds|Transformer|selectionBounds/)
})
