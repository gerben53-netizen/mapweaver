import { WALL_PRESETS, wallPreset } from '../domain/wallPresets'
import { useEffect, useMemo, useState } from 'react'
import type { AreaFill, MapDocument, TypedAsset } from '../domain/models'
import { mapCapabilities, assetAppliesToMap } from '../domain/mapCapabilities'
import { generateRoom, roomUnits, randomRoomSeed, type RoomRecipe, type RoomShape } from '../domain/roomGenerator'
import { SIMPLE_WALL } from '../domain/walls'
import { materialStyle, type RegisteredWallSet } from '../domain/wallSets'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { projectAssets, adoptLibraryAsset, useAssetContext } from '../projects/assets'
import { libraryRepository } from '../storage/libraryRepository'
import { useLibrary } from '../library/useLibrary'
import { api } from '../storage/api'
import { screenToMap } from '../canvas/viewport'
import { Modal } from './Modal'
import { roomPreview } from './roomPreview'
import styles from './RoomGeneratorWizard.module.css'

export function RoomGeneratorAction() {
  const map = useProjectStore(s => s.map), [open, setOpen] = useState(false)
  if (!mapCapabilities(map.mapType).rooms) return null
  return <><button onClick={() => setOpen(true)}>Generate Room…</button>{open && <RoomGeneratorWizard map={map} onClose={() => setOpen(false)} />}</>
}
export function RoomGeneratorWizard({ map, onClose }: { map: MapDocument; onClose: () => void }) {
  const [initialMap] = useState(map), units = roomUnits(initialMap)
  const [generation] = useState(useAssetContext.getState().generation)
  const [name, setName] = useState(''), [shape, setShape] = useState<RoomShape>('rectangle')
  const [width, setWidth] = useState(String(units.unit === 'ft' ? 40 : units.unit === 'm' ? 12 : 8))
  const [height, setHeight] = useState(String(units.unit === 'ft' ? 30 : units.unit === 'm' ? 9 : 6))
  const [doors, setDoors] = useState(2), [doorType, setDoorType] = useState<RoomRecipe['doorType']>('single')
  const [doorWidth, setDoorWidth] = useState(String(units.unit === 'ft' ? 3 : units.unit === 'm' ? .9144 : .6))
  const [seed, setSeed] = useState(() => String(randomRoomSeed(0)))
  const [floor, setFloor] = useState<{ asset: TypedAsset; library: boolean } | null>(null)
  const [floorScale, setFloorScale] = useState('1'), [color, setColor] = useState('#c7b897')
  const [search, setSearch] = useState(''), [page, setPage] = useState(0)
  const library = useLibrary('fillPattern', search, '', page, 'battlemap')
  const [owned] = useState(() => projectAssets().filter(a => a.kind === 'fillPattern'))
  const [wallChoice, setWallChoice] = useState('timber'), [sets, setSets] = useState<RegisteredWallSet[]>([]), [setsError, setSetsError] = useState('')
  const [thickness, setThickness] = useState(() => String(wallPreset('timber', initialMap).strokeWidth / units.pixels))
  const [currentWall] = useState(() => structuredClone(useEditorStore.getState().wallStyle))
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [preview, setPreview] = useState<{ key: string; url: string; error: string } | null>(null)
  useEffect(() => { let active = true; void api<RegisteredWallSet[]>('/wall-sets').then(value => { if (active) setSets(value) }).catch(e => { if (active) setSetsError(e.message) }); return () => { active = false } }, [])
  const selectedSet = sets.find(s => s.definition.revision === wallChoice)
  const recipe = useMemo<RoomRecipe>(() => {
    const fill: AreaFill = floor ? { kind: 'pattern', assetId: floor.asset.id, mode: 'repeat', scale: Number(floorScale), rotation: 0, offsetX: 0, offsetY: 0 } : { kind: 'solid', color }
    const walls = selectedSet ? materialStyle(selectedSet, { ...SIMPLE_WALL, strokeWidth: selectedSet.definition.defaultThickness }) : wallChoice === 'current' ? structuredClone(currentWall) : wallPreset(wallChoice, initialMap)
    walls.strokeWidth = Number(thickness) * units.pixels
    // Material variation is fixed by the wizard seed, including while rendering the preview.
    if (walls.wall.material) return { name, shape, width: Number(width), height: Number(height), floor: fill, walls: { ...walls, wall: { ...walls.wall, material: { ...walls.wall.material, seed: Number(seed) } } }, doors, doorWidth: Number(doorWidth), doorType, seed: Number(seed) }
    return { name, shape, width: Number(width), height: Number(height), floor: fill, walls, doors, doorWidth: Number(doorWidth), doorType, seed: Number(seed) }
  }, [name, shape, width, height, floor, floorScale, color, selectedSet, wallChoice, currentWall, doors, doorWidth, doorType, seed, thickness, initialMap, units.pixels])
  const sources = useMemo(() => ({ floor: floor?.library ? floor.asset.id : undefined, wall: selectedSet?.assetId }), [floor, selectedSet])
  const key = JSON.stringify([recipe, sources])
  let validation = ''
  try { generateRoom(initialMap, recipe, { x: 0, y: 0 }); if (!seed.trim()) throw Error('Enter a seed.'); if (map !== initialMap) throw Error('Map settings changed. Close and reopen Generate Room.') } catch (e) { validation = (e as Error).message }
  useEffect(() => {
    if (validation) return
    let active = true
    const timer = setTimeout(() => { void roomPreview(initialMap, recipe, sources).then(url => { if (active) setPreview({ key, url, error: '' }) }).catch(e => { if (active) setPreview({ key, url: '', error: e.message }) }) }, 150)
    return () => { active = false; clearTimeout(timer) }
  }, [key, recipe, initialMap, sources, validation])
  const randomize = () => { setSeed(String(randomRoomSeed(Number(seed)))); setError('') }
  const create = async () => {
    setBusy(true); setError('')
    try {
      const updated = structuredClone(recipe)
      if (useProjectStore.getState().map !== initialMap || useAssetContext.getState().generation !== generation) throw Error('Project changed. Reopen Generate Room.')
      if (floor?.library && updated.floor.kind === 'pattern') updated.floor.assetId = (await adoptLibraryAsset(floor.asset)).id
      if (selectedSet && updated.walls.stroke.kind === 'texture') {
        const asset = await libraryRepository.getAsset(selectedSet.assetId)
        if (!asset || asset.kind !== 'fillPattern') throw Error('Wall material is unavailable.')
        updated.walls.stroke.assetId = (await adoptLibraryAsset(asset)).id
      }
      if (useProjectStore.getState().map !== initialMap || useAssetContext.getState().generation !== generation) throw Error('Project changed. Reopen Generate Room.')
      const canvas = document.querySelector('[aria-label="Map canvas"]')?.getBoundingClientRect()
      if (!canvas?.width || !canvas.height) throw Error('Map viewport is unavailable. Close and reopen the editor.')
      const center = screenToMap({ x: canvas.width / 2, y: canvas.height / 2 }, useEditorStore.getState().viewport)
      useProjectStore.getState().generateRoom(updated, center)
      onClose()
    } catch (e) { setError((e as Error).message); setBusy(false) }
  }
  const floorOptions = [...owned.map(asset => ({ asset, library: false })), ...library.assets.filter(a => assetAppliesToMap(a.sizing?.applicableMapTypes, 'battlemap')).map(asset => ({ asset, library: true }))]
  if (floor && !floorOptions.some(o => o.asset.id === floor.asset.id && o.library === floor.library)) floorOptions.unshift(floor)
  const ready = !validation && preview?.key === key && !!preview.url && !preview.error
  const singleDimension = shape === 'square' || shape === 'circle'
  return <Modal title="Generate Room" wide busy={busy} onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); if (ready && !busy) void create() }}>
      <div className={styles.layout}>
        <fieldset disabled={busy} className={styles.fields}>
          <label>Room name<input data-autofocus maxLength={120} placeholder="Room 1 (automatic)" value={name} onChange={e => setName(e.target.value)} /></label>
          <label>Shape<select aria-label="Shape" value={shape} onChange={e => setShape(e.target.value as RoomShape)}>{['rectangle', 'square', 'circle', 'oval'].map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
          <div className={styles.pair}><label>{shape === 'circle' ? 'Diameter' : shape === 'square' ? 'Size' : 'Width'} ({units.unit})<input type="number" step="any" min="0" required value={width} onChange={e => setWidth(e.target.value)} /></label>{!singleDimension && <label>Height ({units.unit})<input type="number" step="any" min="0" required value={height} onChange={e => setHeight(e.target.value)} /></label>}</div>
          <label>Floor<select aria-label="Floor" value={floor ? `${floor.library ? 'library' : 'project'}:${floor.asset.id}` : 'solid'} onChange={e => setFloor(floorOptions.find(o => `${o.library ? 'library' : 'project'}:${o.asset.id}` === e.target.value) ?? null)}><option value="solid">Solid color</option>{floorOptions.map(o => <option key={`${o.library}:${o.asset.id}`} value={`${o.library ? 'library' : 'project'}:${o.asset.id}`}>{o.asset.name} ({o.library ? 'Library' : 'Project'})</option>)}</select></label>
          {floor ? <label>Pattern scale<input type="number" step="any" min="0.01" max="100" required value={floorScale} onChange={e => setFloorScale(e.target.value)} /></label> : <label>Floor color<input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>}
          <details><summary>Find library floors</summary><label>Search floor materials<input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} /></label><p>{library.loading ? 'Loading…' : `${library.total} compatible materials`}</p><button type="button" disabled={!page} onClick={() => setPage(p => p - 1)}>Previous</button><button type="button" disabled={(page + 1) * 60 >= library.total} onClick={() => setPage(p => p + 1)}>Next</button>{library.error && <p role="status">{library.error}<button type="button" onClick={library.retry}>Retry</button></p>}</details>
          <label>Walls<select aria-label="Walls" value={wallChoice} onChange={e => { const choice = e.target.value; setWallChoice(choice); const set = sets.find(s => s.definition.revision === choice); setThickness(String((set ? set.definition.defaultThickness : choice === "current" ? currentWall.strokeWidth : wallPreset(choice, initialMap).strokeWidth) / units.pixels)) }}>{WALL_PRESETS.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}<option value="current">Current wall style</option>{sets.map(s => <option key={s.definition.revision} value={s.definition.revision}>{s.definition.title} · {s.definition.version}</option>)}</select></label>
          <label>Wall thickness ({units.unit})<input aria-label="Wall thickness" type="number" step="any" min={.5/units.pixels} max={512/units.pixels} required value={thickness} onChange={e => setThickness(e.target.value)} /></label>
          {setsError && <p role="status">Wall library unavailable: {setsError}</p>}
          <div className={styles.pair}><label>Doors<select aria-label="Doors" value={doors} onChange={e => setDoors(Number(e.target.value))}>{[0, 1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></label><label>Door style<select aria-label="Door style" disabled={!doors} value={doorType} onChange={e => setDoorType(e.target.value as RoomRecipe['doorType'])}><option value="single">Single</option><option value="double">Double</option><option value="passage">Passage</option></select></label></div>
          {!!doors && <label>Door width ({units.unit})<input type="number" min="0" step="any" required value={doorWidth} onChange={e => setDoorWidth(e.target.value)} /></label>}
          <label>Seed<input type="number" min="0" max="4294967295" step="1" required value={seed} onChange={e => setSeed(e.target.value)} /></label><button type="button" onClick={randomize}>Randomize</button>
        </fieldset>
        <section className={styles.preview} aria-label="Room preview"><h3>Preview</h3><p>Interior: {width} × {singleDimension ? width : height} {units.unit}<br/>Outer footprint: {Number((Number(width) + 2 * Number(thickness)).toFixed(4))} × {Number((Number(singleDimension ? width : height) + 2 * Number(thickness)).toFixed(4))} {units.unit}</p>{ready ? <img src={preview.url} alt="Room floor, walls and doors" /> : <p role="status">{validation || (preview?.key === key && preview.error) || 'Rendering preview…'}</p>}<p>Dimensions describe usable interior space. Walls grow outward. Each room gets its own layer.</p><p>Created at the viewport center. Pan the map first to choose a different location.</p></section>
      </div>
      {error && <p role="alert">{error}</p>}
      <footer className={styles.actions}><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" disabled={busy} onClick={randomize}>Regenerate</button><button type="submit" disabled={busy || !ready}>{busy ? 'Creating…' : 'Create Room'}</button></footer>
    </form>
  </Modal>
}



