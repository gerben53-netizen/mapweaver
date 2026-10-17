import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ReferenceView } from './ReferenceView'
import { useReferenceViewStore } from '../store/referenceViewStore'
import { currentSnapshot } from '../projects/session'
import { readImage } from '../imports/readImage'
vi.mock('../imports/readImage',()=>({readImage:vi.fn(async(file:File)=>({blob:file,width:100,height:80}))}))
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();useReferenceViewStore.setState({open:false})})
it('loads, zooms and hides an editor reference without changing any project data',async()=>{
 const revoke=vi.fn();vi.stubGlobal('URL',class extends URL {static createObjectURL(){return 'blob:reference-test'}static revokeObjectURL=revoke})
 const before=structuredClone(currentSnapshot());useReferenceViewStore.setState({open:true});render(<ReferenceView/>)
 fireEvent.change(screen.getByLabelText('Load reference image'),{target:{files:[new File(['pixels'],'reference.png',{type:'image/png'})]}})
 await waitFor(()=>expect(screen.getByAltText('Editor-only reference')).toBeInTheDocument())
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
