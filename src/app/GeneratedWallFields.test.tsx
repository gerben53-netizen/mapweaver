import { render,screen,fireEvent } from '@testing-library/react'
import { expect,it,vi } from 'vitest'
import { GeneratedWallFields } from './GeneratedWallFields'
import { generatedWallStyle } from '../domain/generatedWalls'
import { SIMPLE_WALL } from '../domain/walls'
import { defaultMapStyle } from '../domain/mapSettings'
import { WallFields } from './WallFields'
it('offers width presets and only the three generated parameters, with explicit reseeding',()=>{
 const value=generatedWallStyle(SIMPLE_WALL,{...defaultMapStyle(),width:800,height:600,background:null}),onChange=vi.fn();render(<GeneratedWallFields value={value} onChange={onChange}/>);
 fireEvent.change(screen.getByLabelText('Wall width preset'),{target:{value:'Heavy'}});expect(onChange.mock.lastCall?.[0].strokeWidth).toBe(20)
 fireEvent.change(screen.getByLabelText('Living Root preset'),{target:{value:'Clean'}});expect(onChange.mock.lastCall?.[0].wall.generated).toMatchObject({organic:.35,growth:.2,overgrowth:0})
 fireEvent.change(screen.getByLabelText('Wall growth'),{target:{value:90}});expect(onChange.mock.lastCall?.[0].wall.generated.growth).toBe(.9)
 fireEvent.click(screen.getByRole('button',{name:'Randomize variation'}));expect(onChange.mock.lastCall?.[0].wall.generated.seed).not.toBe(value.wall.generated!.seed);expect(screen.getAllByRole('slider')).toHaveLength(3)
})
it('hides development wall choices in normal builds while retaining a saved development selection',()=>{
 vi.stubEnv('VITE_MAPWEAVER_INSTALLER','true')
 try{
  const map={...defaultMapStyle(),width:800,height:600,background:null},production=generatedWallStyle(SIMPLE_WALL,map),legacy=generatedWallStyle(SIMPLE_WALL,map,'living-root','dev-1'),onChange=vi.fn()
  const view=render(<WallFields value={production} onChange={onChange}/>)
  expect(screen.queryByRole('option',{name:/development/})).toBeNull();expect(screen.getByRole('option',{name:'Bleke paleissteen'})).toHaveValue('pale-palace-stone@production-1');expect(screen.getByRole('option',{name:'Marmer'})).toHaveValue('marble@production-1');expect(screen.getByRole('option',{name:'Ruwe natuursteen'})).toHaveValue('rough-stone@production-1')
  view.rerender(<WallFields value={legacy} onChange={onChange}/>)
  expect(screen.getByRole('option',{name:/development/})).toBeInTheDocument()
  expect(screen.getByLabelText('Wall material or generator')).toHaveValue('living-root@dev-1')
 }finally{vi.unstubAllEnvs()}
})
it('offers only regularity and variation for masonry and preserves the native width control',()=>{
 const value=generatedWallStyle(SIMPLE_WALL,{...defaultMapStyle(),width:800,height:600,background:null},'masonry-rough','dev-1'),onChange=vi.fn()
 render(<GeneratedWallFields value={value} onChange={onChange}/>);
 expect(screen.getAllByRole('slider')).toHaveLength(2);expect(screen.queryByLabelText('Living Root preset')).toBeNull()
 fireEvent.change(screen.getByLabelText('Wall regularity'),{target:{value:80}});expect(onChange.mock.lastCall?.[0].wall.generated.regularity).toBe(.8)
 fireEvent.change(screen.getByLabelText('Wall variation'),{target:{value:40}});expect(onChange.mock.lastCall?.[0].wall.generated.variation).toBe(.4)
})

it('offers only rock roughness/variation and exposes DEV cave choices outside installer builds',()=>{
 const map={...defaultMapStyle(),width:800,height:600,background:null},value=generatedWallStyle(SIMPLE_WALL,map,'cave-rock','dev-1'),onChange=vi.fn();
 render(<WallFields value={value} onChange={onChange}/>);expect(screen.getAllByRole('slider')).toHaveLength(2);expect(screen.queryByLabelText('Living Root preset')).toBeNull();expect(screen.queryByLabelText('Wall regularity')).toBeNull();
 fireEvent.change(screen.getByLabelText('Wall roughness'),{target:{value:80}});expect(onChange.mock.lastCall?.[0].wall.generated.roughness).toBe(.8);expect(screen.getByRole('option',{name:/Cave Rock/})).toHaveValue('cave-rock@dev-1');
})

it.each(['timber-rustic','timber-refined'])('offers %s DEV with only regularity/variation and hides it in installer choices',id=>{
 const map={...defaultMapStyle(),width:800,height:600,background:null},value=generatedWallStyle(SIMPLE_WALL,map,id,'dev-1'),onChange=vi.fn();const view=render(<WallFields value={value} onChange={onChange}/>);expect(screen.getByLabelText('Wall material or generator')).toHaveValue(id+'@dev-1');expect(screen.getAllByRole('slider')).toHaveLength(2);expect(screen.getByLabelText('Wall regularity')).toHaveValue(id==='timber-refined'?'95':'65');expect(screen.queryByLabelText('Living Root preset')).toBeNull();fireEvent.change(screen.getByLabelText('Wall variation'),{target:{value:70}});expect(onChange.mock.lastCall?.[0].wall.generated.variation).toBe(.7);
 vi.stubEnv('VITE_MAPWEAVER_INSTALLER','true');try{view.rerender(<WallFields value={generatedWallStyle(SIMPLE_WALL,map)} onChange={onChange}/>);expect(screen.queryByRole('option',{name:/Timber/})).toBeNull();view.rerender(<WallFields value={value} onChange={onChange}/>);expect(screen.getByLabelText('Wall material or generator')).toHaveValue(id+'@dev-1')}finally{vi.unstubAllEnvs()}
})
