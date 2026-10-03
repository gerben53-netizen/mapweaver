import {useState} from 'react'
import {beforeEach,expect,it,vi} from 'vitest'
import {fireEvent,render,screen} from '@testing-library/react'
import {NewMapWizard} from './NewMapWizard'
import {initialMapDraft} from '../projects/newMap'
vi.mock('../world/themePreview',()=>({themePreview:vi.fn(()=>new Promise(()=>{}))}))
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}})
function Harness({submit=()=>{}}:{submit?:(d:typeof initialMapDraft)=>void}){const [draft,setDraft]=useState(initialMapDraft);return <NewMapWizard draft={draft} setDraft={setDraft} busy={false} error="" onClose={()=>{}} onCreate={()=>submit(draft)}/>}
it('shows only supported themes and resets type-specific creation defaults',()=>{
 render(<Harness/>);expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
 fireEvent.change(screen.getByLabelText('Map type'),{target:{value:'world-map'}})
 expect(screen.getByRole('radio',{name:/Painterly Fantasy/})).toHaveAttribute('aria-checked','true')
 expect(screen.getByRole('radio',{name:'Generate world'})).toBeVisible()
 fireEvent.change(screen.getByLabelText('Map type'),{target:{value:'regional-map'}})
 expect(screen.getByRole('radio',{name:/Painterly Fantasy/})).toHaveAttribute('aria-checked','true');expect(screen.queryByRole('radio',{name:'Generate world'})).not.toBeInTheDocument()
 fireEvent.change(screen.getByLabelText('Map type'),{target:{value:'battlemap'}});expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
})
it('submits selected theme before blank creation or entering generation and supports arrow selection',()=>{
 const submit=vi.fn();render(<Harness submit={submit}/>);fireEvent.change(screen.getByLabelText('Map type'),{target:{value:'world-map'}})
 fireEvent.keyDown(screen.getByRole('radio',{name:/Painterly Fantasy/}),{key:'ArrowRight'})
 expect(screen.getByRole('radio',{name:/Classic Parchment/})).toHaveFocus()
 fireEvent.click(screen.getByRole('button',{name:'Create map'}));expect(submit).toHaveBeenLastCalledWith(expect.objectContaining({themeId:'world.classicParchment',startingPoint:'blank'}))
 fireEvent.click(screen.getByRole('radio',{name:'Generate world'}));fireEvent.click(screen.getByRole('button',{name:'Continue to world preview'}));expect(submit).toHaveBeenLastCalledWith(expect.objectContaining({themeId:'world.classicParchment',startingPoint:'generate'}))
})
