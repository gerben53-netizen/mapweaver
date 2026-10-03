import { defaultLayer } from '../domain/layers'
import { beforeEach, expect, it, vi } from 'vitest'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { beginObjectEdit, editObject } from './objectEdits'
const object = { kind: 'stamp' as const, id: 'a', assetId: 'asset', x: 10, y: 20, width: 100, height: 200, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
beforeEach(() => { useProjectStore.setState({ layers: [{ ...defaultLayer(), objectIds: ['a', 'b'] }], objects: [object, { ...object, id: 'b' }] }); useEditorStore.getState().select(null) })
it('stores only one selected identifier outside the document and supports switching and clearing', () => {
  const objects = useProjectStore.getState().objects
  useEditorStore.getState().select('a'); expect(useEditorStore.getState().selectedObjectIds[0]).toBe('a')
  useEditorStore.getState().select('b'); expect(useEditorStore.getState().selectedObjectIds[0]).toBe('b')
  useEditorStore.getState().select(null); expect(useEditorStore.getState().selectedObjectIds[0]).toBeUndefined()
  expect(useProjectStore.getState().objects).toBe(objects)
  expect(useProjectStore.getState()).not.toHaveProperty('selectedObjectId')
})
it('previews multiple movement frames but completes one mutation boundary', () => {
  const other = useProjectStore.getState().objects[1]
  const commit = vi.spyOn(useProjectStore.getState(), 'commitTransform')
  const edit = beginObjectEdit('a')!
  edit.preview({ ...object, x: 50 }); edit.preview({ ...object, x: 100 })
  expect(commit).not.toHaveBeenCalled()
  edit.finish(); edit.finish()
  expect(commit).toHaveBeenCalledExactlyOnceWith(object, { ...object, x: 100 })
  expect(useProjectStore.getState().objects[1]).toBe(other)
})
it('validates mutation input and normalizes numeric rotation without viewport changes', () => {
  const viewport = useEditorStore.getState().viewport
  editObject('a', { ...object, x: NaN })
  expect(useProjectStore.getState().objects[0]).toEqual(object)
  editObject('a', { ...object, rotation: -30, x: -500 })
  expect(useProjectStore.getState().objects[0]).toMatchObject({ rotation: 330, x: -500 })
  expect(useEditorStore.getState().viewport).toBe(viewport)
})




