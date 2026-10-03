import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { CategoryBrowser } from './CategoryBrowser'
import { categoryIndex, focusedPath, searchCategories, useLibraryNavigation } from './categoryNavigation'
import type { LibraryCategory } from '../domain/library'
const categories:LibraryCategory[]=[
 ['root','Realm',null,0,12],['palace','Palace','root',0,12],['bed','Bedrooms','palace',12,12],
 ['city','City',null,0,2],['other','Bedrooms','city',2,2],['empty','Unused',null,0,0],
].map(([id,name,parentId,direct,total])=>({id:String(id),name:String(name),parentId:parentId as string|null,direct:Number(direct),total:Number(total),libraryTotal:Number(total),sortOrder:0,createdAt:'',modifiedAt:''}))
const index=categoryIndex(categories)
beforeEach(()=>useLibraryNavigation.setState(useLibraryNavigation.getInitialState()))
it('indexes full paths, immediate children and distinct duplicate-name search matches',()=>{
 expect(focusedPath(index,'bed')).toEqual(['root','palace','bed'])
 expect(index.children.get('palace')?.map(c=>c.id)).toEqual(['bed'])
 expect(searchCategories(index,'ＢＥＤＲＯＯＭＳ',false).map(c=>c.id)).toEqual(['bed','other'])
 expect(searchCategories(index,'realm bedroom',false).map(c=>c.id)).toEqual(['bed'])
 expect(searchCategories(index,'unused',false)).toEqual([])
 expect(searchCategories(index,'unused',true)).toHaveLength(1)
 expect(searchCategories(categoryIndex(categories.map(c=>({...c,total:0}))),'bedrooms',false)).toHaveLength(2)
})
it('renders clickable breadcrumbs with full path, current location, Up and child counts',()=>{
 const select=vi.fn();render(<CategoryBrowser index={index} category="palace" scopeName="" total={12} query="" recent={[]} showEmpty={false} onSelect={select}/> )
 const nav=screen.getByRole('navigation',{name:'Category breadcrumb'});expect(nav).toHaveAttribute('title','Realm › Palace')
 expect(within(nav).getByRole('button',{name:'Palace'})).toHaveAttribute('aria-current','location')
 fireEvent.click(within(nav).getByRole('button',{name:'Realm'}));expect(select).toHaveBeenLastCalledWith('root')
 fireEvent.click(screen.getByRole('button',{name:'Up'}));expect(select).toHaveBeenLastCalledWith('root')
 fireEvent.click(within(screen.getByRole('region',{name:'Subcategories'})).getByRole('button',{name:/Bedrooms 12/}));expect(select).toHaveBeenLastCalledWith('bed')
})
it('jumps from category search and recent locations with disambiguating paths',()=>{
 const select=vi.fn();render(<CategoryBrowser index={index} category="root" scopeName="" total={12} query="bedrooms" recent={['other','deleted']} showEmpty={false} onSelect={select}/> )
 const matches=within(screen.getByRole('region',{name:'Matching categories'}));expect(matches.getAllByRole('button')).toHaveLength(2)
 fireEvent.click(matches.getByRole('button',{name:'Bedrooms City'}));expect(select).toHaveBeenLastCalledWith('other',true)
 fireEvent.change(screen.getByLabelText('Recent locations'),{target:{value:'other'}});expect(select).toHaveBeenLastCalledWith('other',true)
})
it('retains navigation for workspace remounts without storing taxonomy in the map',()=>{
 function Location(){return <span>{useLibraryNavigation(s=>s.category)}</span>}
 useLibraryNavigation.setState({category:'bed',expanded:focusedPath(index,'bed')})
 const first=render(<Location/>);expect(screen.getByText('bed')).toBeVisible();first.unmount();render(<Location/>);expect(screen.getByText('bed')).toBeVisible()
 expect(useLibraryNavigation.getState().expanded).toEqual(['root','palace','bed'])
})
