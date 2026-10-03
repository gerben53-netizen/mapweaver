import {beforeEach,afterEach,expect,it,vi} from 'vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {WorldWizard} from './WorldWizard'
import {loadWorldScatterAssets} from './scatterResources'
import type {WorldScatterAsset} from './scatterModel'
vi.mock('./scatterResources',()=>({loadWorldScatterAssets:vi.fn(),prepareWorldResources:vi.fn()}))
vi.mock('./GeneratorReadiness',()=>({GeneratorReadiness:()=>null}))
const post=vi.fn()
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};post.mockReset();vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);vi.stubGlobal('Worker',class {postMessage=post;terminate=vi.fn()})})
afterEach(()=>vi.unstubAllGlobals())
it('initializes the family from New Map and filters before posting to the generation worker',async()=>{
 const painterly={id:'paint',generator:{themes:['painterlyFantasy']}} as WorldScatterAsset,other={id:'other',generator:{themes:['parchment']}} as WorldScatterAsset
 vi.mocked(loadWorldScatterAssets).mockResolvedValue([painterly,other])
 render(<WorldWizard initialThemeId="world.painterlyFantasy" name="Atlas" width={800} height={600} widthKm={10000} busy={false} error="" onClose={()=>{}} onApply={async()=>{}}/>)
 expect(screen.getByLabelText('Visual style')).toHaveValue('world.painterlyFantasy');expect(screen.getByLabelText('Scatter asset theme')).toHaveValue('painterlyFantasy')
 fireEvent.change(screen.getByLabelText('mountains stamp density'),{target:{value:'low'}});fireEvent.click(screen.getByRole('button',{name:'Generate preview'}))
 await waitFor(()=>expect(post).toHaveBeenCalledWith(expect.objectContaining({assets:[painterly],settings:expect.objectContaining({theme:'painterlyFantasy'})})))
 fireEvent.click(screen.getByRole('button',{name:'Cancel generation'}))
})
