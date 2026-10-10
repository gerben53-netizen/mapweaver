import {defaultStampEffects,defaultMapEffects} from '../domain/mapEffects'
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
  expect(screen.queryByLabelText('Shadow blur (px)')).toBeNull(); fireEvent.click(screen.getByLabelText('Custom directional shadow')); fireEvent.click(screen.getByLabelText('Stamp glow'))
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
 fireEvent.change(screen.getByLabelText('Stamp Soft Shadow override'),{target:{value:'off'}})
 expect(store.getState().objects[0]).toMatchObject({effects:{softShadow:'off'}})
 expect(useHistoryStore.getState().undoCount).toBe(2)
 act(()=>{history.undo()});expect(store.getState().objects[0]).toEqual(stamp)
 act(()=>{history.undo()});expect(store.getState().map.effects).toBeUndefined()
})

it('persists ARL and shadow overrides as one undoable map edit and returns to inherited defaults',()=>{
 setup();function View(){return <MapEffectSettings map={store(s=>s.map)}/>};render(<View/>);
 expect(screen.getByLabelText('Map ARL override')).toHaveValue('default');
 expect(screen.getByLabelText('Stamp Soft Shadow')).toHaveValue('default');
 fireEvent.change(screen.getByLabelText('Map ARL override'),{target:{value:'OFF'}});
 fireEvent.change(screen.getByLabelText('Stamp Soft Shadow'),{target:{value:'off'}});
 fireEvent.click(screen.getByText('Apply map effects'));
 expect(store.getState().map.rendering).toEqual({arl:'OFF'});expect(store.getState().map.effects?.stampSoftShadow?.enabled).toBe(false);
 act(()=>{history.undo()});expect(store.getState().map.rendering).toBeUndefined();
 act(()=>{history.redo()});expect(screen.getByLabelText('Map ARL override')).toHaveValue('OFF');
 fireEvent.change(screen.getByLabelText('Map ARL override'),{target:{value:'default'}});
 fireEvent.change(screen.getByLabelText('Stamp Soft Shadow'),{target:{value:'default'}});
 fireEvent.click(screen.getByText('Apply map effects'));
 expect(store.getState().map.rendering).toBeUndefined();expect(store.getState().map.effects?.stampSoftShadow).toBeUndefined();
});


it('renders the battlemap default in the inspector without Apply and commits overrides immediately',()=>{
 setup();function View(){const o=store(s=>s.objects[0]);return o.kind==='stamp'?<StampEffectSettings object={o}/>:null}render(<View/>);
 expect(screen.getByLabelText('Soft Shadow')).toBeChecked();expect(screen.getByLabelText('Custom directional shadow')).not.toBeChecked();
 expect(store.getState().objects[0]).toEqual(stamp);expect(useHistoryStore.getState().undoCount).toBe(0);
 fireEvent.click(screen.getByLabelText('Soft Shadow'));expect(screen.getByLabelText('Soft Shadow')).not.toBeChecked();expect(store.getState().objects[0]).toMatchObject({effects:{softShadow:'off'}});
 act(()=>history.undo());expect(screen.getByLabelText('Soft Shadow')).toBeChecked();act(()=>history.redo());expect(screen.getByLabelText('Soft Shadow')).not.toBeChecked();
 fireEvent.change(screen.getByLabelText('Stamp Soft Shadow override'),{target:{value:'default'}});expect(screen.getByLabelText('Soft Shadow')).toBeChecked();expect(store.getState().objects[0]).toMatchObject({effects:{softShadow:'default'}});
});
it('reflects saved disabled overrides and effective zero intensity',()=>{
 setup();const off={...stamp,effects:{...defaultStampEffects(),softShadow:'off' as const}};store.setState({objects:[off]});function View(){const o=store(s=>s.objects[0]);return o.kind==='stamp'?<StampEffectSettings object={o}/>:null}render(<View/>);
 expect(screen.getByLabelText('Soft Shadow')).not.toBeChecked();expect(screen.getByLabelText('Stamp Soft Shadow override')).toHaveValue('off');
 act(()=>store.setState(s=>({map:{...s.map,effects:{...defaultMapEffects(),stampSoftShadow:{enabled:true,intensity:0}}}})));
 fireEvent.change(screen.getByLabelText('Stamp Soft Shadow override'),{target:{value:'default'}});expect(screen.getByLabelText('Soft Shadow')).not.toBeChecked();expect(screen.getByRole('option',{name:'Soft Shadow uit (standaard)'})).toBeInTheDocument();
});

it('keeps pending custom effects separate from immediate Soft Shadow changes',()=>{
 setup();function View(){const o=store(s=>s.objects[0]);return o.kind==='stamp'?<StampEffectSettings object={o}/>:null}render(<View/>);
 fireEvent.click(screen.getByLabelText('Stamp glow'));fireEvent.change(screen.getByLabelText('Glow radius (px)'),{target:{value:'19'}});
 fireEvent.change(screen.getByLabelText('Stamp Soft Shadow override'),{target:{value:'off'}});expect(screen.getByLabelText('Glow radius (px)')).toHaveValue(19);expect(store.getState().objects[0]).toMatchObject({effects:{softShadow:'off',glow:{enabled:false}}});
 fireEvent.click(screen.getByText('Apply stamp effects'));expect(store.getState().objects[0]).toMatchObject({effects:{softShadow:'off',glow:{enabled:true,radius:19}}});expect(screen.getByLabelText('Soft Shadow')).not.toBeChecked();
});
it('architectural controls apply directly, preserve ARL and survive history/reset', () => {
  setup(); function View() { return <MapEffectSettings map={store(s => s.map)}/> } render(<View/>);fireEvent.click(screen.getByText('Effects & map frame'))
  fireEvent.change(screen.getByLabelText('Contact shadow core'), {target:{value:'6'}})
  expect(store.getState().map.rendering?.contactShadow?.core).toBe(6)
  fireEvent.click(screen.getByLabelText('Contact Shadow ingeschakeld'))
  expect(store.getState().map.rendering?.contactShadow?.enabled).toBe(false)
  act(()=>{history.undo()});expect(store.getState().map.rendering?.contactShadow?.enabled).toBe(true)
  act(()=>{history.redo()});expect(store.getState().map.rendering?.contactShadow?.enabled).toBe(false)
  fireEvent.click(screen.getByText('Herstel standaard'));expect(store.getState().map.rendering?.contactShadow).toBeUndefined()
  expect(screen.getByLabelText('Contact shadow core')).toHaveValue(3)
})
