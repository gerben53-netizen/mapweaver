import { texturePaintAssetIds } from '../domain/terrainPaint'
import { objectAssetIds } from '../domain/areas'
import { create } from 'zustand'
import { EDITABLE_JSON_BYTES } from '../domain/documentLimits'
import type { MapDocument, MapLayer, MapObject } from '../domain/models'
import type { LayerTree, ObjectGroup } from '../domain/grouping'
import { finishObjectGesture, objectGestureActive } from '../canvas/interaction'
export const HISTORY_LIMIT = 100
export interface ProjectSnapshot { map: MapDocument; objects: MapObject[]; layers: MapLayer[]; objectGroups?: ObjectGroup[]; layerTree?: LayerTree | null }
interface Entry { label: string; before: ProjectSnapshot; after: ProjectSnapshot }
interface Adapter { changed?: (reset?: boolean) => void; read: () => ProjectSnapshot; restore: (state: ProjectSnapshot) => void; retain: (states: ProjectSnapshot[]) => void; report: (message: string) => void }
let adapter: Adapter
let past: Entry[] = [], future: Entry[] = []
let transaction: { label: string; before: ProjectSnapshot } | null = null
let clean = ''
const signature = (state: ProjectSnapshot) => JSON.stringify(state)
export const useHistoryStore = create(() => ({ undoLabel: '', redoLabel: '', busy: false, dirty: false, undoCount: 0, redoCount: 0 }))
function publish() {
  adapter.changed?.()
  const current = adapter.read()
  useHistoryStore.setState({ undoLabel: past.at(-1)?.label || '', redoLabel: future.at(-1)?.label || '', busy: !!transaction, dirty: signature(current) !== clean, undoCount: past.length, redoCount: future.length })
  adapter.retain([current, ...past.flatMap((entry) => [entry.before, entry.after]), ...future.flatMap((entry) => [entry.before, entry.after]), ...(transaction ? [transaction.before] : [])])
}
export function configureHistory(value: Adapter) { adapter = value; clean = signature(adapter.read()) }
export const history = {
  begin(label: string) {
    if (transaction) throw new Error('Finish the current edit first.')
    transaction = { label, before: adapter.read() }
    // No resource pruning here: an importer may just have staged a new background.
    useHistoryStore.setState({ busy: true })
  },
  commit() {
    if (!transaction) return
    const { label, before } = transaction, after = adapter.read()
    transaction = null
    const encoded = signature(after)
    if (encoded.length > EDITABLE_JSON_BYTES / 3) {
      const bytes = new TextEncoder().encode(encoded).length
      if (bytes > EDITABLE_JSON_BYTES && bytes > new TextEncoder().encode(signature(before)).length) {
        adapter.restore(before); publish()
        adapter.report('This edit exceeds the project metadata budget. Remove objects or simplify the map before adding more.')
        return
      }
    }
    if (signature(before) !== signature(after)) {
      past = [...past, { label, before, after }].slice(-HISTORY_LIMIT)
      future = []
    }
    publish()
  },
  cancel() {
    if (!transaction) return
    const before = transaction.before
    transaction = null
    adapter.restore(before); publish()
  },
  run<T>(label: string, action: () => T): T {
    finishObjectGesture()
    history.begin(label)
    try { const result = action(); history.commit(); return result }
    catch (error) { history.cancel(); throw error }
  },
  undo() {
    if (transaction || objectGestureActive()) return false
    const entry = past.at(-1)
    if (!entry) return false
    past = past.slice(0, -1); future = [...future, entry]
    adapter.restore(entry.before); publish(); return true
  },
  redo() {
    if (transaction || objectGestureActive()) return false
    const entry = future.at(-1)
    if (!entry) return false
    future = future.slice(0, -1); past = [...past, entry]
    adapter.restore(entry.after); publish(); return true
  },
  invalidateAssets(ids: Set<string>) {
    if (![...ids].some(historyReferences)) return false
    past = []; future = []; publish(); return true
  },
  markClean() {
    if (transaction || objectGestureActive()) throw new Error('Finish the current edit before marking it saved.')
    clean = signature(adapter.read()); publish()
  },
  // Call after new/open/recovery hydration. Also provides explicit clear + clean baseline.
  reset() {
    if (transaction || objectGestureActive()) throw new Error('Finish the current edit before resetting history.')
    past = []; future = []; adapter.changed?.(true); clean = signature(adapter.read()); publish()
  },
}

export function historyReferences(id: string) {
  return [...past, ...future].some((e) => [e.before, e.after].some((s) => s.map.background?.id === id || texturePaintAssetIds(s.map.texturePaint).includes(id) || s.objects.some((o) => objectAssetIds(o).includes(id))))
}
