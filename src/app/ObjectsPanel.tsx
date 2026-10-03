import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { finishObjectGesture } from '../canvas/interaction'
import { useObjectBrowserData } from './useObjectBrowserData'
import { filterObjectRows, objectListName, objectListWindow, OBJECT_ROW_HEIGHT } from '../domain/objectList'
import type { ObjectListFilter } from '../domain/objectList'
import styles from './ObjectsPanel.module.css'

const LIST_HEIGHT = 260
export function ObjectsPanel() {
  const {rows,names,contexts}=useObjectBrowserData()
  const groups = useProjectStore(state => state.objectGroups), collapsed = useEditorStore(state => state.collapsedGroups)
  const editing = useEditorStore(state => state.editingGroupId)
  const selected = useEditorStore(state => state.selectedObjectIds)
  const activeLayer = useEditorStore(state => state.activeLayerId)
  const [scope, setScope] = useState<'active' | 'visible'>('active')
  const [type, setType] = useState<ObjectListFilter>('all')
  const [query, setQuery] = useState('')
  const [scroll, setScroll] = useState(0)
  const [focused, setFocused] = useState<string | null>(null)
  const viewport = useRef<HTMLDivElement>(null), prefix = useId()
  const filtered = useMemo(() => filterObjectRows(rows, { scope, activeLayerId: activeLayer, type, query, collapsed }, names), [rows, scope, activeLayer, type, query, names, collapsed])
  const range = objectListWindow(filtered.length, scroll, LIST_HEIGHT)
  const visible = filtered.slice(range.start, range.end)
  const selectedSet = new Set(selected)
  const rowSelected = (id: string) => selectedSet.has(id) || !!groups.find(group => group.id === id && group.objectIds.length && group.objectIds.every(member => selectedSet.has(member)))

  function scrollTo(index: number) {
    const element = viewport.current
    if (!element || index < 0) return
    const top = index * OBJECT_ROW_HEIGHT
    if (top < element.scrollTop) element.scrollTop = top
    else if (top + OBJECT_ROW_HEIGHT > element.scrollTop + LIST_HEIGHT) element.scrollTop = top + OBJECT_ROW_HEIGHT - LIST_HEIGHT
    // Also works when layout has no native scroll event (e.g. a hidden panel).
    element.dispatchEvent(new Event('scroll', { bubbles: true }))
  }
  useEffect(() => { if(selected.length===1)scrollTo(filtered.findIndex(row => row.id === selected[0])) }, [selected, filtered])

  function select(id: string, toggle: boolean) {
    finishObjectGesture()
    const group = groups.find(g => g.id === id)
    if (group) { useProjectStore.getState().editGroup(null); if (group.objectIds[0]) useEditorStore.getState().select(group.objectIds[0], toggle) }
    else useEditorStore.getState().select(id, toggle)
    setFocused(id)
    viewport.current?.focus()
  }
  function resetScroll() { if (viewport.current) viewport.current.scrollTop = 0; setScroll(0) }
  function reveal() {
    const row = rows.find(row => selectedSet.has(row.id))
    if (!row) return
    setQuery(''); setType('all'); setScope('active')
    useEditorStore.setState({ activeLayerId: row.layerId, collapsedGroups: collapsed.filter(id => id !== row.groupId) })
    scrollTo(filterObjectRows(rows, { scope: 'active', activeLayerId: row.layerId, query: '', type: 'all' }, names).findIndex(item => item.id === row.id))
  }
  const focusedRow = rows.find(row => row.id === focused)
  const toggleGroup = (id: string) => useEditorStore.setState({collapsedGroups: collapsed.includes(id) ? collapsed.filter(key=>key!==id) : [...collapsed,id]})
  const activeDescendant = visible.some(row => row.id === focused) ? `${prefix}-${focused}` : undefined
  return <section className={styles.panel} aria-label="Objects">
    <div className={styles.filters}>
      <label>Search objects<input type="search" value={query} onChange={event => { setQuery(event.target.value); resetScroll() }} /></label>
      <div className={styles.selects}>
        <label>Scope<select value={scope} onChange={event => { setScope(event.target.value as typeof scope); resetScroll() }}><option value="active">Active layer</option><option value="visible">Visible layers</option></select></label>
        <label>Type<select value={type} onChange={event => { setType(event.target.value as ObjectListFilter); resetScroll() }}><option value="all">All types</option>{["place","label","legend","compass"].map(kind=><option key={kind} value={kind}>{kind}</option>)}<option value="scatter">Scatter</option><option value="stamp">Stamp</option><option value="area">Area</option><option value="path">Path</option><option value="wall">Wall</option><option value="river">River</option><option value="road">Road</option><option value="border">Border</option><option value="door">Door</option><option value="window">Window</option></select></label>
      </div>
      <p role="status" className={styles.selectionSummary}>{selected.length?`${selected.length} object${selected.length===1?'':'s'} selected`:'No selection'}</p><div className={styles.summary}><output aria-label="Object count">{filtered.filter(row=>row.kind!=='group').length} objects{filtered.some(row=>row.kind==='group') ? ` · ${filtered.filter(row=>row.kind==='group').length} groups` : ''}</output><button disabled={!selected.length} onClick={reveal}>Reveal selected</button></div>
    </div>
    <div ref={viewport} className={styles.viewport} style={{ height: LIST_HEIGHT }} role="listbox" aria-label="Map objects" aria-multiselectable="true" aria-activedescendant={activeDescendant} tabIndex={0}
      onScroll={event => setScroll(event.currentTarget.scrollTop)} onKeyDown={event => {
        if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation()
          if (!filtered.length) return
          const current = filtered.findIndex(row => row.id === (focused || selected[0]))
          const index = event.key === 'Home' ? 0 : event.key === 'End' ? filtered.length - 1 : Math.max(0, Math.min(filtered.length - 1, current + (event.key === 'ArrowUp' ? -1 : 1)))
          setFocused(filtered[index].id); scrollTo(index)
        } else if ((event.key === 'Enter' || event.key === ' ') && focused) {
          event.preventDefault(); event.stopPropagation(); select(focused, event.ctrlKey || event.metaKey || event.shiftKey)
        }
      }}>
      <div style={{ height: filtered.length * OBJECT_ROW_HEIGHT, position: 'relative' }} role="presentation">
        {visible.map((row, index) => <div id={`${prefix}-${row.id}`} key={row.id} role="option" aria-selected={rowSelected(row.id)} aria-disabled={!row.visible || row.locked} aria-posinset={range.start + index + 1} aria-setsize={filtered.length}
          className={`${styles.row} ${focused === row.id ? styles.focused : ''}`} style={{ top: (range.start + index) * OBJECT_ROW_HEIGHT, height: OBJECT_ROW_HEIGHT }}
          onClick={event => select(row.id, event.ctrlKey || event.metaKey || event.shiftKey)} onDoubleClick={()=>{if(row.kind==='group')toggleGroup(row.id)}}>
          <span aria-hidden="true" className={styles.symbol}>{rowSelected(row.id) ? '✓' : row.kind === 'group' ? collapsed.includes(row.id) ? '▸' : '▾' : row.kind === 'scatter' ? '⁙' : row.kind === 'stamp' ? '◆' : row.kind === 'path' ? '∿' : '▱'}</span>
          <div className={styles.label}><span title={objectListName(row, names)}>{objectListName(row, names)}</span><small>{contexts.get(row.id)}{row.groupId ? ' · Group member' : ''}{row.locked ? ' · Locked' : ''}{!row.visible ? ' · Hidden' : ''}{selectedSet.has(row.id) ? ' · Selected' : ''}</small></div>
        </div>)}
      </div>
      {!filtered.length && <p className={styles.empty}>{rows.length ? 'No objects match these filters.' : 'Choose Area, Route, Path or Place asset to add a map object.'}</p>}
    </div>
    {editing && <p role="status">Editing group: {groups.find(g=>g.id===editing)?.name}<button onClick={()=>useProjectStore.getState().editGroup(null)}>Exit group</button></p>}
    {focusedRow?.kind==='group'&&<button onClick={()=>toggleGroup(focusedRow.id)}>{collapsed.includes(focusedRow.id)?'Expand group':'Collapse group'}</button>}
    {focusedRow&&(!focusedRow.visible||focusedRow.locked)&&<div className={styles.filters}><p className={styles.help}>Hidden or locked items cannot be selected. Parent layer/group restrictions are managed in Layers/Properties.</p>
      {!focusedRow.visible&&<button onClick={()=>{const p=useProjectStore.getState();if(focusedRow.kind==='group')p.changeGroup(focusedRow.id,{visible:true});else p.changeObject(focusedRow.id,{visible:true})}}>Show item</button>}
      {focusedRow.locked&&<button onClick={()=>{const p=useProjectStore.getState();if(focusedRow.kind==='group')p.changeGroup(focusedRow.id,{locked:false});else p.changeObject(focusedRow.id,{locked:false})}}>Unlock item</button>}
    </div>}
    <p className={styles.help}>↑/↓ to browse · Enter to select · Shift-click to add. Front objects are listed first.</p>

  </section>
}


