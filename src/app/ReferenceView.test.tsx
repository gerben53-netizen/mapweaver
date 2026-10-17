import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ReferenceView } from './ReferenceView'
import { calculateReferenceCalibration, useReferenceViewStore } from '../store/referenceViewStore'
import { currentSnapshot } from '../projects/session'
import { readImage } from '../imports/readImage'
import { ReferenceMapOverlay } from '../canvas/ReferenceMapOverlay'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
vi.mock('../imports/readImage',()=>({readImage:vi.fn(async(file:File)=>({blob:file,width:100,height:80}))}))
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();useReferenceViewStore.setState({open:false})})
it('loads, zooms and hides an editor reference without changing any project data',async()=>{
 const revoke=vi.fn();vi.stubGlobal('URL',class extends URL {static createObjectURL(){return 'blob:reference-test'}static revokeObjectURL=revoke})
 const before=structuredClone(currentSnapshot());useReferenceViewStore.setState({open:true});render(<ReferenceView/>)
 fireEvent.change(screen.getByLabelText('Load reference image'),{target:{files:[new File(['pixels'],'reference.png',{type:'image/png'})]}})
 await waitFor(()=>expect(screen.getByAltText('Editor-only reference')).toBeInTheDocument())
 expect(screen.getByRole('button',{name:'Calibrate'})).toBeDisabled()
 const surface=screen.getByLabelText('Reference image viewport'),image=screen.getByAltText('Editor-only reference'),initial=image.style.transform
 fireEvent.keyDown(surface,{key:'ArrowRight'});expect(image.style.transform).not.toBe(initial)
 const panned=image.style.transform;fireEvent.wheel(surface,{deltaY:-100,clientX:20,clientY:20});expect(image.style.transform).not.toBe(panned)
 fireEvent.click(screen.getByRole('button',{name:'Zoom reference in'}));fireEvent.change(screen.getByLabelText('Reference panel width'),{target:{value:420}})
 fireEvent.click(screen.getByRole('button',{name:'Hide reference view'}));expect(useReferenceViewStore.getState().open).toBe(false)
 expect(currentSnapshot()).toEqual(before);expect(revoke).not.toHaveBeenCalled()
 cleanup();expect(revoke).toHaveBeenCalledWith('blob:reference-test');vi.unstubAllGlobals()
})
it('reports invalid input without replacing the existing reference or touching the map',async()=>{
 vi.mocked(readImage).mockRejectedValueOnce(Error('The image is damaged.'))
 useReferenceViewStore.setState({open:true});render(<ReferenceView/>);const before=currentSnapshot()
 fireEvent.change(screen.getByLabelText('Load reference image'),{target:{files:[new File(['bad'],'bad.png',{type:'image/png'})]}})
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('damaged'))
 expect(currentSnapshot()).toEqual(before);expect(screen.queryByAltText('Editor-only reference')).not.toBeInTheDocument()
})
it('can clear an existing reference during replacement decoding without leaving the loader disabled',async()=>{
 vi.stubGlobal('URL',class extends URL {static createObjectURL(){return 'blob:clear-test'}static revokeObjectURL(){}})
 useReferenceViewStore.setState({open:true});render(<ReferenceView/>)
 const input=screen.getByLabelText('Load reference image'),file=new File(['pixels'],'reference.png',{type:'image/png'})
 fireEvent.change(input,{target:{files:[file]}})
 await waitFor(()=>expect(screen.getByAltText('Editor-only reference')).toBeInTheDocument())
 let finish!:(value:Awaited<ReturnType<typeof readImage>>)=>void
 vi.mocked(readImage).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 fireEvent.change(input,{target:{files:[file]}});expect(input).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'Clear reference'}));expect(input).toBeEnabled()
 finish({blob:file,width:100,height:80,mimeType:'image/png'})
 await waitFor(()=>expect(screen.queryByAltText('Editor-only reference')).not.toBeInTheDocument())
})
it('picks, checks, corrects and removes paired landmarks without editing the map',async()=>{
 vi.stubGlobal('PointerEvent',MouseEvent)
 vi.stubGlobal('URL',class extends URL {static createObjectURL(){return 'blob:calibration-ui'}static revokeObjectURL(){}})
 useReferenceViewStore.setState({open:true});const before=structuredClone(currentSnapshot())
 render(<><ReferenceView/><ReferenceMapOverlay size={{width:800,height:600}}/></>)
 fireEvent.change(screen.getByLabelText('Load reference image'),{target:{files:[new File(['pixels'],'reference.png',{type:'image/png'})]}})
 await screen.findByAltText('Editor-only reference')
 act(()=>{useReferenceViewStore.setState({view:{zoom:1,pan:{x:0,y:0}}});useEditorStore.setState({viewport:{zoom:2,pan:{x:10,y:10}}})})
 fireEvent.click(screen.getByText('Calibrate'))
 for(const [x,y]of [[10,10],[80,60]]){
  fireEvent.click(screen.getByText('Add point pair'))
  fireEvent.pointerDown(screen.getByLabelText('Reference image viewport'),{button:0,clientX:x,clientY:y})
  expect(useReferenceViewStore.getState().pick?.side).toBe('map')
  fireEvent.pointerDown(screen.getByLabelText('Map calibration points'),{button:0,clientX:x*4+10,clientY:y*4+10})
 }
 fireEvent.click(screen.getByText('Recalculate'));expect(useReferenceViewStore.getState().calibration?.scale).toBeCloseTo(2)
 expect(screen.getByText(/Two pairs fit exactly/)).toBeInTheDocument()
 fireEvent.click(screen.getByText('Pick image 1'));fireEvent.pointerDown(screen.getByLabelText('Reference image viewport'),{button:0,clientX:0,clientY:0})
 expect(useReferenceViewStore.getState().calibration).toBeNull()
 fireEvent.click(screen.getByText('Remove pair 2'));fireEvent.click(screen.getByText('Recalculate'));expect(screen.getByRole('alert')).toHaveTextContent('two')
 fireEvent.click(screen.getByText('Clear calibration'));expect(useReferenceViewStore.getState().pairs).toHaveLength(0)
 expect(currentSnapshot()).toEqual(before)
})
it('retains hidden calibration, invalidates resized map bounds and clears on session unmount',async()=>{
 vi.stubGlobal('URL',class extends URL {static createObjectURL(){return 'blob:session'}static revokeObjectURL(){}})
 const map=useProjectStore.getState().map
 useReferenceViewStore.setState({open:true});render(<ReferenceView/>)
 fireEvent.change(screen.getByLabelText('Load reference image'),{target:{files:[new File(['pixels'],'reference.png',{type:'image/png'})]}})
 await screen.findByAltText('Editor-only reference')
 act(()=>{useReferenceViewStore.setState({pairs:[{id:1,image:{x:10,y:10},map:{x:20,y:20}},{id:2,image:{x:70,y:60},map:{x:140,y:120}}]});calculateReferenceCalibration(map)})
 const fit=useReferenceViewStore.getState().calibration;expect(fit).not.toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Hide reference view'}));expect(useReferenceViewStore.getState().calibration).toEqual(fit)
 act(()=>useReferenceViewStore.setState({open:true}))
 act(()=>useProjectStore.setState(s=>({objects:[...s.objects]})));expect(useReferenceViewStore.getState().calibration).toEqual(fit)
 act(()=>useProjectStore.setState({map:{...map,width:map.width+10}}));expect(useReferenceViewStore.getState().calibration).toBeNull();expect(screen.getByRole('alert')).toHaveTextContent('Map dimensions changed')
 act(()=>useProjectStore.setState({map}));cleanup();expect(useReferenceViewStore.getState().pairs).toEqual([]);expect(useReferenceViewStore.getState().imageSize).toBeNull()
})
