import { useEffect, useRef, useState } from 'react'
import { findPremiumTerrain, PREMIUM_TERRAIN, premiumTerrain, TERRAIN_FAMILIES } from '../domain/premiumTerrain'
import { TERRAIN_STYLES, type TerrainStyleId } from '../domain/terrainStyles'
import type { TerrainBrush } from '../domain/terrainBrush'
import { premiumTextureImage } from '../canvas/premiumTerrainTextures'
import { usePremiumTextures } from '../canvas/usePremiumTextures'
import styles from './TerrainBrushTools.module.css'

export function PremiumTerrainLibrary({ brush, update }: { brush: TerrainBrush; update: (patch: Partial<TerrainBrush>) => void }) {
  const [search, setSearch] = useState(''), [family, setFamily] = useState('')
  const selected = premiumTerrain(brush.textureId), resources = usePremiumTextures(selected ? [selected.id] : [])
  const preview = useRef<HTMLCanvasElement>(null)
  const choose = (id: string) => {
    const material = premiumTerrain(id)
    update(material ? {textureId:material.id,style:material.style} : {textureId:undefined,style:id.slice(8) as TerrainStyleId})
  }
  useEffect(() => {
    const canvas = preview.current, image = selected && premiumTextureImage(selected.id)
    if (!canvas || !image || !resources.ready) return
    const c = canvas.getContext('2d')!
    c.clearRect(0,0,canvas.width,canvas.height)
    const pattern = c.createPattern(image, 'repeat')!
    pattern.setTransform(new DOMMatrix().scale(brush.textureScale))
    c.fillStyle = pattern; c.fillRect(0,0,canvas.width,canvas.height)
  }, [selected, resources.ready, brush.textureScale])
  return <>
    <label>Material<select aria-label="Material" disabled={brush.mode !== 'paint'} value={selected?.id || `classic:${brush.style}`} onChange={e => choose(e.target.value)}>
      <optgroup label="Procedural materials">{Object.entries(TERRAIN_STYLES).map(([id,s])=><option key={id} value={`classic:${id}`}>{s.name} · Procedural</option>)}</optgroup>
      {TERRAIN_FAMILIES.map(f => <optgroup key={f} label={f}>{PREMIUM_TERRAIN.filter(t => t.family === f).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</optgroup>)}
    </select></label>
    {selected && <div className={styles.swatch}>
      <canvas ref={preview} width={144} height={64} aria-label={`${selected.title} at current texture scale`} />
      <span>{selected.family}<small>Painterly Fantasy · visual material</small></span>
      {!resources.ready && <span role="status">{resources.error || 'Loading texture…'}</span>}
      {resources.error && <button onClick={resources.retry}>Retry texture</button>}
    </div>}
    <details className={styles.library}>
      <summary>Browse materials</summary>
      <div className={styles.materialPanel}>
        <strong>Painterly Terrain · {PREMIUM_TERRAIN.length} materials</strong>
        <p>Choose what to paint. Brush size, softness, strength and scale stay unchanged. Biome data stays unchanged.</p>
        <div className={styles.filters}>
          <label>Search materials<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <label>Terrain family<select value={family} onChange={e => setFamily(e.target.value)}><option value="">All families</option>{TERRAIN_FAMILIES.map(f => <option key={f}>{f}</option>)}</select></label>
        </div>
        <div className={styles.materialGrid}>{findPremiumTerrain(search,family).map(t => <button key={t.id} disabled={brush.mode !== 'paint'} aria-pressed={selected?.id === t.id} onClick={() => choose(t.id)} title={t.notes}>
          <img src={t.file} alt="" loading="lazy" /><span>{t.title}</span><small>{t.family}</small>
        </button>)}</div>
        {!findPremiumTerrain(search,family).length && <p>No matching terrain materials.</p>}
        <small>Raw artwork thumbnails; the selected swatch uses the same repeat-safe sampling as the canvas. Strength controls coverage over your map.</small>
      </div>
    </details>
  </>
}
