import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { MapEffectSettings, StampEffectSettings } from './EffectSettings'
import { useProjectStore as store } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { defaultMapStyle } from '../domain/mapSettings'
import type { StampObject } from '../domain/models'
afterEach(cleanup)
const stamp: StampObject = { kind: 'stamp', id: 's', assetId: 'a', x: 10, y: 20, width: 80, height: 80, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
function setup() {
  store.setState({ map: { width: 800, height: 600, ...defaultMapStyle(), background: null }, objects: [stamp], layers: [{ id: 'layer', name: 'Layer', visible: true, locked: false, objectIds: ['s'] }], objectGroups: [], layerTree: null })
  editor.setState({ selectedObjectIds: ['s'], activeLayerId: 'layer', soloLayerId: null }); history.reset()
}
it('shows compact optional map controls and applies several settings in one undo step', () => {
  setup(); function View() { return <MapEffectSettings map={store(s => s.map)}/> } render(<View/>); fireEvent.click(screen.getByText('Effects & map frame'))
  expect(screen.queryByLabelText('Fog opacity')).toBeNull(); expect(screen.queryByLabelText('Frame opacity')).toBeNull()
  fireEvent.change(screen.getByLabelText('Fog preset'), { target: { value: 'fog.coldMist' } }); fireEvent.change(screen.getByLabelText('Fog opacity'), { target: { value: '.2' } })
  fireEvent.change(screen.getByLabelText('Frame preset'), { target: { value: 'border.elven' } }); fireEvent.change(screen.getByLabelText('Frame inset (px)'), { target: { value: '30' } })
  expect(store.getState().map.effects).toBeUndefined(); fireEvent.click(screen.getByText('Apply map effects'))
  expect(store.getState().map.effects).toMatchObject({ fog: { enabled: true, opacity: .2 }, frame: { enabled: true, preset: 'border.elven', inset: 30 } }); expect(useHistoryStore.getState().undoCount).toBe(1)
  act(() => { history.undo() }); expect(store.getState().map.effects).toBeUndefined(); act(() => { history.redo() }); expect(screen.getByLabelText('Fog opacity')).toHaveValue(.2)
  fireEvent.click(screen.getByLabelText('Show map frame')); fireEvent.click(screen.getByText('Apply map effects')); expect(store.getState().map.effects?.frame.enabled).toBe(false)
})
it('changes selective stamp shadow/glow with undo and keeps source geometry unchanged', () => {
  setup(); function View() { const o = store(s => s.objects[0]); return o.kind === 'stamp' ? <StampEffectSettings object={o}/> : null } render(<View/>); fireEvent.click(screen.getByText('Stamp shadow & glow'))
  expect(screen.queryByLabelText('Shadow blur (px)')).toBeNull(); fireEvent.click(screen.getByLabelText('Stamp shadow')); fireEvent.click(screen.getByLabelText('Stamp glow'))
  fireEvent.change(screen.getByLabelText('Shadow X (px)'), { target: { value: '-8' } }); fireEvent.change(screen.getByLabelText('Glow radius (px)'), { target: { value: '18' } }); fireEvent.click(screen.getByText('Apply stamp effects'))
  expect(store.getState().objects[0]).toMatchObject({ ...stamp, effects: { shadow: { enabled: true, x: -8 }, glow: { enabled: true, radius: 18 } } }); expect(useHistoryStore.getState().undoCount).toBe(1)
  act(() => { history.undo() }); expect(store.getState().objects[0]).toEqual(stamp)
})
it('disables effect editing during an active object history gesture', () => {
  setup(); render(<MapEffectSettings map={store.getState().map}/>); act(() => { history.begin('Edit nodes') }); expect(screen.getByLabelText('Fog preset')).toBeDisabled(); expect(screen.getByText('Apply map effects')).toBeDisabled(); act(() => { history.cancel() })
})

it('applies global contact shadow and a per-stamp exclusion through existing Apply history',()=>{
 setup();function View(){const map=store(s=>s.map),o=store(s=>s.objects[0]);return <><MapEffectSettings map={map}/>{o.kind==='stamp'&&<StampEffectSettings object={o}/>}</>};render(<View/>)
 fireEvent.change(screen.getByLabelText('Stamp Soft Shadow'),{target:{value:'on'}})
 fireEvent.change(screen.getByLabelText('Soft shadow intensity'),{target:{value:'30'}})
 fireEvent.click(screen.getByText('Apply map effects'))
 expect(store.getState().map.effects?.stampSoftShadow).toEqual({enabled:true,intensity:.3})
 fireEvent.change(screen.getByLabelText('Stamp Soft Shadow override'),{target:{value:'off'}});fireEvent.click(screen.getByText('Apply stamp effects'))
 expect(store.getState().objects[0]).toMatchObject({effects:{softShadow:'off'}})
 expect(useHistoryStore.getState().undoCount).toBe(2)
 act(()=>{history.undo()});expect(store.getState().objects[0]).toEqual(stamp)
 act(()=>{history.undo()});expect(store.getState().map.effects).toBeUndefined()
})
