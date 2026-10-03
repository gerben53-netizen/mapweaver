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
it('hides development wall choices in installer builds while retaining a saved development selection',()=>{
 vi.stubEnv('VITE_MAPWEAVER_INSTALLER','1')
 try{
  const map={...defaultMapStyle(),width:800,height:600,background:null},production=generatedWallStyle(SIMPLE_WALL,map),legacy=generatedWallStyle(SIMPLE_WALL,map,'living-root','dev-1'),onChange=vi.fn()
  const view=render(<WallFields value={production} onChange={onChange}/>)
  expect(screen.queryByRole('option',{name:/development/})).toBeNull()
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
