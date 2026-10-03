import { useEffect, useId, useRef, useState } from 'react'
import type { AreaObject } from '../domain/models'
import { MIN_PATTERN_SCALE, MAX_PATTERN_SCALE } from '../domain/patterns'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history } from '../store/history'
import { finishObjectGesture, ownObjectGesture } from '../canvas/interaction'
import styles from './ObjectProperties.module.css'

export function AreaPatternScale({ object, compact=false }: { object: AreaObject; compact?:boolean }) {
  const [draft, setDraft] = useState<string | null>(null), [error, setError] = useState('')
  const session = useRef<{ finish: (cancel?: boolean) => void } | null>(null)
  const invalid = useRef(false), hint = useId()
  const editing = useEditorStore(s => s.activeTool === 'editArea')
  useEffect(() => () => session.current?.finish(true), [])
  useEffect(() => {
    const blur = () => session.current?.finish(invalid.current)
    window.addEventListener('blur', blur)
    return () => window.removeEventListener('blur', blur)
  }, [])
  if (object.fill.kind !== 'pattern') return null
  const change = (text: string) => {
    setDraft(text)
    const scale = text.trim() ? Number(text) : NaN
    invalid.current = !Number.isFinite(scale) || scale < MIN_PATTERN_SCALE || scale > MAX_PATTERN_SCALE
    if (invalid.current) { setError(`Use a pattern scale from ${MIN_PATTERN_SCALE} to ${MAX_PATTERN_SCALE}.`); return }
    setError('')
    try {
      if (!session.current) {
        finishObjectGesture()
        history.begin('Change pattern scale')
        let release = () => {}
        const current = { finish: (cancel = false) => {
          if (session.current !== current) return
          session.current = null; release()
          if (cancel) history.cancel(); else history.commit()
          if (!invalid.current) setDraft(null)
        } }
        session.current = current
        release = ownObjectGesture(() => current.finish(invalid.current), () => current.finish(true))
      }
      const current = useProjectStore.getState().objects.find(o => o.id === object.id)
      if (current?.kind === 'area' && current.fill.kind === 'pattern')
        useProjectStore.getState().updateArea({ ...current, fill: { ...current.fill, scale } })
    } catch (e) { session.current?.finish(true); setError((e as Error).message) }
  }
  return <section className={compact?undefined:styles.content} aria-label="Pattern sizing">
    <label className={styles.field}>Pattern scale
      <input type="number" min={MIN_PATTERN_SCALE} max={MAX_PATTERN_SCALE} step="0.01"
        disabled={editing || object.fill.mode !== 'repeat'} value={draft ?? object.fill.scale}
        aria-invalid={!!error} aria-describedby={hint} onChange={e => change(e.target.value)}
        onBlur={() => session.current?.finish(invalid.current)} onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); session.current?.finish(invalid.current) }
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); session.current?.finish(true); invalid.current = false; setDraft(null); setError('') }
        }}/>
    </label>
    <small id={hint} hidden={compact} >{object.fill.mode === 'repeat' ? 'Live preview · 0.5 = half-size tiles · 1 = original size. Enter or leave to keep; Escape cancels.' : 'Stretch fits the texture to the area frame; repeat scale is retained.'}</small>
    {error && <p role="alert">{error}</p>}
  </section>
}
