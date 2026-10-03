import { render,screen,fireEvent } from '@testing-library/react'
import { expect,it,vi } from 'vitest'
import { GeneratedWallFields } from './GeneratedWallFields'
import { generatedWallStyle } from '../domain/generatedWalls'
import { SIMPLE_WALL } from '../domain/walls'
import { defaultMapStyle } from '../domain/mapSettings'
it('offers width presets and only the three generated parameters, with explicit reseeding',()=>{
 const value=generatedWallStyle(SIMPLE_WALL,{...defaultMapStyle(),width:800,height:600,background:null}),onChange=vi.fn();render(<GeneratedWallFields value={value} onChange={onChange}/>);
 fireEvent.change(screen.getByLabelText('Wall width preset'),{target:{value:'Heavy'}});expect(onChange.mock.lastCall?.[0].strokeWidth).toBe(20)
 fireEvent.change(screen.getByLabelText('Living Root preset'),{target:{value:'Clean'}});expect(onChange.mock.lastCall?.[0].wall.generated).toMatchObject({organic:.35,growth:.2,overgrowth:0})
 fireEvent.change(screen.getByLabelText('Wall growth'),{target:{value:90}});expect(onChange.mock.lastCall?.[0].wall.generated.growth).toBe(.9)
 fireEvent.click(screen.getByRole('button',{name:'Randomize variation'}));expect(onChange.mock.lastCall?.[0].wall.generated.seed).not.toBe(value.wall.generated!.seed);expect(screen.getAllByRole('slider')).toHaveLength(3)
})
