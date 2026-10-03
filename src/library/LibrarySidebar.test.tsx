import {useState} from 'react'
import {render,screen,fireEvent} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {LibrarySidebar} from './LibrarySidebar'
const categories=[{id:'parent',name:'Recovery pack',parentId:null,sortOrder:0,createdAt:'',modifiedAt:'',direct:0,total:1},{id:'child',name:'Trees',parentId:'parent',sortOrder:0,createdAt:'',modifiedAt:'',direct:1,total:1}]
it('navigates scopes, announces hierarchy/counts, separates management and creation',()=>{
 const select=vi.fn(),create=vi.fn(),move=vi.fn();function Harness(){const [collapsed,set]=useState<string[]>([]);return <LibrarySidebar categories={categories} collections={[{id:'collection',name:'Recovery collection',description:''}]} category="child" collection="" favorite={false} collapsed={collapsed} onToggle={id=>set(collapsed.includes(id)?[]:[id])} onSelect={select} onMove={move} onNewCategory={create} onNewCollection={create}><button>Manage categories</button><button>Export ZIP</button></LibrarySidebar>};render(<Harness/> )
 for(const name of ['All assets','Favorites','Uncategorized','Recovery collection'])fireEvent.click(screen.getByRole('button',{name}));expect(select.mock.calls.map(c=>c[0])).toEqual(['all','favorite','category','collection'])
 const parent=screen.getByRole('treeitem',{name:'Recovery pack, 1 assets'}),child=screen.getByRole('treeitem',{name:'Trees, 1 assets'});expect(parent).toHaveAttribute('title','Recovery pack · 0 direct assets · 1 total');expect(child).toHaveAttribute('aria-level','2');expect(child).toHaveAttribute('aria-selected','true');fireEvent.click(child);expect(select).toHaveBeenLastCalledWith('category','child')
 parent.focus();fireEvent.keyDown(parent,{key:'ArrowDown'});expect(child).toHaveFocus();fireEvent.keyDown(child,{key:'Enter'});expect(select).toHaveBeenLastCalledWith('category','child');fireEvent.keyDown(child,{key:'ArrowLeft'});expect(parent).toHaveFocus();fireEvent.keyDown(parent,{key:'ArrowLeft'});expect(parent).toHaveAttribute('aria-expanded','false');expect(screen.queryByRole('treeitem',{name:/Trees/})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Expand Recovery pack'}));expect(parent).toHaveAttribute('aria-expanded','true')
 fireEvent.click(screen.getByRole('button',{name:'New category'}));fireEvent.click(screen.getByRole('button',{name:'New collection'}));expect(create).toHaveBeenCalledTimes(2);expect(screen.getByRole('region',{name:'Library management'})).toContainElement(screen.getByRole('button',{name:'Export ZIP'}))
})
it('offers compact empty states',()=>{render(<LibrarySidebar categories={[]} collections={[]} category="" collection="" favorite={false} collapsed={[]} onToggle={()=>{}} onSelect={()=>{}} onMove={()=>{}} onNewCategory={()=>{}} onNewCollection={()=>{}}>Manage</LibrarySidebar>);expect(screen.getByText('No categories yet')).toBeVisible();expect(screen.getByText('No collections yet')).toBeVisible()})


it('caps deep indentation, preserves names, hides only truly empty categories and exposes collapse/reveal controls',()=>{
 const deep=Array.from({length:8},(_,i)=>({...categories[0],id:String(i),parentId:i?String(i-1):null,name:`Long category name at level ${i}`,direct:0,total:0,libraryTotal:1}))
 const empty={...categories[0],id:'empty',name:'Empty',total:0,libraryTotal:0},collapse=vi.fn(),reveal=vi.fn(),show=vi.fn()
 const props={categories:[...deep,empty],collections:[],category:'7',collection:'',favorite:false,collapsed:[],onToggle:vi.fn(),onSelect:vi.fn(),onMove:vi.fn(),onNewCategory:vi.fn(),onNewCollection:vi.fn(),showEmpty:false,onShowEmpty:show,onCollapseAll:collapse,onReveal:reveal}
 const {rerender}=render(<LibrarySidebar {...props}>Manage</LibrarySidebar>)
 const last=screen.getByRole('treeitem',{name:'Long category name at level 7, 0 assets'});expect(last).toHaveStyle({paddingLeft:'35px'});expect(last.title).toContain('Long category name at level 0 › Long category name at level 1')
 expect(screen.queryByRole('treeitem',{name:'Empty, 0 assets'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Collapse all'}));expect(collapse).toHaveBeenCalledOnce();fireEvent.click(screen.getByRole('button',{name:'Expand current path'}));expect(reveal).toHaveBeenCalledOnce()
 fireEvent.click(screen.getByRole('checkbox',{name:'Show empty categories'}));expect(show).toHaveBeenCalledWith(true)
 rerender(<LibrarySidebar {...props} showEmpty>Manage</LibrarySidebar>);expect(screen.getByRole('treeitem',{name:'Empty, 0 assets'})).toHaveAttribute('data-empty','true')
})
