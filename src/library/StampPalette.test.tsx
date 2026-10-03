import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { StampPalette } from './StampPalette'
import { useCampaignStore } from '../campaigns/session'
import { emptyStampPalettes, paletteAdd, validateStampPalettes } from '../domain/stampPalettes'
import { useStampPaletteStore } from './stampPaletteStore'
import { useStampDrag } from './stampPlacement'
import { api } from '../storage/api'
let saved = paletteAdd(emptyStampPalettes(), ['chair', 'missing'])
vi.mock('../storage/api', () => ({ api:vi.fn(),beginStorageWork:()=>()=>{} }))
vi.mock('../storage/libraryRepository',()=>({libraryRepository:{getAsset:async(id:string)=>id==='missing'?undefined:{id,kind:'stamp',name:'Chair'}}}))
vi.mock('./AssetThumbnail',()=>({AssetThumbnail:()=> <span>Thumbnail</span>}))
vi.mock('./stampPlacement',async importOriginal=>({...await importOriginal<typeof import('./stampPlacement')>(),activateStamp:vi.fn()}))
beforeEach(()=>{
  saved=paletteAdd(emptyStampPalettes(),['chair','missing'])
  useCampaignStore.setState({snapshot:{campaign:{id:'campaign',name:'Test',revision:1,createdAt:'',modifiedAt:'',deletedAt:null},nodes:[],preferences:{selected:null,expanded:[],view:'list'}}})
  useStampPaletteStore.setState({collapsed:false})
  vi.mocked(api).mockImplementation(async(_path,method,body)=>{if(method==='PUT')saved={...validateStampPalettes(body),revision:saved.revision+1};return saved as never})
  vi.spyOn(window,'confirm').mockReturnValue(true)
})
it('creates, renames and deletes named palettes without touching source assets',async()=>{
  render(<StampPalette/>);await waitFor(()=>expect(screen.getByRole('button',{name:'New'})).toBeEnabled())
  const prompt=vi.spyOn(window,'prompt').mockReturnValue('Library')
  fireEvent.click(screen.getByRole('button',{name:'New'}));await waitFor(()=>expect(saved.palettes).toHaveLength(2))
  await waitFor(()=>expect(screen.getByRole('button',{name:'Rename'})).toBeEnabled());prompt.mockReturnValue('Study')
  fireEvent.click(screen.getByRole('button',{name:'Rename'}));await waitFor(()=>expect(saved.palettes[1].name).toBe('Study'))
  await waitFor(()=>expect(screen.getByRole('button',{name:'Delete'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Delete'}))
  await waitFor(()=>expect(saved.palettes).toHaveLength(1));expect(saved.palettes[0].assetIds).toEqual(['chair','missing'])
  expect(vi.mocked(api).mock.calls.every(([path])=>path==='/campaigns/campaign/stamp-palettes')).toBe(true)
})
it('keeps missing entries removable, supports keyboard reorder and remembers collapse locally',async()=>{
  render(<StampPalette/>);const missing=await screen.findByRole('button',{name:/Place Missing asset/})
  fireEvent.focus(missing);fireEvent.click(screen.getByRole('button',{name:'Move left'}));await waitFor(()=>expect(saved.palettes[0].assetIds).toEqual(['missing','chair']))
  await waitFor(()=>expect(screen.getByRole('button',{name:'Remove from palette'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Remove from palette'}))
  await waitFor(()=>expect(saved.palettes[0].assetIds).toEqual(['chair']))
  fireEvent.click(screen.getByRole('button',{name:/Stamp palette/}));expect(localStorage.getItem('mapweaver.stampPalette.collapsed')).toBe('true');expect(screen.queryByRole('button',{name:'Place Chair'})).toBeNull()
})
it('drag reorders palette entries and accepts Library references without activation',async()=>{
  render(<StampPalette/>);const missing=await screen.findByRole('button',{name:/Place Missing asset/})
  act(()=>useStampDrag.setState({id:'chair',source:'palette'}));fireEvent.drop(missing)
  await waitFor(()=>expect(saved.palettes[0].assetIds).toEqual(['missing','chair']))
  await waitFor(()=>expect(useStampPaletteStore.getState().busy).toBe(false))
  act(()=>useStampDrag.setState({id:'table',source:'library'}));fireEvent.drop(screen.getByRole('region',{name:'Stamp palette'}))
  await waitFor(()=>expect(saved.palettes[0].assetIds).toEqual(['missing','chair','table']))
})
