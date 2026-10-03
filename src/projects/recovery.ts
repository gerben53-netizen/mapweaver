import { useHistoryStore } from '../store/history'
import { gatherProject, encodeProject, decodeProject } from './archive'
import { currentSnapshot, useProjectSession, applyPrepared, runProjectTask } from './session'
import { recoveryRepository } from './recoveryRepository'
import { PROJECT_LIMITS as L } from './limits'
import type { PreparedProject } from './types'
const removed = new Set<string>()
export async function removeRecovery(id: string) { removed.add(id); await recoveryRepository.remove(id) }
// Injectable boundary keeps debounce and completed-action behavior testable without pixels/IndexedDB.
export function startRecovery(write: (value: PreparedProject, downloadedAt: string | null) => Promise<void> = (value, date) => recoveryRepository.save(value, date), gather = gatherProject) {
  let timer: ReturnType<typeof setTimeout> | undefined, stopped = false, last = JSON.stringify(currentSnapshot()), generation = useProjectSession.getState().generation
  let queued = Promise.resolve()
  let revision = 0
  const schedule = (touch: boolean) => {
    if (stopped) return
    clearTimeout(timer)
    const scheduledRevision = ++revision
    useProjectSession.setState({ autosave: 'saving' })
    if (touch) useProjectSession.setState(({ info }) => ({ info: { ...info, modifiedAt: new Date(Math.max(Date.now(), Date.parse(info.modifiedAt) + 1)).toISOString() } }))
    const state = currentSnapshot(), session = useProjectSession.getState()
    if (touch) removed.delete(session.info.id)
    timer = setTimeout(() => {
      queued = queued.then(async () => {
        if (stopped || session.generation !== useProjectSession.getState().generation) return
        try {
          useProjectSession.setState({ autosave: 'saving' })
          const prepared = await gather(state, session.info)
          if (stopped || session.generation !== useProjectSession.getState().generation) return
          if (removed.has(session.info.id)) { useProjectSession.setState({ autosave: 'idle' }); return }
          await write(prepared, session.downloadedAt)
          if (scheduledRevision === revision && session.generation === useProjectSession.getState().generation) useProjectSession.setState({ warning: '', autosave: 'saved' })
        } catch { if (!stopped && scheduledRevision === revision && session.generation === useProjectSession.getState().generation) useProjectSession.setState({ autosave: 'failed', warning: 'Local recovery could not be saved. Download a project backup; editing can continue.' }) }
      })
    }, L.debounce)
  }
  const unhistory = useHistoryStore.subscribe((history) => {
    if (history.busy) return
    const next = JSON.stringify(currentSnapshot()), current = useProjectSession.getState()
    if (next === last && current.generation === generation) return
    const changedProject = current.generation !== generation
    last = next; generation = current.generation; schedule(!changedProject)
  })
  const unsession = useProjectSession.subscribe((state, previous) => { if (state.downloadedAt !== previous.downloadedAt && state.generation === previous.generation) schedule(false) })
  return () => { stopped = true; clearTimeout(timer); unhistory(); unsession() }
}
export function resumeRecovery(id: string, confirm: () => boolean) {
  return runProjectTask('Checking recovery copy…', async () => {
    // Reuse the exact same strict parser/image validation for locally stored content.
    const copy = await recoveryRepository.read(id)
    const prepared = await decodeProject(await encodeProject(copy))
    applyPrepared(prepared, confirm, true)
  })
}

