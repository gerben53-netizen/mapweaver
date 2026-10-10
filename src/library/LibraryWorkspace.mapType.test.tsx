import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LibraryWorkspace } from './LibraryWorkspace'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useProjectSession } from '../projects/session'
import { useLibraryNavigation, initializeLibraryContext, chooseLibraryMapType } from './categoryNavigation'
import { readMapTypePreference } from './mapTypeFilter'
import { libraryDrafts, useLibraryHistory } from './libraryHistory'
import { assetAppliesToMap } from '../domain/mapCapabilities'
import type { MapType } from '../domain/geography'
const mock=vi.hoisted(()=>({api:vi.fn()}))
vi.mock('../storage/api',async original=>({...await original<typeof import('../storage/api')>(),api:mock.api}))
vi.mock('./AssetThumbnail',()=>({AssetThumbnail:()=>null}))
vi.mock('./LibraryDetails',()=>({AssetDetails:()=>null}))
beforeEach(()=>{
 localStorage.clear();useLibraryNavigation.setState({...useLibraryNavigation.getInitialState(),context:'',mapType:''});useProjectSession.setState({revision:null,generation:0});useEditorStore.setState({workspace:'library',libraryKind:'stamp'});useLibraryHistory.setState({changed:0,error:''});libraryDrafts.clear()
 const assets=[{id:'legacy',name:'Legacy plant',applicableMapTypes:[]},{id:'multi',name:'Multi shelf',applicableMapTypes:['battlemap','world-map']},{id:'family',name:'Desk family',applicableMapTypes:['battlemap'],family:{variants:[{id:'a'},{id:'b'}]}}].map(a=>({...a,categoryId:'furniture',type:'stamp',width:20,height:20}))
 mock.api.mockImplementation(async(url:string)=>{const q=new URL(url,'http://qa').searchParams;const matches=assets.filter(a=>(!q.get('mapType')||assetAppliesToMap(a.applicableMapTypes,q.get('mapType') as MapType))&&a.name.toLowerCase().includes(q.get('search')||''));return {revision:1,total:matches.length,assets:matches,categories:[{id:'furniture',name:'Meubilair',parentId:null,sortOrder:0,total:matches.length,libraryTotal:3}],collections:[{id:'preserved',name:'Preserved collection'}],ids:matches.map(a=>a.id)}})
})
it('cannot reapply an old select-all response after the maptype scope changes',async()=>{
 render(<LibraryWorkspace/>);await screen.findByText('0 selected / 3 results')
 let resolve!:(value:unknown)=>void;mock.api.mockImplementationOnce(()=>new Promise(done=>{resolve=done}))
 fireEvent.click(screen.getByRole('button',{name:'Select all results'}));fireEvent.change(screen.getByLabelText('Maptype filter'),{target:{value:'regional-map'}})
 await screen.findByText('0 selected / 1 results');await act(async()=>resolve({ids:['multi','family'],total:2}))
 expect(screen.getByText('0 selected / 1 results')).toBeVisible();expect(screen.queryByText('Actions for 2 selected assets')).toBeNull()
})
it('keeps a permanent canonical filter, hides Collections and duplicate category chips, and clears hidden bulk selection',async()=>{
 const before=JSON.stringify(useProjectStore.getState().map);render(<LibraryWorkspace/>);await screen.findByText('0 selected / 3 results')
 expect(screen.getByLabelText('Maptype filter')).toHaveValue('');expect(screen.queryByText('Collections')).toBeNull();expect(screen.queryByText('Preserved collection')).toBeNull();expect(screen.queryByRole('region',{name:'Subcategories'})).toBeNull()
 fireEvent.click(screen.getByRole('checkbox',{name:'Select Multi shelf'}));expect(screen.getByText('1 selected / 3 results')).toBeVisible()
 fireEvent.change(screen.getByLabelText('Maptype filter'),{target:{value:'regional-map'}});await screen.findByText('0 selected / 1 results');expect(screen.getByRole('checkbox',{name:'Select Legacy plant'})).toBeVisible();expect(screen.queryByText('Actions for 1 selected assets')).toBeNull();expect(screen.getByRole('treeitem',{name:'Meubilair, 1 assets'})).toBeVisible()
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'shelf'}});await screen.findByText('0 selected / 0 results');expect(screen.getByText('No matching assets')).toBeVisible()
 fireEvent.change(screen.getByLabelText('Maptype filter'),{target:{value:'world-map'}});await screen.findByText('0 selected / 1 results');expect(screen.getByRole('searchbox')).toHaveValue('shelf');expect(screen.getByRole('checkbox',{name:'Select Multi shelf'})).toBeVisible()
 expect(JSON.stringify(useProjectStore.getState().map)).toBe(before)
})
it('initializes each map context, retains explicit preference across remounts, and direct opening restores that preference',async()=>{
 chooseLibraryMapType('world-map');expect(readMapTypePreference()).toBe('world-map')
 for(const type of ['battlemap','regional-map','world-map'] as const){useProjectStore.setState({map:{...useProjectStore.getState().map,mapType:type}});useProjectSession.setState({revision:1,info:{...useProjectSession.getState().info,id:type}});const r=render(<LibraryWorkspace/>);await waitFor(()=>expect(screen.getByLabelText('Maptype filter')).toHaveValue(type));fireEvent.change(screen.getByLabelText('Maptype filter'),{target:{value:''}});fireEvent.click(await screen.findByRole('treeitem',{name:/Meubilair,/}));r.unmount();const next=render(<LibraryWorkspace/>);expect(screen.getByLabelText('Maptype filter')).toHaveValue('');next.unmount()}
 chooseLibraryMapType('battlemap');expect(initializeLibraryContext('direct')).toBe(true);expect(useLibraryNavigation.getState().mapType).toBe('battlemap');expect(initializeLibraryContext('direct')).toBe(false)
 expect(initializeLibraryContext('new/world','world-map')).toBe(true);expect(useLibraryNavigation.getState().mapType).toBe('world-map');expect(readMapTypePreference()).toBe('battlemap')
})
