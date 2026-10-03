import { libraryDrafts, flushLibraryDrafts } from '../library/libraryHistory'
import { api, browserClientId, request, storageWork, pauseLifecycleAutosave } from '../storage/api'
import { hasUnsavedChanges, useProjectSession } from './session'
import { saveLocalProject } from './localSession'
import { finishObjectGesture } from '../canvas/interaction'

interface Status { phase: 'running' | 'stopping-requested' | 'flushing' | 'closing' | 'error'; ticket: string; hold?: boolean }
/** Freeze editing before acknowledging: no new dirty state can appear after the flush. */
export function startLifecycleClient() {
  let disposed = false, polling = false, acknowledged = '', stopping = false
  const root = document.getElementById('root')
  const overlay = document.createElement('dialog')
  overlay.setAttribute('role', 'alertdialog'); overlay.setAttribute('aria-label', 'Mapweaver lifecycle')
  Object.assign(overlay.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', maxWidth: 'none', maxHeight: 'none', border: '0', margin: '0', boxSizing: 'border-box', zIndex: '100000', background: '#161b20f5', color: '#eef2f3', display: 'grid', placeContent: 'center', padding: '32px', whiteSpace: 'pre-wrap' })
  overlay.addEventListener('cancel', event => event.preventDefault())
  const show = (text: string) => { if (root) root.inert = true; if (overlay.dataset.message !== text) { overlay.textContent = text; overlay.dataset.message = text }; if (!overlay.isConnected) { overlay.tabIndex = -1; document.body.append(overlay); overlay.showModal(); overlay.focus() } }
  const restore = () => { if (root) root.inert = false; if (overlay.open) overlay.close(); overlay.remove(); pauseLifecycleAutosave(false); acknowledged = ''; stopping = false }
  const poll = async () => {
    if (disposed || polling) return
    polling = true
    try {
      const status = await api<Status>('/lifecycle/client', 'POST', { id: browserClientId, busy: !!useProjectSession.getState().busy || storageWork > 0 })
      if (disposed) return
      if (status.phase === 'running') { restore(); return }
      stopping = true; pauseLifecycleAutosave(true)
      if (!status.hold) show(status.phase === 'error' ? 'Mapweaver could not stop safely.\nUse the tray menu to keep running and resolve unsaved work, or retry Stop. Nothing was force-closed.' : 'Mapweaver is stopping…\nWaiting for active work and saving browser changes. Keep this tab open.')
      if (status.phase === 'error' && !overlay.querySelector('button')) {
        const button = document.createElement('button'); button.textContent = 'Resolve closed or crashed tabs'
        button.onclick = () => { if (window.confirm('Close other Mapweaver tabs and preserve their work first. Unsynced edits in those tabs have NOT been saved and may be lost. Recovery buffers are kept. Release their waits and retry Stop?')) void api('/lifecycle/client', 'POST', { id: browserClientId, decision: 'release-tabs', confirmed: true }).catch(() => {}) }
        overlay.append(button)
        const keep = document.createElement('button'); keep.textContent = 'Keep Mapweaver running'; keep.onclick = () => { void api('/lifecycle/client', 'POST', { id: browserClientId, decision: 'keep' }).catch(() => {}) }; overlay.append(keep)
      }
      if (status.hold) {
        show('Mapweaver is waiting for your decision about active work.\nUse the tray menu, or choose below. Work will not be force-closed.')
        if (!overlay.querySelector('button')) for (const [decision, label] of [['wait', 'Wait and stop when finished'], ['keep', 'Keep Mapweaver running']] as const) {
          const button = document.createElement('button'); button.textContent = label
          button.onclick = () => { void api('/lifecycle/client', 'POST', { id: browserClientId, decision }).then(() => poll()).catch(() => {}) }
          overlay.append(button)
        }
        return
      }
      if (status.phase === 'flushing' && acknowledged !== status.ticket) {
        if (useProjectSession.getState().busy || storageWork) return
        if (!(await flushLibraryDrafts())) { show('Mapweaver cannot stop: library input is unsaved. Keep Mapweaver running, then retry or discard the draft.'); return }
        finishObjectGesture()
        if (hasUnsavedChanges() || useProjectSession.getState().saveStatus === 'saving') await saveLocalProject()
        const state = useProjectSession.getState()
        if (hasUnsavedChanges() || state.saveStatus === 'error' || state.saveStatus === 'conflict') { show('Mapweaver cannot stop: this tab has unsaved changes.\nUse Keep Mapweaver running in the tray, then resolve the save error or export your work.'); return }
        await api('/lifecycle/client', 'POST', { id: browserClientId, ticket: status.ticket })
        acknowledged = status.ticket
      }
      if (status.phase === 'closing') show('Mapweaver has stopped.\nOpen Mapweaver.exe to start again, then reload this tab.')
    } catch {
      if (stopping && acknowledged) show('Mapweaver has stopped.\nOpen Mapweaver.exe to start again, then reload this tab.')
      else if (stopping) show('The service is unavailable. Unsaved work remains in this tab.\nCheck the Mapweaver tray. Reload only after preserving unsaved work.')
    } finally { polling = false }
  }
  // Cleanly closing tabs unregister; suspended/crashed tabs remain a conservative stop barrier.
  const leave = () => { if (!libraryDrafts.size && !hasUnsavedChanges() && !useProjectSession.getState().busy) void request('/lifecycle/client', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: browserClientId, leave: true }) }).catch(() => {}) }
  const blockKeys = (event: KeyboardEvent) => { if (stopping) { event.stopImmediatePropagation(); if (!['Tab', 'Enter', ' '].includes(event.key) || event.ctrlKey || event.metaKey) event.preventDefault() } }
  window.addEventListener('keydown', blockKeys, true)
  window.addEventListener('pagehide', leave)
  void poll(); const timer = setInterval(() => { void poll() }, 500)
  return () => { disposed = true; clearInterval(timer); window.removeEventListener('pagehide', leave); window.removeEventListener('keydown', blockKeys, true); leave(); restore() }
}
