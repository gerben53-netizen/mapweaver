import { Icon } from './Icon'
import { history, useHistoryStore } from '../store/history'
import styles from './HistoryControls.module.css'
export function HistoryControls() {
  const { undoLabel, redoLabel, busy } = useHistoryStore()
  return <div className={styles.controls} aria-label="History">
    <button disabled={busy || !undoLabel} title={busy ? 'Finish the current gesture first' : undoLabel ? `Undo: ${undoLabel} (Ctrl+Z)` : 'Nothing to undo'} aria-label={undoLabel ? `Undo: ${undoLabel}` : 'Undo'} onClick={() => history.undo()}><Icon name="undo" /></button>
    <button disabled={busy || !redoLabel} title={busy ? 'Finish the current gesture first' : redoLabel ? `Redo: ${redoLabel} (Ctrl+Shift+Z / Ctrl+Y)` : 'Nothing to redo'} aria-label={redoLabel ? `Redo: ${redoLabel}` : 'Redo'} onClick={() => history.redo()}><Icon name="redo" /></button>
  </div>
}
