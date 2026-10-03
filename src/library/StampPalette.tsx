import { useEffect, useState } from 'react'
import { useCampaignStore } from '../campaigns/session'
import { useEditorStore } from '../store/editorStore'
import { libraryRepository } from '../storage/libraryRepository'
import { useLibraryHistory } from './libraryHistory'
import { paletteMove } from '../domain/stampPalettes'
import type { StampAsset } from '../domain/models'
import { AssetThumbnail } from './AssetThumbnail'
import { activateStamp, beginStampDrag, endStampDrag, openStampLibrary, useStampDrag } from './stampPlacement'
import { addToStampPalette, changeStampPalettes, collapseStampPalette, loadStampPalettes, useStampPaletteStore } from './stampPaletteStore'
import styles from './StampPalette.module.css'
export function StampPalette() {
  const campaignId = useCampaignStore(s => s.snapshot?.campaign.id || '')
  const s = useStampPaletteStore(), libraryRevision = useLibraryHistory(s => s.changed)
  const active = useEditorStore(s => s.activeTool === 'placeStamp' ? s.stampAsset?.id : null)
  const palette = s.value.palettes.find(p => p.id === s.value.activeId)!
  const [assets, setAssets] = useState<Record<string, StampAsset | null>>({})
  const [selected, setSelected] = useState('')
  const ids = JSON.stringify(palette.assetIds)
  useEffect(() => { void loadStampPalettes(campaignId) }, [campaignId])
  useEffect(() => {
    let live = true
    const assetIds: string[] = JSON.parse(ids)
    void Promise.all(assetIds.map(async id => {
      try { const asset = await libraryRepository.getAsset(id); return [id, asset?.kind === 'stamp' ? asset : null] as const }
      catch { return [id, null] as const }
    })).then(entries => { if (live) setAssets(Object.fromEntries(entries)) })
    return () => { live = false }
  }, [ids, libraryRevision, campaignId])
  const change = (fn: Parameters<typeof changeStampPalettes>[0]) => void changeStampPalettes(fn)
  const disabled = !s.ready || s.busy
  const index = palette.assetIds.indexOf(selected)
  return <section data-stamp-ui className={styles.palette} aria-label="Stamp palette" onDragOver={e => { if (!disabled && useStampDrag.getState().id) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }} onDrop={e => {
    const drag = useStampDrag.getState()
    if (!disabled && drag.id) { e.preventDefault(); e.stopPropagation(); void addToStampPalette([drag.id]); endStampDrag() }
  }}>
    <div className={styles.header}>
      <button aria-expanded={!s.collapsed} onClick={() => collapseStampPalette(!s.collapsed)}>{s.collapsed ? '▸' : '▾'} Stamp palette</button>
      {!s.collapsed && <><select aria-label="Active stamp palette" disabled={disabled} value={s.value.activeId} onChange={e => { setSelected(''); change(v => ({ ...v, activeId: e.target.value })) }}>{s.value.palettes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <button disabled={disabled} onClick={() => { const name = window.prompt('New palette name'); if (name?.trim()) change(v => { const id = crypto.randomUUID(); return { ...v, activeId: id, palettes: [...v.palettes, { id, name, assetIds: [] }] } }) }}>New</button>
        <button disabled={disabled} onClick={() => { const name = window.prompt('Rename palette', palette.name); if (name?.trim()) change(v => ({ ...v, palettes: v.palettes.map(p => p.id === v.activeId ? { ...p, name } : p) })) }}>Rename</button>
        <button disabled={disabled || s.value.palettes.length === 1} onClick={() => { if (window.confirm(`Delete palette “${palette.name}”? Source assets remain in the library.`)) change(v => { const palettes = v.palettes.filter(p => p.id !== v.activeId); return { ...v, palettes, activeId: palettes[0].id } }) }}>Delete</button>
        <button onClick={openStampLibrary}>Add from library</button>
      </>}
      {s.busy && <span role="status">Saving…</span>}
    </div>
    {!s.collapsed && <><div className={styles.strip}>
      {palette.assetIds.map((id, position) => {
        const asset = assets[id], name = asset?.name || (id in assets ? `Missing asset ${id.slice(0, 8)}` : 'Loading stamp…')
        return <button key={id} className={styles.entry} title={`${name} — click to place repeatedly; drag to place once`} aria-label={`Place ${name}`} aria-pressed={active === id} data-palette-asset={id} data-selected={selected === id} draggable={!!asset} onFocus={() => setSelected(id)} onClick={() => { setSelected(id); if (asset) void activateStamp(id) }} onDragStart={e => { setSelected(id); beginStampDrag(e, id, 'palette') }} onDragEnd={endStampDrag} onDragOver={e => { if (!disabled && useStampDrag.getState().source === 'palette') { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move' } }} onDrop={e => {
          const drag = useStampDrag.getState()
          if (!disabled && drag.source === 'palette') { e.preventDefault(); e.stopPropagation(); change(v => paletteMove(v, drag.id, position)); endStampDrag() }
        }}>{asset ? <AssetThumbnail id={id}/> : <span aria-hidden="true">?</span>}<span>{name}</span></button>
      })}
      {!palette.assetIds.length && <span className={styles.empty}>{campaignId ? 'Add stamps from the library, then click a thumbnail to keep placing.' : 'Open a campaign map to use stamp palettes.'}</span>}
    </div><div className={styles.actions}>
      <span>Click: repeat · Drag: once · Esc: finish</span>
      <button disabled={disabled || index <= 0} onClick={() => change(v => paletteMove(v, selected, index - 1))}>Move left</button>
      <button disabled={disabled || index < 0 || index >= palette.assetIds.length - 1} onClick={() => change(v => paletteMove(v, selected, index + 1))}>Move right</button>
      <button disabled={disabled || index < 0} onClick={() => { if (window.confirm('Remove this reference from the palette? The source asset remains in the library.')) change(v => ({ ...v, palettes: v.palettes.map(p => p.id === v.activeId ? { ...p, assetIds: p.assetIds.filter(id => id !== selected) } : p) })) }}>Remove from palette</button>
    </div></>}
    {s.error && <div role="alert">{s.error} <button onClick={() => void loadStampPalettes(campaignId)}>Reload palettes</button></div>}
  </section>
}
