import { RouteFields } from './RouteFields'
import { RouteConversion } from './RouteConversion'
import { routeStyle,routeWarnings } from '../domain/routes'
import { pixelsToDistance,mapWorkspace } from '../domain/geography'
import { materialWarning } from '../domain/wallMaterialGeometry'
import { WallFields } from './WallFields'
import { wallStyle } from '../domain/walls'
import { useState } from 'react'
import type { PathObject, PathStroke } from '../domain/models'
import {
  pathGeometry,
  reversePath,
  withPathGeometry,
  removePathNode,
  setPathHandle,
} from '../domain/paths'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history } from '../store/history'
import { startPathEdit, endPathEdit, changePath } from '../store/pathEditing'
import styles from './ObjectProperties.module.css'
export function PathProperties({ object, section='all' }: { object: PathObject; section?:'all'|'geometry'|'appearance' }) {
  const map=useProjectStore(s=>s.map)
  const [draft, setDraft] = useState(object),
    tool = useEditorStore((s) => s.activeTool),
    selected = useEditorStore((s) => s.editPoint),
    editing = tool === 'editPath'
  const patch = (p: Partial<PathObject>) => setDraft({ ...draft, ...p })
  const stroke = (p: Partial<PathStroke>) =>
    setDraft({ ...draft, stroke: { ...draft.stroke, ...p } as PathStroke })
  const act = (fn: () => void) => {
    try {
      fn()
      useEditorStore.setState({ message: '' })
    } catch (e) {
      useEditorStore.setState({ message: (e as Error).message })
    }
  }
  const numeric = (label: string, value: number, fn: (n: number) => void) => (
    <label className={styles.field}>
      {label}
      <input
        aria-label={label}
        type="number"
        step="any"
        value={value}
        onChange={(e) => fn(Number(e.target.value))}
      />
    </label>
  )
  const selectedNode = selected === null ? undefined : object.nodes[selected]
  return (
    <div className={styles.content}>
      {section!=='appearance'&&<><h3>{object.pathKind==='generic'?'Path':object.pathKind[0].toUpperCase()+object.pathKind.slice(1)}</h3>
      {object.route&&<p>{pixelsToDistance(pathGeometry(object).length,map).toFixed(2)} {mapWorkspace(map).geography.unit} long</p>}
      {routeWarnings(object).map(w=><p role="status" key={w}>{w}</p>)}
      {materialWarning(object)&&<p role="status">{materialWarning(object)}</p>}
      <p>
        {object.nodes.length} nodes · {pathGeometry(object).length.toFixed(1)}{' '}
        map px {object.wall && object.wall.unit!=='px' && ` · ${(pathGeometry(object).length/object.wall.pixelsPerUnit).toFixed(2)} ${object.wall.unit}`}
      </p>
      {editing ? (
        <>
          <button onClick={() => endPathEdit()}>Done editing path</button>
          <button onClick={() => endPathEdit(true)}>Cancel edits</button>
          <p>
            Drag nodes/handles. Double-click a segment to insert. Enter commits;
            Escape restores.
          </p>
          {selectedNode && (
            <>
              {object.route&&!object.closed&&selected!>0&&selected!<object.nodes.length-1&&<button onClick={()=>act(()=>{const index=selected!;endPathEdit();useProjectStore.getState().splitRouteAt(object.id,index)})}>Split at node</button>}
              <button
                onClick={() =>
                  changePath((o) =>
                    withPathGeometry(
                      o,
                      o.nodes.map((n, i) =>
                        i === selected
                          ? n.mode === 'smooth'
                            ? { ...n, mode: 'corner' }
                            : setPathHandle(
                                { ...n, mode: 'smooth' },
                                'out',
                                n.out || { x: 30, y: 0 },
                              )
                          : n,
                      ),
                    ),
                  )
                }
              >
                {selectedNode.mode === 'smooth' ? 'Make corner' : 'Make smooth'}
              </button>
              <button
                onClick={() =>
                  changePath((o) =>
                    withPathGeometry(
                      o,
                      o.nodes.map((n, i) =>
                        i === selected
                          ? { id: n.id, x: n.x, y: n.y, mode: 'corner' }
                          : n,
                      ),
                    ),
                  )
                }
              >
                Reset handles
              </button>
              <button
                onClick={() => {
                  changePath((o) => removePathNode(o, selected!))
                  useEditorStore.setState({ editPoint: null })
                }}
              >
                Delete node
              </button>
            </>
          )}
        </>
      ) : (
        <button onClick={() => startPathEdit(object)}>Edit path</button>
      )}
      {object.pathKind==='wall'&&<>
        <p>{object.closed?'Closed wall':'Open wall'} · No Area or room required.</p>
        <button disabled={(!object.closed&&object.nodes.length<3)||object.wall?.alignment==='outside'} onClick={()=>act(()=>{
          const next=withPathGeometry({...object,closed:!object.closed})
          if(editing)changePath(()=>next)
          else history.run(object.closed?'Open wall path':'Close wall path',()=>useProjectStore.getState().updatePath(next))
        })}>{object.closed?'Open Path':'Close Path'}</button>
        {object.wall?.alignment==='outside'&&<p>Outside-aligned walls need a closed boundary. Draw a separate open wall to keep this boundary unchanged.</p>}
      </>}
      </>}{section!=='geometry'&&<form
        onSubmit={(e) => {
          e.preventDefault()
          act(() => {
            const next = withPathGeometry(draft)
            if (editing) changePath(() => next)
            else
              history.run('Change path properties', () =>
                useProjectStore.getState().updatePath(next),
              )
          })
        }}
      >
        <label className={styles.field}>
          Name
          <input
            aria-label="Path name"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        {draft.pathKind!=='wall'&&<label>
          <input
            type="checkbox"
            disabled={draft.pathKind==='river'}
            checked={draft.closed}
            onChange={(e) => patch({ closed: e.target.checked })}
          />{' '}
          Closed path
        </label>}
        {draft.route?.kind==='river'?<p>River appearance updates live in River style above. Nodes and name remain independently editable.</p>:draft.route?<RouteFields value={draft} onChange={setDraft}/>:draft.pathKind==='wall' ? <WallFields value={wallStyle(draft)} onChange={s=>setDraft({...draft,...s})} replacementId={object.id}/> : <>{numeric('Stroke width', draft.strokeWidth, (n) =>
          patch({ strokeWidth: n }),
        )}
        {numeric('Opacity', draft.opacity, (n) => patch({ opacity: n }))}
        <label className={styles.field}>
          Stroke
          <select
            aria-label="Stroke type"
            value={draft.stroke.kind}
            onChange={(e) =>
              patch({
                stroke:
                  e.target.value === 'texture'
                    ? {
                        kind: 'texture',
                        assetId:
                          useEditorStore.getState().patternAsset?.id ||
                          'choose-texture',
                        scale: 1,
                        spacing: 16,
                        offset: 0,
                      }
                    : e.target.value === 'dashed'
                      ? { kind: 'dashed', color: '#dfbe85', dash: 16, gap: 8 }
                      : { kind: 'solid', color: '#dfbe85' },
              })
            }
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="texture">Texture</option>
          </select>
        </label>
        {draft.stroke.kind === 'texture' ? (
          <>
            <button
              type="button"
              onClick={() => {
                if (editing) endPathEdit()
                useEditorStore.setState({
                  picker: {
                    kind: 'fillPattern',
                    purpose: 'pathTexture',
                    replacementId: object.id,
                  },
                })
              }}
            >
              Choose path texture
            </button>
            {numeric('Texture scale', draft.stroke.scale, (n) =>
              stroke({ scale: n }),
            )}
            {numeric('Texture spacing', draft.stroke.spacing, (n) =>
              stroke({ spacing: n }),
            )}
            {numeric('Texture offset', draft.stroke.offset, (n) =>
              stroke({ offset: n }),
            )}
          </>
        ) : (
          <label className={styles.field}>
            Color
            <input
              aria-label="Stroke color"
              type="color"
              value={draft.stroke.color}
              onChange={(e) => stroke({ color: e.target.value })}
            />
          </label>
        )}
        {draft.stroke.kind === 'dashed' && (
          <>
            {numeric('Dash', draft.stroke.dash, (n) => stroke({ dash: n }))}
            {numeric('Gap', draft.stroke.gap, (n) => stroke({ gap: n }))}
          </>
        )}
        <label className={styles.field}>
          Cap
          <select
            aria-label="Line cap"
            value={draft.cap}
            onChange={(e) =>
              patch({ cap: e.target.value as PathObject['cap'] })
            }
          >
            {['butt', 'round', 'square'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Join
          <select
            aria-label="Line join"
            value={draft.join}
            onChange={(e) =>
              patch({ join: e.target.value as PathObject['join'] })
            }
          >
            {['miter', 'round', 'bevel'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        </>}<button type="submit">Apply path properties</button>
      </form>}
      {section!=='appearance'&&<>      {!editing&&<RouteConversion object={object}/>}
      {object.route&&!object.closed&&!editing&&<div>{(['start','end'] as const).map(endpoint=><button key={endpoint} onClick={()=>useEditorStore.setState({activeTool:'route',routeStyle:routeStyle(object),continueWall:{id:object.id,endpoint}})}>Extend from {endpoint}</button>)}</div>}
      {object.pathKind==='wall' && !object.closed && !editing && <div>{(['start','end'] as const).map(endpoint=><button key={endpoint} onClick={()=>useEditorStore.setState({activeTool:'wall',activeLayerId:useProjectStore.getState().layers.find(l=>l.objectIds.includes(object.id))!.id,wallStyle:wallStyle(object),continueWall:{id:object.id,endpoint}})}>Extend from {endpoint}</button>)}</div>}
      <button
        onClick={() =>
          act(() => {
            if (editing) changePath(reversePath)
            else
              history.run('Reverse path', () =>
                useProjectStore.getState().updatePath(reversePath(object)),
              )
          })
        }
      >
        Reverse direction
      </button>
      {!editing && <p className="muted">Drag corners to scale and the round handle to rotate. Shift snaps rotation.</p>}
    </>} </div>
  )
}

