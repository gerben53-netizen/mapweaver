import { parseProject } from './format'
// @vitest-environment node
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeEach, expect, it, vi } from 'vitest'
import { fixture, validateFixture } from './fixtures.test-support'
import { applyPrepared, currentSnapshot, newProject, useProjectSession } from './session'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { beginObjectEdit } from '../store/objectEdits'
import { startRecovery } from './recovery'
import { LibraryDatabase } from '../storage/database'
import { RecoveryRepository } from './recoveryRepository'
import { decodeProject, encodeProject } from './archive'
import { PROJECT_LIMITS as L } from './limits'
beforeEach(() => { history.cancel(); newProject('Fresh', 600, 400, '#ffffff', () => true) })
it('replacement confirms unsaved changes, resets editing/history and retains the cross-project clipboard', async () => {
  project.getState().addLayer(); const before = currentSnapshot(), prepared = await fixture()
  const cancel = vi.fn(() => false)
  expect(applyPrepared(prepared, cancel)).toBe(false); expect(currentSnapshot()).toEqual(before)
  editor.setState({ selectedObjectIds: ['stale'], clipboard: [...prepared.document.objects], activeTool: 'patternFill', patternAsset: { id: 'stale', name: 'Stale' } })
  expect(applyPrepared(prepared, () => true)).toBe(true)
  expect(editor.getState()).toMatchObject({ selectedObjectIds: [], clipboard: prepared.document.objects, editingGroupId: null, soloLayerId: null, activeTool: 'select', patternAsset: null, activeLayerId: 'objects' })
  expect(useHistoryStore.getState()).toMatchObject({ dirty: false, undoCount: 0, redoCount: 0 })
  const parsed = parseProject(prepared.document)
  expect(currentSnapshot()).toEqual({ map: parsed.map, objects: parsed.objects, layers: parsed.layers, objectGroups: parsed.objectGroups, layerTree: parsed.layerTree })
})
it('debounces completed changes once, ignores pointer previews/cancellation and tolerates storage failure', async () => {
  const prepared = await fixture(); applyPrepared(prepared, () => true)
  vi.useFakeTimers()
  const write = vi.fn(async () => {}), gather = vi.fn(async () => prepared), stop = startRecovery(write, gather)
  try {
    const object = project.getState().objects[0], edit = beginObjectEdit(object.id)!
    for (let x = 1; x <= 20; x++) edit.preview({ ...object, x })
    await vi.advanceTimersByTimeAsync(L.debounce * 2); expect(write).not.toHaveBeenCalled()
    edit.finish(); project.getState().changeLayer('objects', { name: 'Floor' })
    await vi.advanceTimersByTimeAsync(L.debounce); expect(write).toHaveBeenCalledTimes(1)
    const cancelled = beginObjectEdit(object.id)!; cancelled.preview({ ...object, x: 900 }); cancelled.cancel()
    await vi.advanceTimersByTimeAsync(L.debounce); expect(write).toHaveBeenCalledTimes(1)
    write.mockRejectedValueOnce(new Error('quota')); project.getState().changeLayer('objects', { name: 'Floor 2' })
    await vi.advanceTimersByTimeAsync(L.debounce); expect(useProjectSession.getState().warning).toContain('could not be saved')
    expect(project.getState().layers[0].name).toBe('Floor 2')
  } finally { stop(); vi.useRealTimers() }
})
it('schema v2 preserves v1 library data and recovery stays inert until explicit resume; removal is isolated', async () => {
  const name = `test-recovery-${crypto.randomUUID()}`, old = new Dexie(name)
  old.version(1).stores({ assets: 'id, &contentHash, categoryId, name, createdAt', blobs: 'id', categories: 'id, &normalizedName' })
  await old.table('categories').put({ id: 'kept', name: 'Kept', normalizedName: 'kept', createdAt: '' }); old.close()
  const db = new LibraryDatabase(name), repo = new RecoveryRepository(db)
  try {
    const prepared = await fixture(); await repo.save(prepared, null)
    const before = currentSnapshot(), rows = await repo.list(), copy = await repo.read(rows[0].id)
    expect(currentSnapshot()).toEqual(before)
    const checked = await decodeProject(await encodeProject(copy), validateFixture)
    expect(applyPrepared(checked, () => true, true)).toBe(true); expect(useProjectSession.getState().recoveryDirty).toBe(true)
    await repo.remove(rows[0].id); expect(await repo.list()).toEqual([]); expect(await db.projectAssets.count()).toBe(0)
    expect(await db.categories.get('kept')).toMatchObject({ name: 'Kept' })
  } finally { await db.delete() }
})
it('MW-AUD-009 never reports a newer pending edit as saved when an older write completes', async () => {
  vi.useFakeTimers()
  const prepared = await fixture()
  let finish!: () => void
  const write = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
  const stop = startRecovery(write, async () => prepared)
  try {
    project.getState().addLayer()
    expect(useProjectSession.getState().autosave).toBe('saving')
    await vi.advanceTimersByTimeAsync(L.debounce)
    project.getState().addLayer()
    finish(); await Promise.resolve(); await Promise.resolve()
    expect(useProjectSession.getState().autosave).toBe('saving')
    await vi.advanceTimersByTimeAsync(L.debounce)
    finish(); await vi.advanceTimersByTimeAsync(0)
    expect(useProjectSession.getState().autosave).toBe('saved')
    project.getState().addLayer()
    expect(useProjectSession.getState().autosave).toBe('saving')
  } finally { stop(); vi.useRealTimers() }
})
