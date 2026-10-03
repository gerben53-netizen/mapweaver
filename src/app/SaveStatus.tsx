import { saveStateText } from './editorUx'
import type { useProjectSession } from '../projects/session'

type Session = ReturnType<typeof useProjectSession.getState>
export function SaveStatus({ saveStatus, recoveryDirty, savedAt }: Pick<Session, 'saveStatus' | 'recoveryDirty' | 'savedAt'>) {
  return <small data-save-state={saveStatus} role="status" title={savedAt ? `Saved locally at ${new Date(savedAt).toLocaleString()}. Autosave is on.` : 'Autosave writes completed edits locally.'}>{saveStateText(saveStatus, recoveryDirty, savedAt)}</small>
}
