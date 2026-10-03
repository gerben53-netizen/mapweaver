import { useState } from 'react'
import { WORLD_MAP_THEMES, worldTheme } from '../domain/worldThemes'
import { ThemeCards } from './ThemeCards'
import { applyTheme } from '../projects/applyTheme'
import { DEFAULT_THEME_OPTIONS } from '../domain/applyWorldTheme'
import { useProjectStore } from '../store/projectStore'
import { Modal } from './Modal'
import styles from './WorldThemePicker.module.css'

export function WorldThemePicker() {
  const map = useProjectStore(s => s.map), active = worldTheme(map.theme?.id)
  const [open, setOpen] = useState(false), [selected, select] = useState(''), [options, setOptions] = useState(DEFAULT_THEME_OPTIONS)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const themes = Object.values(WORLD_MAP_THEMES).filter(t => t.mapTypes.includes(map.mapType ?? 'battlemap'))
  if (!themes.length) return null
  async function apply() {
    setBusy(true); setError('')
    try {
      const result = await applyTheme(selected, options)
      setNotice(`${worldTheme(selected)!.name} applied. ${result.overridden} overridden fields preserved; ${result.remapped} stamp images replaced. ${result.warnings.join(' ')}`)
      setOpen(false)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <section className={styles.panel} aria-label="Visual theme"><h2>Visual theme</h2><p>{active?.name ?? 'Custom'}</p>
    <button onClick={() => { select(active?.id ?? themes[0].id); setError(''); setOptions(DEFAULT_THEME_OPTIONS); setOpen(true) }}>Choose visual theme</button>
    {notice && <p role="status">{notice}</p>}
    {open && <Modal title="Visual theme" wide busy={busy} onClose={() => setOpen(false)}>
      <p>Style the existing geography. Preview cards are representative samples. Apply is one undoable change.</p>
      <ThemeCards themes={themes} selected={selected} onSelect={select} disabled={busy}/>
      <fieldset disabled={busy} className={styles.options}><legend>Apply options</legend>
        <label><input type="radio" name="theme-mode" checked={!options.reset} onChange={() => setOptions({ ...options, reset: false })}/>Preserve manual overrides</label>
        <label><input type="radio" name="theme-mode" checked={options.reset} onChange={() => setOptions({ ...options, reset: true })}/>Reset visual properties to theme defaults</label>
        <label><input type="checkbox" checked={options.elements} onChange={e => setOptions({ ...options, elements: e.target.checked })}/>Apply theme to existing labels and map elements</label>
        <label><input type="checkbox" checked={options.assets} onChange={e => setOptions({ ...options, assets: e.target.checked })}/>Replace semantic stamps with compatible library assets</label>
      </fieldset>
      <p>First application sets terrain, water, river paint and effects. Later switches preserve changed fields. Text and geometry stay intact. Hidden/locked objects, imported patterns and textured rivers are preserved. Missing asset families keep their current images.</p>
      <p>Existing theme-managed elements follow the theme; the checkbox also adopts other labels and elements. Reset affects style only.</p>
      {error && <p role="alert">{error}</p>}<div className={styles.actions}><button className="primary" disabled={busy || !selected} onClick={() => void apply()}>{busy ? 'Applying…' : 'Apply theme'}</button><button disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div>
    </Modal>}
  </section>
}
