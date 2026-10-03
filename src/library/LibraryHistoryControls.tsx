import { useLibraryHistory, undoLibrary } from './libraryHistory'
export function LibraryHistoryControls() {
  const s = useLibraryHistory()
  return <span><button disabled={!s.undo.length || s.busy} onClick={() => void undoLibrary()}>Undo library</button><button disabled={!s.redo.length || s.busy} onClick={() => void undoLibrary(true)}>Redo library</button></span>
}
