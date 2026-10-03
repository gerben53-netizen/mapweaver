import { expect,it,vi } from 'vitest'
import { render,screen,fireEvent } from '@testing-library/react'
import { FontPicker } from './FontPicker'
import { DEFAULT_TEXT } from '../domain/annotations'
it('groups fonts with accessible names, current choice and styled previews; keyboard navigation and Escape work',()=>{
 const changed=vi.fn();render(<FontPicker value={{...DEFAULT_TEXT,font:'cinzel'}} onChange={changed}/>);fireEvent.click(screen.getByRole('button',{name:'Choose font'}))
 expect(screen.getByRole('region',{name:'Map / Display'})).toBeVisible();const chosen=screen.getByRole('button',{name:'Cinzel'});expect(chosen).toHaveAttribute('aria-pressed','true');expect(chosen.querySelector('[aria-hidden]')?.getAttribute('style')).toContain('Mapweaver Cinzel')
 chosen.focus();fireEvent.keyDown(chosen,{key:'ArrowDown'});expect(screen.getByRole('button',{name:'Marcellus SC'})).toHaveFocus();fireEvent.click(screen.getByRole('button',{name:'Marcellus SC'}));expect(changed).toHaveBeenCalledWith(expect.objectContaining({font:'marcellussc',bold:false,italic:false}))
 fireEvent.keyDown(chosen,{key:'Escape'});expect(screen.queryByRole('group',{name:'Font library'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Choose font'})).toHaveFocus()
})
