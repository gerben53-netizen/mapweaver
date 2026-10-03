import { useState } from 'react'
import type { AreaObject } from '../domain/models'
import type { TerrainType } from '../domain/landAreas'
import { TERRAIN_TYPES } from '../domain/terrainIntent'
import { TERRAIN_STYLES } from '../domain/terrainStyles'
import { useProjectStore } from '../store/projectStore'
import { history } from '../store/history'
import { finishObjectGesture } from '../canvas/interaction'
import styles from './ObjectProperties.module.css'

export function AreaIntentProperties({ object }: { object: AreaObject }) {
  const [error, setError] = useState('')
  const land = object.land
  return <section className={styles.content} aria-label="Semantic terrain">
    {land?.role === 'terrain-region' ? <>
      <strong>Terrain Region · semantic biome</strong>
      <label className={styles.field}>Biome<select aria-label="Region biome" value={land.terrain} onChange={e => {
        finishObjectGesture()
        try {
          history.run('Change biome', () => useProjectStore.getState().updateArea({ ...object, land: { ...land, terrain: e.target.value as TerrainType } }))
          setError('')
        } catch (error) { setError((error as Error).message) }
      }}>{Object.entries(TERRAIN_TYPES).map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}</select></label>
      <small>Visual preset: {land.appearance ? TERRAIN_STYLES[land.appearance.style].name : 'Original fill'}. Biome changes preserve appearance; adjust Terrain appearance below or paint with Terrain Brush.</small>
    </> : <p>{land?.role === 'landmass' ? 'Landmass · physical geography. Use Land / Water to shape coasts, islands and lakes.' : 'Area · generic named or styled zone. No biome classification.'}</p>}
    {error && <p role="alert">{error}</p>}
  </section>
}
