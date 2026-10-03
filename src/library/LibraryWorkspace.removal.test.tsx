import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { LibraryWorkspace } from './LibraryWorkspace'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useLibraryHistory } from './libraryHistory'
import { history } from '../store/history'
import { defaultMapStyle } from '../domain/mapSettings'
import { createLayeredContent } from '../domain/layers'
const mocks=vi.hoisted(()=>({api:vi.fn()}))
vi.mock('../storage/api',async original=>({...await original<typeof import('../storage/api')>(),api:mocks.api}))
vi.mock('./AssetThumbnail',()=>({AssetThumbnail:()=>null}))
let deleted=false,fail=false,used=false
const assets=['a','b'].map(id=>({id,name:`Asset ${id}`,type:'stamp',categoryId:'uncategorized',width:20,height:20}))
beforeEach(()=>{
 deleted=false;fail=false;used=false;mocks.api.mockReset()
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
 useProjectStore.setState({objectGroups:[],layerTree:null,map:{width:600,height:400,background:null,...defaultMapStyle()},...createLayeredContent()});history.reset()
 useEditorStore.setState({...useEditorStore.getInitialState(),workspace:'library'})
 useLibraryHistory.setState({undo:[],redo:[],revision:1,changed:0,busy:false,error:''})
 mocks.api.mockImplementation(async(path:string,_method?:string,body?:{ids?:string[]})=>{
  if(path.startsWith('/library?'))return {revision:1,total:deleted?0:2,assets:deleted?[]:assets,ids:deleted?[]:['a','b'],categories:[],collections:[]}
  if(path==='/library/removal-preview')return {revision:1,assets,usage:used?[{id:'a',name:'Saved dungeon',kind:'map',ownerId:'map'}]:[]}
  if(path==='/library/command'){expect(body?.ids).toEqual(['a','b']);if(fail)throw Error('Storage unavailable');deleted=true;return {revision:2,token:'removed'}}
  throw Error(path)
 })
})
async function openRemoval(){
 render(<LibraryWorkspace/>);await screen.findByText('0 selected / 2 results')
 await waitFor(()=>expect(screen.getByRole('button',{name:'Select all results'})).toBeEnabled())
 fireEvent.click(screen.getByRole('button',{name:'Select all results'}));fireEvent.click(await screen.findByText('Actions for 2 selected assets'))
 fireEvent.click(screen.getByRole('button',{name:'Remove assets…'}));return within(await screen.findByRole('dialog',{name:'Remove 2 assets'}))
}
it('shows named persistent blockers without transient-reference error spam and cancels without mutation',async()=>{
 used=true;const dialog=await openRemoval()
 expect(dialog.getByText('Asset a')).toBeInTheDocument();expect(dialog.getByText(/Saved dungeon/)).toBeInTheDocument()
 expect(dialog.queryByRole('button',{name:'Remove assets'})).toBeNull()
 expect(dialog.queryByText(/clipboard/i)).toBeNull()
 fireEvent.click(dialog.getByRole('button',{name:'Cancel'}));expect(mocks.api.mock.calls.some(c=>c[0]==='/library/command')).toBe(false)
})
it('keeps clipboard/selection on failure then clears both only after one successful atomic batch',async()=>{
 const object={id:'copied',kind:'stamp' as const,assetId:'a',x:0,y:0,width:20,height:20,rotation:0,scaleX:1,scaleY:1,opacity:1}
 useEditorStore.setState({clipboard:[object]});fail=true;const dialog=await openRemoval()
 fireEvent.click(dialog.getByRole('button',{name:'Remove assets'}));await waitFor(()=>expect(dialog.getByRole('alert')).toHaveTextContent('Storage unavailable'))
 expect(useEditorStore.getState().clipboard).toEqual([object]);expect(screen.getByText('2 selected / 2 results')).toBeInTheDocument()
 fail=false;fireEvent.click(dialog.getByRole('button',{name:'Remove assets'}));await screen.findByText('0 selected / 0 results')
 expect(useEditorStore.getState().clipboard).toEqual([]);expect(screen.queryByRole('button',{name:'Remove assets…'})).toBeNull()
 expect(screen.getByRole('status')).toHaveTextContent('2 assets removed.');await waitFor(()=>expect(screen.getByLabelText('Search library')).toHaveFocus())
})
