import { openMaterialBrowser } from '../store/materialApplication'
import { LandAreaProperties } from './LandAreaProperties'
import { canCreateWithTool } from '../domain/mapCapabilities'
import { ScatterAreaAction } from './ScatterTools'
import { BoundaryWalls } from './BoundaryWalls'
import { useState } from 'react'
import type { AreaObject } from '../domain/models'
import { allRings, withGeometry } from '../domain/areas'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { history } from '../store/history'
import {
  startAreaEdit,
  endAreaEdit,
  changeAreaPoint,
} from '../store/areaEditing'
import { combineInWorker } from '../canvas/areaBooleanClient'
import { useImage } from '../images/useImage'
import styles from './ObjectProperties.module.css'
export function AreaProperties({ object, section='all' }: { object: AreaObject; section?:'all'|'geometry'|'appearance' }) {
  const map=useProjectStore(s=>s.map)
  const [draft, setDraft] = useState(object),
    [error, setError] = useState('')
  const editing = useEditorStore((s) => s.activeTool === 'editArea'),
    ring = useEditorStore((s) => s.editRing)
  const { error: imageError } = useImage(
    object.fill.kind === 'pattern' ? object.fill.assetId : '',
    'asset',
    'fillPattern',
  )
  const fill = draft.fill,
    rings = allRings(object.geometry)
  const numeric = (
    key: 'opacity' | 'strokeOpacity' | 'strokeWidth',
    label: string,
  ) => (
    <label className={styles.field}>
      {label}
      <input
        type="number"
        step="any"
        value={draft[key]}
        onChange={(e) =>
          setDraft({
            ...draft,
            [key]: e.target.value === '' ? NaN : Number(e.target.value),
          })
        }
      />
    </label>
  )
  return (
    <div className={styles.content}>
      {section==='all'&&<><h3>{object.name}</h3>{!editing&&<LandAreaProperties key={JSON.stringify(object)} object={object}/>}
      {!editing&&!object.ceiling&&<><ScatterAreaAction area={object}/>{canCreateWithTool(map.mapType,'wall')&&<BoundaryWalls area={object}/>}</>}
      </>}{section!=='appearance'&&<><p>
        {object.geometry.polygons.length} polygons ·{' '}
        {rings.length - object.geometry.polygons.length} holes ·{' '}
        {rings.reduce((n, r) => n + r.length, 0)} points
      </p>
      {imageError && (
        <p role="alert">Pattern unavailable. Choose a replacement.</p>
      )}
      {editing ? (
        <>
          <label className={styles.field}>
            Active ring
            <select
              value={ring}
              onChange={(e) =>
                useEditorStore.setState({
                  editRing: Number(e.target.value),
                  editPoint: null,
                })
              }
            >
              {object.geometry.polygons.flatMap((p, i) => [
                <option
                  key={`${i}-outer`}
                  value={object.geometry.polygons
                    .slice(0, i)
                    .reduce((n, p) => n + 1 + p.holes.length, 0)}
                >
                  Polygon {i + 1} — outer
                </option>,
                ...p.holes.map((_, j) => (
                  <option
                    key={`${i}-${j}`}
                    value={
                      object.geometry.polygons
                        .slice(0, i)
                        .reduce((n, p) => n + 1 + p.holes.length, 0) +
                      j +
                      1
                    }
                  >
                    Polygon {i + 1} — hole {j + 1}
                  </option>
                )),
              ])}
            </select>
          </label>
          <p>
            Double-click an edge to add a point. Drag a node; Alt bypasses
            snapping.
          </p>
          <button onClick={() => changeAreaPoint('remove')}>
            Remove point
          </button>
          <button onClick={() => endAreaEdit()}>Done editing points</button>
          <button onClick={() => endAreaEdit(true)}>Cancel point edits</button>
        </>
      ) : (
        <button onClick={() => startAreaEdit(object)}>Edit points</button>
      )}
      </>}{section!=='geometry'&&<form
        onSubmit={(e) => {
          e.preventDefault()
          try {
            history.run('Change area properties', () =>
              useProjectStore.getState().updateArea(draft),
            )
            setError('')
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Invalid properties')
          }
        }}
      >
        <fieldset disabled={editing}>
          <legend>Appearance</legend>
          <label className={styles.field}>
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            Fill type
            <select
              value={fill.kind}
              onChange={(e) => {
                if (e.target.value === 'pattern')
                  openMaterialBrowser([object.id])
                else
                  setDraft({
                    ...draft,
                    fill:
                      e.target.value === 'none'
                        ? { kind: 'none' }
                        : { kind: 'solid', color: '#769aa0' },
                  })
              }}
            >
              <option value="none">None</option>
              <option value="solid">Solid</option>
              <option value="pattern">Pattern</option>
            </select>
          </label>
          {fill.kind === 'solid' && (
            <label className={styles.field}>
              Solid color
              <input
                type="color"
                value={fill.color}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    fill: { kind: 'solid', color: e.target.value },
                  })
                }
              />
            </label>
          )}
          {fill.kind === 'pattern' && (
            <>
              <button
                type="button"
                onClick={() =>
                  openMaterialBrowser([object.id])
                }
              >
                Browse materials
              </button>
              <label className={styles.field}>
                Pattern mode
                <select
                  value={fill.mode}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      fill: {
                        ...fill,
                        mode:
                          e.target.value === 'stretch' ? 'stretch' : 'repeat',
                      },
                    })
                  }
                >
                  <option value="repeat">Repeat</option>
                  <option value="stretch">Stretch</option>
                </select>
              </label>
              {(['rotation', 'offsetX', 'offsetY'] as const).map(
                (key) => (
                  <label className={styles.field} key={key}>
                    Pattern {key}
                    <input
                      type="number"
                      step="any"
                      disabled={fill.mode === 'stretch' && key !== 'rotation'}
                      value={fill[key]}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          fill: {
                            ...fill,
                            [key]:
                              e.target.value === ''
                                ? NaN
                                : Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                ),
              )}
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    fill: {
                      ...fill,
                      scale: 1,
                      rotation: 0,
                      offsetX: 0,
                      offsetY: 0,
                    },
                  })
                }
              >
                Reset pattern transform
              </button>
              <p>
                Texture follows object movement; point edits retain its frame.
                Stretch uses this frame; repeat scale and offsets are retained.
              </p>
            </>
          )}
          {numeric('opacity', 'Fill opacity (0–1)')}
          <label>
            <input
              type="checkbox"
              checked={draft.strokeWidth > 0}
              onChange={(e) =>
                setDraft({ ...draft, strokeWidth: e.target.checked ? 2 : 0 })
              }
            />{' '}
            Stroke — includes hole boundaries
          </label>
          <label className={styles.field}>
            Stroke color
            <input
              type="color"
              value={draft.strokeColor}
              onChange={(e) =>
                setDraft({ ...draft, strokeColor: e.target.value })
              }
            />
          </label>
          {numeric('strokeOpacity', 'Stroke opacity (0–1)')}
          {numeric('strokeWidth', 'Stroke width (map px)')}
          <label className={styles.field}>
            Stroke style
            <select
              value={draft.strokeStyle}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  strokeStyle: e.target.value as AreaObject['strokeStyle'],
                })
              }
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </label>
          {error && <p role="alert">{error}</p>}
          <button type="submit">Apply area settings</button>
        </fieldset>
      </form>}
    </div>
  )
}
export function AreaBooleanActions() {
  const ids = useEditorStore((s) => s.selectedObjectIds),
    objects = useProjectStore((s) => s.objects),
    [busy, setBusy] = useState(false)
  const selection = ids
    .map((id) => objects.find((o) => o.id === id))
    .filter((o): o is AreaObject => o?.kind === 'area')
  if (ids.length < 2 || selection.length !== ids.length) return null
  async function run(operation: 'union' | 'subtract') {
    setBusy(true)
    const before = useProjectStore.getState(),
      signature = JSON.stringify({
        objects: before.objects,
        layers: before.layers,
        map: before.map,
      })
    try {
      const geometry = await combineInWorker(
        operation,
        selection.map((o) => o.geometry),
      )
      const after = useProjectStore.getState()
      if (
        JSON.stringify({
          objects: after.objects,
          layers: after.layers,
          map: after.map,
        }) !== signature
      )
        throw new Error('The project changed during calculation. Try again.')
      if (
        !geometry &&
        !window.confirm(
          'This removes every selected area. Continue? Undo can restore them.',
        )
      )
        return
      useProjectStore
        .getState()
        .replaceAreas(
          ids,
          geometry ? withGeometry(selection[0], geometry) : null,
        )
    } catch (e) {
      useEditorStore.setState({
        message: e instanceof Error ? e.message : 'Cannot combine areas.',
      })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={styles.content}>
      <p>
        Primary: {selection[0].name} ({selection[0].id.slice(0, 8)}). Subtract
        removes the other selected areas from this first-selected area.
      </p>
      <button disabled={busy} onClick={() => void run('union')}>
        Union
      </button>
      <button disabled={busy} onClick={() => void run('subtract')}>
        Subtract
      </button>
      {busy && <p role="status">Combining areas…</p>}
    </div>
  )
}
