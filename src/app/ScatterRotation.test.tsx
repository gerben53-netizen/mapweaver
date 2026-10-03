import { fireEvent, render, screen, within, act } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { ScatterTools } from './ScatterTools'
import { useEditorStore as editor } from '../store/editorStore'
import { useProjectStore as project } from '../store/projectStore'
import { scatterDefaults } from '../domain/scatter'
import { watchMapToolContext } from '../store/mapToolContext'
beforeEach(()=>editor.setState({...editor.getInitialState(),activeTool:'scatter',scatterSettings:scatterDefaults('world-map')}))
it('places Rotation between Spacing and Paint without a dialog or range fields',()=>{
 render(<ScatterTools/>)
 const bar=screen.getByLabelText('Scatter controls'),spacing=within(bar).getByLabelText('Brush spacing'),rotation=within(bar).getByLabelText('Scatter rotation'),paint=within(bar).getByLabelText('Scatter mode')
 expect(spacing.compareDocumentPosition(rotation)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 expect(rotation.compareDocumentPosition(paint)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 expect(rotation).toHaveValue('none')
 expect(screen.queryByLabelText('Minimum rotation offset')).toBeNull()
 fireEvent.change(rotation,{target:{value:'range'}})
 expect(screen.getByLabelText('Minimum rotation offset')).toHaveValue(-15)
 expect(screen.getByLabelText('Maximum rotation offset')).toHaveValue(15)
 expect(screen.queryByRole('dialog')).toBeNull()
 fireEvent.change(rotation,{target:{value:'random'}})
 expect(screen.queryByLabelText('Minimum rotation offset')).toBeNull()
})
it('allows signed drafts and rejects invalid ranges before committing',()=>{
 render(<ScatterTools/>)
 fireEvent.change(screen.getByLabelText('Scatter rotation'),{target:{value:'range'}})
 const min=screen.getByLabelText('Minimum rotation offset')
 fireEvent.change(min,{target:{value:'20'}});fireEvent.blur(min)
 expect(min).toHaveAttribute('aria-invalid','true')
 expect(editor.getState().scatterSettings.rotationMin).toBe(-15)
 fireEvent.change(min,{target:{value:''}});fireEvent.blur(min)
 expect(editor.getState().scatterSettings.rotationMin).toBe(-15)
 fireEvent.change(min,{target:{value:'-5'}});fireEvent.blur(min)
 expect(editor.getState().scatterSettings.rotationMin).toBe(-5)
})
it('resets only new-operation settings on map context changes',()=>{
 const stop=watchMapToolContext(),objects=project.getState().objects
 try {for(const mapType of ['battlemap','regional-map','world-map'] as const){act(()=>project.setState(s=>({map:{...s.map,mapType}})));expect(editor.getState().scatterSettings.rotationMode).toBe(mapType==='battlemap'?'random':'none');expect(project.getState().objects).toBe(objects)}}finally{stop()}
})
