import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { LibraryWorkspace } from './LibraryWorkspace'
import { useEditorStore } from '../store/editorStore'
import { useLibraryNavigation } from './categoryNavigation'
import { libraryDrafts, useLibraryHistory } from './libraryHistory'
const mock=vi.hoisted(()=>({api:vi.fn()}))
vi.mock('../storage/api',async original=>({...await original<typeof import('../storage/api')>(),api:mock.api}))
vi.mock('./AssetThumbnail',()=>({AssetThumbnail:()=>null}))
vi.mock('./LibraryDetails',()=>({AssetDetails:()=>null}))
const categories=[['r','Realm',null],['p','Palace','r'],['b','Bedrooms','p'],['o','Other',null],['c','Child','o']].map(([id,name,parentId])=>({id,name,parentId,total:1,libraryTotal:1,sortOrder:0}))
beforeEach(()=>{
 useLibraryNavigation.setState(useLibraryNavigation.getInitialState());useEditorStore.setState({workspace:'library',libraryKind:'stamp'});useLibraryHistory.setState({changed:0,error:''});libraryDrafts.clear()
 mock.api.mockImplementation(async()=>({revision:1,total:1,assets:[{id:'a',name:'Bed',categoryId:'b',type:'stamp',width:20,height:20}],categories,collections:[{id:'set',name:'Collection',description:''}]}))
})
it('focuses branches, collapses/reveals current path, retains asset selection for tree presentation changes and clears it for scope changes',async()=>{
 const mounted=render(<LibraryWorkspace/>);await screen.findByText('0 selected / 1 results')
 expect(screen.queryByRole('treeitem',{name:/^Bedrooms,/})).toBeNull()
 fireEvent.click(screen.getByRole('treeitem',{name:/^Realm,/}));fireEvent.click(screen.getByRole('treeitem',{name:/^Palace,/}));fireEvent.click(screen.getByRole('treeitem',{name:/^Bedrooms,/}))
 fireEvent.click(screen.getByRole('checkbox',{name:'Select Bed'}));expect(screen.getByText('1 selected / 1 results')).toBeVisible()
 fireEvent.click(screen.getByRole('button',{name:'Collapse all'}));expect(screen.queryByRole('treeitem',{name:/^Bedrooms,/})).toBeNull();expect(screen.getByText('1 selected / 1 results')).toBeVisible()
 fireEvent.click(screen.getByRole('button',{name:'Expand current path'}));expect(screen.getByRole('treeitem',{name:/^Bedrooms,/})).toHaveAttribute('aria-selected','true')
 fireEvent.click(screen.getByRole('button',{name:'Expand Other'}));expect(screen.queryByRole('treeitem',{name:/^Bedrooms,/})).toBeNull();expect(screen.getByText('1 selected / 1 results')).toBeVisible()
 const crumb=within(screen.getByRole('navigation',{name:'Category breadcrumb'}));fireEvent.click(crumb.getByRole('button',{name:'Palace'}));expect(screen.getByText('0 selected / 1 results')).toBeVisible();expect(useLibraryNavigation.getState().expanded).toEqual(['r','p'])
 mounted.unmount();render(<LibraryWorkspace/>);await screen.findByRole('treeitem',{name:/^Palace,/});expect(screen.getByRole('treeitem',{name:/^Palace,/})).toHaveAttribute('aria-selected','true')
})
it('search jump clears obstructing filters and reveals only ancestors; ordinary navigation retains asset search and favorites/collections remain separate',async()=>{
 render(<LibraryWorkspace/>);await screen.findByText('0 selected / 1 results')
 fireEvent.click(screen.getByRole('button',{name:'Favorites'}));fireEvent.change(screen.getByRole('searchbox',{name:'Search library'}),{target:{value:'bedrooms'}})
 fireEvent.click(within(screen.getByRole('region',{name:'Matching categories'})).getByRole('button',{name:'Bedrooms Realm › Palace'}))
 expect(useLibraryNavigation.getState()).toMatchObject({category:'b',query:'',favorite:false,collection:'',expanded:['r','p','b']})
 await waitFor(()=>expect(mock.api.mock.calls.at(-1)?.[0]).toContain('category=b'))
 fireEvent.change(screen.getByRole('searchbox',{name:'Search library'}),{target:{value:'bed'}});fireEvent.click(screen.getByRole('treeitem',{name:/^Palace,/}));expect(screen.getByRole('searchbox')).toHaveValue('bed')
 fireEvent.click(screen.getByRole('button',{name:'Collection'}));expect(useLibraryNavigation.getState()).toMatchObject({collection:'set',category:'',query:'bed'})
 fireEvent.click(screen.getByRole('button',{name:'Favorites'}));expect(useLibraryNavigation.getState()).toMatchObject({collection:'set',favorite:true})
})


