import { create } from 'zustand'
import { api, beginStorageWork } from '../storage/api'
import { useCampaignStore } from '../campaigns/session'
import { emptyStampPalettes, validateStampPalettes, paletteAdd } from '../domain/stampPalettes'
import type { StampPalettes } from '../domain/stampPalettes'
function collapsedPreference() { try { return localStorage.getItem('mapweaver.stampPalette.collapsed') === 'true' } catch { return false } }
export const useStampPaletteStore = create(() => ({ campaignId: '', value: emptyStampPalettes(), ready: false, busy: false, error: '', collapsed: collapsedPreference() }))
let sequence = 0
export async function loadStampPalettes(campaignId: string) {
  const token = ++sequence
  useStampPaletteStore.setState({ campaignId, ready: false, busy: false, error: '', value: emptyStampPalettes() })
  if (!campaignId) return
  try {
    const value = validateStampPalettes(await api(`/campaigns/${campaignId}/stamp-palettes`))
    if (token === sequence) useStampPaletteStore.setState({ value, ready: true })
  } catch (e) { if (token === sequence) useStampPaletteStore.setState({ error: (e as Error).message }) }
}
export async function changeStampPalettes(change: (value: StampPalettes) => StampPalettes) {
  const s = useStampPaletteStore.getState()
  if (!s.ready || s.busy || s.campaignId !== useCampaignStore.getState().snapshot?.campaign.id) return
  const token = sequence, end = beginStorageWork()
  useStampPaletteStore.setState({ busy: true, error: '' })
  try {
    const value = await api<StampPalettes>(`/campaigns/${s.campaignId}/stamp-palettes`, 'PUT', validateStampPalettes(change(s.value)))
    if (token === sequence) useStampPaletteStore.setState({ value })
  } catch (e) { if (token === sequence) useStampPaletteStore.setState({ error: (e as Error).message }) }
  finally { end(); if (token === sequence) useStampPaletteStore.setState({ busy: false }) }
}
export const addToStampPalette = (ids: string[]) => changeStampPalettes(value => paletteAdd(value, ids))
export function collapseStampPalette(collapsed: boolean) {
  useStampPaletteStore.setState({ collapsed })
  try { localStorage.setItem('mapweaver.stampPalette.collapsed', String(collapsed)) } catch { /* Session remains usable without preferences. */ }
}
