import { act,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { GeneratorMetadataDetails } from './GeneratorMetadataDetails'
import { libraryDrafts,flushLibraryDrafts,useLibraryHistory } from './libraryHistory'
import { defaultGeneratorMetadata } from '../domain/generatorAssets'
import { useEditorStore } from '../store/editorStore'
import type { PublicLibraryAsset } from '../../service/library'
const server=vi.hoisted(()=>({revision:1,generator:null as unknown}))
vi.mock('../storage/api',()=>({beginStorageWork:()=>()=>{},api:vi.fn(async(_p:string,_m:string,b:{revision:number;patch:{generator:unknown}})=>{if(b.revision!==server.revision)throw Error('Library changed in another tab.');server.generator=b.patch.generator;return {revision:++server.revision,token:'t'+server.revision}})}))
afterEach(()=>{libraryDrafts.clear();server.revision=1;server.generator=null;useLibraryHistory.setState({revision:1,undo:[],redo:[],busy:false,error:'',changed:0})})
function setup(generator:PublicLibraryAsset['generator']=null){useEditorStore.setState({stampAsset:null});useLibraryHistory.setState({revision:1});const asset={id:'stamp',type:'stamp',generator} as PublicLibraryAsset;return {asset,view:render(<GeneratorMetadataDetails asset={asset}/>)} }
it('keeps normal assets unmarked and saves explicit validated metadata in one library action',async()=>{
  setup();expect(screen.getByText('Generator metadata')).toBeInTheDocument();expect(screen.getByLabelText('Generator-ready stamp')).not.toBeChecked();expect(server.generator).toBeNull()
  fireEvent.click(screen.getByLabelText('Generator-ready stamp'));fireEvent.change(screen.getByLabelText('Semantic type'),{target:{value:'volcano'}});fireEvent.change(screen.getByLabelText('Generator weight'),{target:{value:'3'}});fireEvent.click(screen.getByText('Save generator metadata'))
  await waitFor(()=>expect(server.generator).toMatchObject({semanticType:'volcano',weight:3}));expect(useLibraryHistory.getState().undo).toHaveLength(1);expect(libraryDrafts.size).toBe(0)
})
it('retains invalid drafts and Escape restores the original metadata',async()=>{
  setup(defaultGeneratorMetadata());const input=screen.getByLabelText('Generator scale minimum');fireEvent.change(input,{target:{value:'2'}});fireEvent.click(screen.getByText('Save generator metadata'));expect(await screen.findByRole('alert')).toHaveTextContent('ordered range');expect(libraryDrafts.size).toBe(1);expect(server.generator).toBeNull();fireEvent.keyDown(input,{key:'Escape'});expect(input).toHaveValue(1);expect(libraryDrafts.size).toBe(0)
})
it('flushes valid lifecycle drafts and preserves conflicts against refreshed remote metadata',async()=>{
  const {asset,view}=setup(defaultGeneratorMetadata());fireEvent.change(screen.getByLabelText('Generator weight'),{target:{value:'4'}})
  await act(async()=>{expect(await flushLibraryDrafts()).toBe(true)});expect(server.generator).toMatchObject({weight:4})
  fireEvent.change(screen.getByLabelText('Generator weight'),{target:{value:'9'}});server.revision=3;act(()=>useLibraryHistory.setState({revision:3}));view.rerender(<GeneratorMetadataDetails asset={{...asset,generator:{...defaultGeneratorMetadata(),weight:7}}}/>);fireEvent.click(screen.getByText('Save generator metadata'));expect(await screen.findByRole('alert')).toHaveTextContent('another tab');expect(screen.getByLabelText('Generator weight')).toHaveValue(9);fireEvent.click(screen.getByText('Discard generator draft'));expect(screen.getByLabelText('Generator weight')).toHaveValue(7)
})
it('removes metadata explicitly without changing other library fields',async()=>{
  setup(defaultGeneratorMetadata());fireEvent.click(screen.getByLabelText('Generator-ready stamp'));fireEvent.click(screen.getByText('Save generator metadata'));await waitFor(()=>expect(useLibraryHistory.getState().undo).toHaveLength(1));expect(server.generator).toBeNull()
})

it('authors hierarchy, ridge orientation and light as explicit validated metadata',async()=>{
 setup(defaultGeneratorMetadata());fireEvent.change(screen.getByLabelText('Visual hierarchy'),{target:{value:'support'}});fireEvent.change(screen.getByLabelText('Lighting'),{target:{value:'northwest'}})
 fireEvent.click(screen.getByLabelText('Authored ridge direction'));fireEvent.change(screen.getByLabelText('Ridge axis (degrees)'),{target:{value:'-30'}});fireEvent.click(screen.getByText('Save generator metadata'))
 await waitFor(()=>expect(server.generator).toMatchObject({hierarchy:'support',lighting:'northwest',ridgeAxis:-30}));expect(useLibraryHistory.getState().undo).toHaveLength(1)
})
