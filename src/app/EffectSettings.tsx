import { effectiveRendering, type ArlMode } from '../domain/rendering'
import { useState } from 'react'
import { defaultMapEffects, defaultStampEffects, FOG_PRESETS, VIGNETTE_PRESETS, FRAME_PRESETS, framePreset, STAMP_EFFECT_PRESETS } from '../domain/mapEffects'
import type { MapDocument, StampObject } from '../domain/models'
import { useProjectStore } from '../store/projectStore'
import { useHistoryStore } from '../store/history'
import { setStampEffects } from '../store/effectActions'
import styles from './EffectSettings.module.css'

function NumberField({ label, value, change, min = 0, max = 1 }: { label: string; value: number; change: (v: number) => void; min?: number; max?: number }) {
  return <label>{label}<input type="number" required min={min} max={max} step="any" value={Number.isNaN(value) ? '' : value} onChange={e => change(e.target.value === '' ? NaN : Number(e.target.value))}/></label>
}
function ColorField({ label, value, change }: { label: string; value: string; change: (v: string) => void }) { return <label>{label}<input type="color" value={value} onChange={e => change(e.target.value)}/></label> }
function Check({ label, value, change }: { label: string; value: boolean; change: (v: boolean) => void }) { return <label className={styles.check}><input type="checkbox" checked={value} onChange={e => change(e.target.checked)}/>{label}</label> }

export function MapEffectSettings({ map }: { map: MapDocument }) {
  return <details className={styles.panel}><summary>Effects &amp; map frame</summary><MapEffectsForm key={JSON.stringify([map.effects,map.rendering,map.mapType])} map={map}/></details>
}
function MapEffectsForm({ map }: { map: MapDocument }) {
  const [draft, set] = useState(() => structuredClone(map.effects || defaultMapEffects())), [error, setError] = useState('')
  const [arl,setArl]=useState<ArlMode|undefined>(map.rendering?.arl)
  const soft=effectiveRendering({...map,effects:draft}).effects.stampSoftShadow
  const objects = useProjectStore(s => s.objects), busy = useHistoryStore(s => s.busy)
  const fog = draft.fog, vignette = draft.vignette, frame = draft.frame
  const f = (patch: Partial<typeof fog>) => set(d => ({ ...d, fog: { ...d.fog, ...patch } }))
  const v = (patch: Partial<typeof vignette>) => set(d => ({ ...d, vignette: { ...d.vignette, ...patch } }))
  const b = (patch: Partial<typeof frame>) => set(d => ({ ...d, frame: { ...d.frame, ...patch } }))
  return <form className={styles.form} onSubmit={e => { e.preventDefault(); try { useProjectStore.getState().applyMapSettings({ ...useProjectStore.getState().map, rendering: arl===undefined?undefined:{arl}, effects: draft }, () => true); setError('') } catch (err) { setError((err as Error).message) } }}>
    <fieldset disabled={busy}><legend>Rendering</legend><label>ARL<select aria-label="Map ARL override" value={arl??'default'} onChange={e=>setArl(e.target.value==='default'?undefined:e.target.value as ArlMode)}><option value="default">{map.mapType==='regional-map'||map.mapType==='world-map'?'ARL uit':'ARL C'} (standaard)</option><option value="OFF">ARL uit (aangepast)</option><option value="B">ARL B (aangepast)</option><option value="C">ARL C (aangepast)</option></select></label><p>Opgeslagen kaartprofiel voor Voorbeeld, PNG en Campfire. Bewerken blijft snel.</p></fieldset>
    <fieldset disabled={busy}><legend>Stamp Soft Shadow</legend>
      <label>Stamp Soft Shadow<select aria-label="Stamp Soft Shadow" value={draft.stampSoftShadow===undefined?'default':soft.enabled?'on':'off'} onChange={e=>set(d=>({...d,stampSoftShadow:e.target.value==='default'?undefined:{...soft,enabled:e.target.value==='on'}}))}><option value="default">{effectiveRendering({...map,effects:undefined}).effects.stampSoftShadow.enabled?'Aan':'Uit'} (standaard)</option><option value="off">Uit (aangepast)</option><option value="on">Aan (aangepast)</option></select></label>
      <label>Intensity (%)<input aria-label="Soft shadow intensity" type="number" min={0} max={100} required value={Number.isNaN(soft.intensity)?'':soft.intensity*100} onChange={e=>set(d=>({...d,stampSoftShadow:{...soft,intensity:e.target.value===''?NaN:Number(e.target.value)/100}}))}/></label>
    </fieldset>
    <fieldset disabled={busy}><legend>Fog / mist</legend>
      <label>Fog preset<select aria-label="Fog preset" value={fog.enabled ? fog.preset : ''} onChange={e => e.target.value ? f(FOG_PRESETS[e.target.value].style) : f({ enabled: false })}><option value="">None</option>{Object.entries(FOG_PRESETS).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select></label>
      {fog.enabled && <><label>Fog scope<select aria-label="Fog scope" value={fog.areaId || ''} onChange={e => f({ areaId: e.target.value || null })}><option value="">Whole map</option>{fog.areaId && !objects.some(o => o.id === fog.areaId) && <option value={fog.areaId}>Missing Area — fog hidden</option>}{objects.filter(o => o.kind === 'area').map(o => <option value={o.id} key={o.id}>{o.name || 'Area'}</option>)}</select></label>
        <NumberField label="Fog opacity" value={fog.opacity} change={opacity => f({ opacity })}/><details><summary>Mist detail</summary>
          <NumberField label="Fog density" value={fog.density} change={density => f({ density })}/><NumberField label="Fog softness" value={fog.softness} change={softness => f({ softness })}/><NumberField label="Fog scale" min={.05} value={fog.scale} change={scale => f({ scale })}/><ColorField label="Fog tint" value={fog.color} change={color => f({ color })}/>
        </details><p>Above artwork, below labels and map elements. Hidden or missing Area masks hide the mist.</p></>}
    </fieldset>
    <fieldset disabled={busy}><legend>Vignette</legend><label>Vignette preset<select aria-label="Vignette preset" value={vignette.enabled ? vignette.preset : ''} onChange={e => e.target.value ? v(VIGNETTE_PRESETS[e.target.value].style) : v({ enabled: false })}><option value="">None</option>{Object.entries(VIGNETTE_PRESETS).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select></label>
      {vignette.enabled && <><NumberField label="Vignette amount" value={vignette.amount} change={amount => v({ amount })}/><details><summary>Vignette detail</summary><NumberField label="Vignette radius" value={vignette.radius} change={radius => v({ radius })}/><NumberField label="Vignette softness" value={vignette.softness} change={softness => v({ softness })}/><ColorField label="Vignette color" value={vignette.color} change={color => v({ color })}/></details></>}
    </fieldset>
    <fieldset disabled={busy}><legend>Map frame</legend><label>Frame preset<select aria-label="Frame preset" value={frame.preset} onChange={e => b(framePreset(e.target.value as keyof typeof FRAME_PRESETS))}>{Object.entries(FRAME_PRESETS).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select></label><Check label="Show map frame" value={frame.enabled} change={enabled => b({ enabled })}/>
      {frame.enabled && <><NumberField label="Frame inset (px)" max={256} value={frame.inset} change={inset => b({ inset })}/><NumberField label="Frame thickness (px)" min={.5} max={12} value={frame.thickness} change={thickness => b({ thickness })}/><NumberField label="Frame opacity" value={frame.opacity} change={opacity => b({ opacity })}/><ColorField label="Frame tint" value={frame.color} change={color => b({ color })}/></>}
      <p>Fixed to the map bounds. Edit here; the frame cannot be dragged or selected while painting.</p>
    </fieldset>
    <button disabled={busy} type="submit">Apply map effects</button>{error && <p role="alert">{error}</p>}<p>Apply records one undo step. Rendering-overrides worden bewaard; overige effecten veranderen pas na Apply.</p>
  </form>
}
export function StampEffectSettings({ object }: { object: StampObject }) { return <details className={styles.panel}><summary>Stamp shadow &amp; glow</summary><StampEffectsForm key={object.id + JSON.stringify(object.effects)} object={object}/></details> }
function StampEffectsForm({ object }: { object: StampObject }) {
  const [draft, set] = useState(() => structuredClone(object.effects || defaultStampEffects())), [error, setError] = useState(''), busy = useHistoryStore(s => s.busy)
  const map=useProjectStore(s=>s.map), effective=effectiveRendering(map).effects.stampSoftShadow
  const s = draft.shadow, g = draft.glow, shadow = (patch: Partial<typeof s>) => set(d => ({ ...d, shadow: { ...d.shadow, ...patch } })), glow = (patch: Partial<typeof g>) => set(d => ({ ...d, glow: { ...d.glow, ...patch } }))
  return <form className={styles.form} onSubmit={e => { e.preventDefault(); try { setStampEffects(object.id, draft); setError('') } catch (err) { setError((err as Error).message) } }}><fieldset disabled={busy}><legend>Stamp effects</legend>
    <label>Soft Shadow<select aria-label="Stamp Soft Shadow override" value={draft.softShadow??'default'} onChange={e=>set(d=>({...d,softShadow:e.target.value as 'default'|'on'|'off'}))}><option value="default">{effective.enabled?'Soft Shadow aan':'Soft Shadow uit'} (standaard)</option><option value="on">Aan (aangepast)</option><option value="off">Uit (aangepast)</option></select></label>
    <Check label="Stamp shadow" value={s.enabled} change={enabled => shadow({ enabled })}/>{s.enabled && <><button type="button" onClick={() => shadow(STAMP_EFFECT_PRESETS.shadow.style)}>Soft terrain shadow</button><NumberField label="Shadow opacity" value={s.opacity} change={opacity => shadow({ opacity })}/><NumberField label="Shadow blur (px)" max={64} value={s.blur} change={blur => shadow({ blur })}/><div className={styles.pair}><NumberField label="Shadow X (px)" min={-128} max={128} value={s.x} change={x => shadow({ x })}/><NumberField label="Shadow Y (px)" min={-128} max={128} value={s.y} change={y => shadow({ y })}/></div><ColorField label="Shadow color" value={s.color} change={color => shadow({ color })}/></>}
    <Check label="Stamp glow" value={g.enabled} change={enabled => glow({ enabled })}/>{g.enabled && <><button type="button" onClick={() => glow(STAMP_EFFECT_PRESETS.glow.style)}>Arcane glow</button><NumberField label="Glow radius (px)" max={64} value={g.radius} change={radius => glow({ radius })}/><NumberField label="Glow opacity" value={g.opacity} change={opacity => glow({ opacity })}/><NumberField label="Glow softness" value={g.softness} change={softness => glow({ softness })}/><ColorField label="Glow color" value={g.color} change={color => glow({ color })}/></>}
    <button type="submit">Apply stamp effects</button>{error && <p role="alert">{error}</p>}<p>Effects follow the stamp rotation and mirroring; sizes are map pixels. Source artwork stays unchanged.</p>
  </fieldset></form>
}
