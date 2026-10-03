import { useState } from 'react'
import { scatterRotationMode } from '../domain/scatter'
import type { ScatterSettings, ScatterRotationMode } from '../domain/scatter'
import styles from './Scatter.module.css'

const help = {
  none: "No rotation — preserve each asset's original orientation.",
  random: 'Randomize stamp orientation.',
  range: 'Apply a random rotation offset within a specified range.',
}

/** Draft strings permit signed input; only valid, complete ranges leave this control. */
function RotationRange({ value, onChange }: { value: ScatterSettings; onChange: (s: ScatterSettings) => void }) {
  const [min, setMin] = useState(String(value.rotationMin))
  const [max, setMax] = useState(String(value.rotationMax))
  const valid = min.trim() !== '' && max.trim() !== '' && Number.isFinite(Number(min)) && Number.isFinite(Number(max)) && Number(min) >= -360 && Number(max) <= 360 && Number(min) <= Number(max)
  const commit = () => {
    if (valid && (Number(min) !== value.rotationMin || Number(max) !== value.rotationMax)) onChange({ ...value, rotationMode: 'range', rotationMin: Number(min), rotationMax: Number(max) })
  }
  return <span className={styles.rotationRange} title={valid ? 'Rotation offset in degrees; Enter or leave the field to apply.' : 'Enter numbers from −360 to 360, with Min ≤ Max.'}>
    <label>Min<input aria-label="Minimum rotation offset" aria-invalid={!valid} type="number" min={-360} max={360} step={1} value={min} onChange={e => setMin(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}/></label>
    <label>Max<input aria-label="Maximum rotation offset" aria-invalid={!valid} type="number" min={-360} max={360} step={1} value={max} onChange={e => setMax(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}/></label>
    {!valid && <span role="alert">Min ≤ Max (±360°)</span>}
  </span>
}

export function ScatterRotation({ value, onChange, disabled = false }: { value: ScatterSettings; onChange: (s: ScatterSettings) => void; disabled?: boolean }) {
  const mode = scatterRotationMode(value)
  return <fieldset className={styles.rotation} disabled={disabled}>
    <label title={help[mode]}>Rotation<select aria-label="Scatter rotation" value={mode} onChange={e => {
      const rotationMode = e.target.value as ScatterRotationMode
      onChange({ ...value, rotationMode, ...(rotationMode === 'range' && value.rotationMin === 0 && value.rotationMax === 360 ? { rotationMin: -15, rotationMax: 15 } : {}) })
    }}><option value="none">None</option><option value="random">Random</option><option value="range">Range</option></select></label>
    {mode === 'range' && <RotationRange key={`${value.rotationMin}:${value.rotationMax}`} value={value} onChange={onChange}/>}
  </fieldset>
}
