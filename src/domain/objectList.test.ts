import { expect, it } from 'vitest'
import { createObjectListSelector, filterObjectRows, objectListWindow, objectRowContexts } from './objectList'
import { createLayeredContent } from './layers'
import type { StampObject } from './models'
const objects: StampObject[] = Array.from({ length: 1000 }, (_, index) => ({ id: `o${index}`, kind: 'stamp', assetId: 'tree', x: index, y: 0, width: 20, height: 40, rotation: 0, opacity: 1, scaleX: 1, scaleY: 1 }))
it('reuses list metadata across position previews and invalidates order/lock changes', () => {
  const state = createLayeredContent(objects), select = createObjectListSelector()
  const rows = select(state)
  expect(rows[0].id).toBe('o999')
  expect(select({ ...state, objects: objects.map(object => ({ ...object, x: object.x + 10 })) })).toBe(rows)
  expect(select({ ...state, objects: objects.map(object => ({ ...object, locked: true })) })).not.toBe(rows)
  expect(select({ ...state, layers: [{ ...state.layers[0], objectIds: [...state.layers[0].objectIds].reverse() }] })[0].id).toBe('o0')
})
it('filters names/types and visible or active layers independently', () => {
  const state = createLayeredContent(objects.slice(0, 2))
  state.layers = [{ ...state.layers[0], objectIds: ['o0'] }, { ...state.layers[0], id: 'hidden', visible: false, objectIds: ['o1'] }]
  const rows = createObjectListSelector()(state), names = new Map([['tree', 'Pine tree']])
  expect(filterObjectRows(rows, { scope: 'visible', activeLayerId: 'hidden', type: 'stamp', query: ' PINE ' }, names).map(row => row.id)).toEqual(['o0'])
  expect(filterObjectRows(rows, { scope: 'active', activeLayerId: 'hidden', type: 'all', query: '' }, names).map(row => row.id)).toEqual(['o1'])
  expect(filterObjectRows(rows, { scope: 'visible', activeLayerId: 'objects', type: 'area', query: '' }, names)).toEqual([])
})
it('bounds DOM rows at either end of a thousand-object list', () => {
  expect(objectListWindow(1000, 0, 260)).toEqual({ start: 0, end: 9 })
  const end = objectListWindow(1000, 100000, 260)
  expect(end.end).toBe(1000); expect(end.end - end.start).toBeLessThanOrEqual(13)
  expect(objectListWindow(0, 10000, 260)).toEqual({ start: 0, end: 0 })
})

it('distinguishes duplicate names even when layers share a display name',()=>{
 const state=createLayeredContent(objects.slice(0,2));state.layers=[{...state.layers[0],objectIds:['o0']},{...state.layers[0],id:'second',objectIds:['o1']}]
 const rows=createObjectListSelector()(state),contexts=objectRowContexts(rows,new Map([['tree','Pine tree']]))
 expect(contexts.get('o0')).not.toBe(contexts.get('o1'));expect([...contexts.values()].every(value=>value.startsWith('Stamp · Objects · Item '))).toBe(true)
})
