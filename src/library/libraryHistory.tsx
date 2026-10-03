import { cleanRemovedAssets, prepareAssetRemoval } from './assetRemoval'
import { useEditorStore } from '../store/editorStore'
import { toAsset } from '../storage/remoteLibrary'
import type { RemoteAsset } from '../storage/api'
import { create } from 'zustand'
import { api, beginStorageWork } from '../storage/api'
export const libraryDrafts = new Set<string>()
export const confirmLibraryNavigation = () => { if(!libraryDrafts.size)return true; if(!window.confirm('Library input has not been saved. Keep editing with Cancel, or discard it and continue?'))return false; window.dispatchEvent(new Event('mapweaver-library-discard'));libraryDrafts.clear();return true }
export const libraryFlushers = new Map<string,()=>Promise<void>>()
export async function flushLibraryDrafts(){for(const [id,flush] of libraryFlushers)if(libraryDrafts.has(id))await flush();return libraryDrafts.size===0}
interface State { undo: string[]; redo: string[]; revision: number; busy: boolean; error: string; changed: number }
export const useLibraryHistory = create<State>(() => ({ undo: [], redo: [], revision: 0, busy: false, error: '', changed: 0 }))
export async function runLibraryCommand(body: object) {
  const state = useLibraryHistory.getState(); if (state.busy) throw Error('A library change is still saving. Retry this field.')
  const end = beginStorageWork(); useLibraryHistory.setState({ busy: true, error: '' })
  try { const result = await api<{ token: string; revision: number }>('/library/command', 'POST', { revision: state.revision, ...body }); useLibraryHistory.setState({ revision: result.revision, undo: [...state.undo, result.token].slice(-10), redo: [], changed: state.changed + 1 }); await refreshActiveAssetDefault(); return result }
  catch (e) { useLibraryHistory.setState({ error: (e as Error).message }); throw e }
  finally { end(); useLibraryHistory.setState({ busy: false }) }
}
export async function undoLibrary(redo = false) {
  const s = useLibraryHistory.getState(), source = redo ? s.redo : s.undo, token = source.at(-1)
  if (!token || s.busy || libraryDrafts.size) return
  try { const {ids}=await api<{ids:string[]}>('/library/undo-removal-preview','POST',{token}); if(ids.length){prepareAssetRemoval(ids);if(!window.confirm(`This library history action removes ${ids.length} assets. Related clipboard items and affected map history will be cleared. Continue?`))return} const result = await runLibraryCommand({ op: 'undo', token }); if(ids.length)cleanRemovedAssets(new Set(ids)); useLibraryHistory.setState(redo ? { redo: s.redo.slice(0, -1), undo: [...s.undo, result.token] } : { undo: s.undo.slice(0, -1), redo: [...s.redo, result.token] }) } catch (e) { useLibraryHistory.setState({error:(e as Error).message}) }
}

export async function refreshActiveAssetDefault(){const a=useEditorStore.getState().stampAsset;if(a){try{const fresh=toAsset(await api<RemoteAsset>(`/assets/${a.id}`));if(useEditorStore.getState().stampAsset?.id===a.id)useEditorStore.setState({stampAsset:fresh})}catch{/* Preserve the current tool; explicit picking still reports unavailable assets. */}}}
