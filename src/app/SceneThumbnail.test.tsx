import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SceneThumbnail } from './SceneThumbnail'
const cache=vi.hoisted(()=>({acquireLibraryThumbnail:vi.fn(),acquireAssetImage:vi.fn(),acquireThumbnail:vi.fn(),acquireBackgroundImage:vi.fn()}))
vi.mock('../images/imageCache',()=>cache)
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks()})
it('loads only cached library previews when visible and releases their lease',async()=>{
  let intersect!:(entries:{isIntersecting:boolean}[])=>void
  vi.stubGlobal('IntersectionObserver',class{constructor(callback:typeof intersect){intersect=callback}observe(){}disconnect(){}})
  const release=vi.fn();cache.acquireLibraryThumbnail.mockReturnValue({promise:Promise.resolve({src:'blob:preview'}),release})
  const view=render(<SceneThumbnail id="bookcase"/>);expect(cache.acquireLibraryThumbnail).not.toHaveBeenCalled()
  act(()=>intersect([{isIntersecting:true}]))
  await waitFor(()=>expect(view.container.querySelector('img')).toHaveAttribute('src','blob:preview'))
  expect(cache.acquireLibraryThumbnail).toHaveBeenCalledWith('bookcase');expect(cache.acquireAssetImage).not.toHaveBeenCalled()
  view.unmount();expect(release).toHaveBeenCalledOnce()
})
it('keeps the row usable with a missing-asset icon and no full-resolution fallback',async()=>{
  vi.stubGlobal('IntersectionObserver',class{constructor(private callback:(entries:{isIntersecting:boolean}[])=>void){}observe(){this.callback([{isIntersecting:true}])}disconnect(){}})
  cache.acquireLibraryThumbnail.mockReturnValue({promise:Promise.reject(Error('missing')),release:vi.fn()})
  render(<SceneThumbnail id="missing"/>);await screen.findByLabelText('Missing stamp asset')
  expect(cache.acquireAssetImage).not.toHaveBeenCalled();expect(cache.acquireThumbnail).not.toHaveBeenCalled()
})
