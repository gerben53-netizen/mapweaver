import { PathTypeChoice } from './PathTypeChoice'
import { RouteTools } from './RouteTools'
import { WallTools } from './WallTools'
import { useEditorStore } from '../store/editorStore'
import { finishObjectGesture } from '../canvas/interaction'
import styles from './PathTools.module.css'
export function PathTools() {
  const tool = useEditorStore((s) => s.activeTool),
    mode = useEditorStore((s) => s.pathMode),
    width = useEditorStore((s) => s.pathWidth),
    stroke = useEditorStore((s) => s.pathStroke)
  if(tool==='route')return <RouteTools/>
  if (tool !== 'path') return <WallTools />
  return (
    <div className={styles.bar} aria-label="Path controls">
      <PathTypeChoice/>
      <label>
        Mode{' '}
        <select
          aria-label="Path mode"
          value={mode}
          onChange={(e) =>
            useEditorStore.setState({ pathMode: e.target.value as typeof mode })
          }
        >
          <option value="straight">Straight</option>
          <option value="curved">Curved</option>
        </select>
      </label>
      <label>
        Width{' '}
        <input
          aria-label="Path width"
          type="number"
          min="0.1"
          max="1024"
          defaultValue={width}
          onBlur={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n) && n > 0 && n <= 1024)
              useEditorStore.setState({ pathWidth: n })
            else e.target.value = String(width)
          }}
        />
      </label>
      <input
        aria-label="Path color"
        type="color"
        value={stroke.kind === 'texture' ? '#dfbe85' : stroke.color}
        onChange={(e) =>
          useEditorStore.setState({
            pathStroke: { kind: 'solid', color: e.target.value },
          })
        }
      />
      <button
        onClick={() =>
          useEditorStore.setState({
            picker: { kind: 'fillPattern', purpose: 'pathTexture' },
          })
        }
      >
        Texture
      </button>
      <span>Click nodes · Drag for curves · Enter finishes · Esc cancels</span>
      <button
        onClick={() => window.dispatchEvent(new Event('mapweaver-path-done'))}
      >
        Done
      </button>
      <button
        onClick={() => {
          finishObjectGesture()
          useEditorStore.setState({ activeTool: 'select' })
        }}
      >
        Select
      </button>
    </div>
  )
}
