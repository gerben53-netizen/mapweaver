import { TERRAIN_TYPES } from '../domain/terrainIntent'
import type { TerrainType } from '../domain/landAreas'
import { useImage } from '../images/useImage'
import { useEditorStore } from '../store/editorStore'
import { finishObjectGesture } from '../canvas/interaction'
import { endAreaEdit } from '../store/areaEditing'
import type { AreaShape } from '../domain/areas'
import styles from './PatternTools.module.css'
function PatternChoice({ id, name }: { id: string; name: string }) {
  const { image } = useImage(id, 'thumbnail')
  return (
    <button
      onClick={() =>
        useEditorStore.setState({ picker: { kind: 'fillPattern' } })
      }
    >
      {image && <img src={image.src} alt="" width={24} height={24} />} {name}
    </button>
  )
}
export function AreaTools() {
  const s = useEditorStore()
  if (s.activeTool === 'editArea')
    return (
      <div className={styles.tools}>
        <strong>Edit points</strong>
        <span>
          Drag nodes · Double-click an edge to add · Delete removes · Esc
          restores
        </span>
        <button onClick={() => endAreaEdit()}>Done</button>
      </div>
    )
  if (s.activeTool !== 'area') return null
  return (
    <div className={styles.tools} aria-label="Area context">
      <strong>{s.areaRole==='area'?'Area':s.areaRole==='landmass'?'Landmass':'Terrain Region'}</strong>
      <span>{s.areaRole==='terrain-region'?'Define a semantic biome; visual paint stays separate.':s.areaRole==='area'?'Draw a generic named or styled zone; no biome classification.':'Edit physical geography.'}</span>
      {s.areaRole==='terrain-region'&&<label>Biome<select aria-label="Biome" value={s.areaTerrain} onChange={e=>{finishObjectGesture();useEditorStore.setState({areaTerrain:e.target.value as TerrainType})}}>{Object.entries(TERRAIN_TYPES).map(([id,t])=><option key={id} value={id}>{t.name}</option>)}</select></label>}<label>
        Shape{' '}
        <select
          aria-label="Area shape"
          value={s.areaShape}
          onChange={(e) =>
            useEditorStore.setState({ areaShape: e.target.value as AreaShape })
          }
        >
          {['rectangle', 'ellipse', 'polygon', 'freehand'].map((v) => (
            <option key={v} value={v}>
              {v[0].toUpperCase() + v.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Fill{' '}
        <select
          aria-label="Area fill"
          value={s.areaFill.kind}
          onChange={(e) => {
            if (e.target.value === 'pattern')
              useEditorStore.setState({ picker: { kind: 'fillPattern' } })
            else
              useEditorStore.setState({
                areaFill:
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
      {s.areaFill.kind === 'solid' && (
        <input
          aria-label="Area color"
          type="color"
          value={s.areaFill.color}
          onChange={(e) =>
            useEditorStore.setState({
              areaFill: { kind: 'solid', color: e.target.value },
            })
          }
        />
      )}
      {s.areaFill.kind === 'pattern' && (
        <PatternChoice
          id={s.areaFill.assetId}
          name={s.patternAsset?.name || 'Choose pattern'}
        />
      )}
      <label>
        <input
          type="checkbox"
          checked={s.areaStroke}
          onChange={(e) =>
            useEditorStore.setState({ areaStroke: e.target.checked })
          }
        />{' '}
        Stroke
      </label>
      {s.areaStroke && (
        <select
          aria-label="Area stroke style"
          value={s.areaStrokeStyle}
          onChange={(e) =>
            useEditorStore.setState({
              areaStrokeStyle: e.target.value as typeof s.areaStrokeStyle,
            })
          }
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      )}
      <button
        onClick={() => {
          finishObjectGesture()
          useEditorStore.setState({ activeTool: 'select' })
        }}
      >
        Done
      </button>
      <small>
        {s.areaShape === 'polygon'
          ? 'Click points · Click start / Enter to close · Backspace · Esc'
          : s.areaShape === 'freehand'
            ? 'Drag a contour · Esc cancels'
            : 'Drag shape · Shift constrains · Alt bypasses snap'}
      </small>
    </div>
  )
}
