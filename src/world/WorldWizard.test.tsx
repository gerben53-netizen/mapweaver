import { loadWorldScatterAssets,prepareWorldResources } from './scatterResources'
import { DEFAULT_WORLD_SCATTER } from './scatterModel'
import { styleWorld } from './styleWorld'
import { afterEach,beforeEach,expect,it,vi } from 'vitest'
import { act,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { WorldWizard } from './WorldWizard'
import { WORLD_DEFAULTS } from './model'
import type { WorldResult } from './model'
import { useProjectStore } from '../store/projectStore'
class FakeWorker {
 static current:FakeWorker
 onmessage:((event:MessageEvent)=>void)|null=null
 onerror:((event:Event)=>void)|null=null
 terminate=vi.fn()
 postMessage=vi.fn()
 constructor(){FakeWorker.current=this}
}
const props={name:'World',width:1600,height:1000,widthKm:30000,busy:false,error:''}
afterEach(()=>vi.unstubAllGlobals())
function setup(){HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};vi.stubGlobal('Worker',FakeWorker);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);const close=vi.fn(),apply=vi.fn().mockResolvedValue(undefined);render(<WorldWizard {...props} onClose={close} onApply={apply}/>);return {close,apply}}
it('does not mutate the current document during preview, input, cancellation or worker failure',()=>{
 const prior=useProjectStore.getState();const {close,apply}=setup();fireEvent.click(screen.getByRole('button',{name:'Generate preview'}));expect(FakeWorker.current.postMessage).toHaveBeenCalledWith({...WORLD_DEFAULTS,width:1600,height:1000});expect(screen.getByRole('button',{name:'Create generated map'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Cancel generation'}));expect(FakeWorker.current.terminate).toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(close).toHaveBeenCalled();expect(apply).not.toHaveBeenCalled();expect(useProjectStore.getState()).toBe(prior)
})
it('only applies an explicit, current preview and populates editable preset controls',()=>{
 const {apply}=setup();fireEvent.change(screen.getByLabelText('Generation preset'),{target:{value:'Dry / Sparse'}});expect(screen.getByLabelText('Climate')).toHaveValue('dry');expect(screen.getByLabelText('Rivers')).toHaveValue(5)
 fireEvent.click(screen.getByRole('button',{name:'Generate preview'}));const parameters=FakeWorker.current.postMessage.mock.calls[0][0]
 const result={map:{generation:{parameters}},objects:[],layers:[],stats:{landFraction:.4,riverCount:5,points:20,discarded:0}} as unknown as WorldResult
 act(()=>FakeWorker.current.onmessage?.({data:{result}} as MessageEvent));fireEvent.click(screen.getByRole('button',{name:'Create generated map'}));expect(apply).toHaveBeenCalledWith(styleWorld(result));fireEvent.click(screen.getByLabelText('Textured terrain and soft coasts'));fireEvent.click(screen.getByRole('button',{name:'Create generated map'}));expect(apply).toHaveBeenLastCalledWith(result)
 fireEvent.change(screen.getByLabelText('Seed'),{target:{value:'Different'}});expect(screen.getByRole('button',{name:'Create generated map'})).toBeDisabled();expect(screen.getByText(/Settings changed/)).toBeVisible()
})
it('reports invalid dimensions and worker errors without producing a map',()=>{
 const {apply}=setup();fireEvent.click(screen.getByText('Map dimensions and scale'));fireEvent.change(screen.getByLabelText('Width (px)'),{target:{value:'99999'}});fireEvent.click(screen.getByRole('button',{name:'Generate preview'}));expect(screen.getByRole('alert')).toHaveTextContent('512–4096')
 fireEvent.change(screen.getByLabelText('Width (px)'),{target:{value:'1600'}});fireEvent.click(screen.getByRole('button',{name:'Generate preview'}));act(()=>FakeWorker.current.onmessage?.({data:{error:'Invalid contour'}} as MessageEvent));expect(screen.getByRole('alert')).toHaveTextContent('Invalid contour');expect(apply).not.toHaveBeenCalled()
})

vi.mock('./scatterResources',()=>({loadWorldScatterAssets:vi.fn(),prepareWorldResources:vi.fn()}))
beforeEach(()=>{vi.mocked(loadWorldScatterAssets).mockResolvedValue([]);vi.mocked(prepareWorldResources).mockImplementation(async r=>r)})
it('keeps semantic preview disposable and applies the exact prepared native result',async()=>{
 const prior=useProjectStore.getState(),{apply}=setup()
 fireEvent.change(screen.getByLabelText('mountains stamp density'),{target:{value:'medium'}});fireEvent.click(screen.getByRole('button',{name:'Generate preview'}))
 await waitFor(()=>expect(FakeWorker.current.postMessage).toHaveBeenCalled())
 const input=FakeWorker.current.postMessage.mock.calls[0][0];expect(input.settings).toEqual({...DEFAULT_WORLD_SCATTER,mountains:'medium'})
 const result={map:{generation:{parameters:input.parameters,scatter:{settings:input.settings,placements:[],warnings:[]}}},objects:[],layers:[],stats:{landFraction:.4,riverCount:0,points:0,discarded:0}} as unknown as WorldResult
 await act(async()=>FakeWorker.current.onmessage?.({data:{result}} as MessageEvent))
 expect(useProjectStore.getState()).toBe(prior);expect(apply).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Create generated map'}));expect(apply).toHaveBeenCalledWith(styleWorld(result))
 fireEvent.change(screen.getByLabelText('forests stamp density'),{target:{value:'low'}});expect(screen.getByRole('button',{name:'Create generated map'})).toBeDisabled()
})
it('ignores a late asset lookup after cancellation',async()=>{
 let resolve!:(value:[])=>void;vi.mocked(loadWorldScatterAssets).mockReturnValue(new Promise(r=>{resolve=r}));const {apply}=setup(),worker=FakeWorker.current
 fireEvent.change(screen.getByLabelText('mountains stamp density'),{target:{value:'medium'}});fireEvent.click(screen.getByRole('button',{name:'Generate preview'}));fireEvent.click(screen.getByRole('button',{name:'Cancel generation'}));await act(async()=>resolve([]));expect(FakeWorker.current).toBe(worker);expect(apply).not.toHaveBeenCalled()
})
it('reports asset lookup failures without applying incomplete content',async()=>{
 vi.mocked(loadWorldScatterAssets).mockRejectedValue(Error('Library changed'));const {apply}=setup();fireEvent.change(screen.getByLabelText('forests stamp density'),{target:{value:'medium'}});fireEvent.click(screen.getByRole('button',{name:'Generate preview'}));expect(await screen.findByRole('alert')).toHaveTextContent('Library changed');expect(apply).not.toHaveBeenCalled()
})

it('creates a themed world with no scatter without falsely marking its preview stale',async()=>{
 const {apply}=setup();fireEvent.change(screen.getByLabelText('Visual style'),{target:{value:'world.classicParchment'}})
 expect(screen.getByLabelText('Scatter asset theme')).toHaveValue('parchment');expect(screen.getByLabelText('Scatter asset theme')).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'Generate preview'}));const parameters=FakeWorker.current.postMessage.mock.calls[0][0]
 const {generateWorld}=await import('./generate');const result=generateWorld(parameters)
 await act(async()=>FakeWorker.current.onmessage?.({data:{result}} as MessageEvent));expect(screen.getByRole('button',{name:'Create generated map'})).toBeEnabled()
 fireEvent.click(screen.getByRole('button',{name:'Create generated map'}));const themed=apply.mock.calls[0][0]
 expect(themed.map.theme.id).toBe('world.classicParchment');expect(themed.map.generation).toEqual(result.map.generation);expect(themed.map.effects.frame.preset).toBe('border.parchment')
})
it('minimal theme disables scatter density by default without silently removing existing generated objects',()=>{
 setup();fireEvent.change(screen.getByLabelText('forests stamp density'),{target:{value:'high'}});fireEvent.change(screen.getByLabelText('Visual style'),{target:{value:'world.minimalPolitical'}})
 expect(screen.getByLabelText('forests stamp density')).toHaveValue('off');expect(screen.getByLabelText('Scatter asset theme')).toHaveValue('genericFantasy')
})
