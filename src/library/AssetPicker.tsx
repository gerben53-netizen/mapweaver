import { applyMaterial, cancelMaterial, previewMaterial, useMaterialPreview } from '../store/materialApplication'
import { useProjectStore } from '../store/projectStore'
import { assetAppliesToMap } from '../domain/mapCapabilities'
import { mapTypeName } from '../domain/geography'
import { useEffect, useState } from 'react'
import { Modal } from '../app/Modal'
import { Icon } from '../app/Icon'
import { Tabs } from '../app/Tabs'
import { useEditorStore } from '../store/editorStore'
import { projectAssets } from '../projects/assets'
import { useLibrary } from './useLibrary'
import { AssetThumbnail } from './AssetThumbnail'
import { chooseAsset, pickerAssets } from './chooseAsset'
import type { AssetSource } from './chooseAsset'
import styles from './Assets.module.css'
const remembered = new Map<string, { source: AssetSource; query: string; category: string }>()
export function AssetPicker() {
  const picker = useEditorStore((s) => s.picker)
  return picker ? <Picker key={`${picker.kind}-${picker.purpose || ''}-${picker.replacementId || ''}`} {...picker} /> : null
}
function Picker({ kind, replacementId, purpose }: NonNullable<ReturnType<typeof useEditorStore.getState>['picker']>) {
  const material = purpose === 'applyMaterial', preview = useMaterialPreview()
  const saved = remembered.get(kind)
  useEffect(() => material ? useEditorStore.subscribe(s => { if (s.picker?.purpose !== 'applyMaterial') cancelMaterial() }) : undefined, [material])
  const mapType=useProjectStore(s=>s.map.mapType),[showAll,setShowAll]=useState(false)
  const owned = projectAssets(), recent = useEditorStore((s) => s.recentAssets)
  const [source, setSource] = useState<AssetSource>(saved?.source || 'library'), [query, setQuery] = useState(saved?.query || ''), [category, setCategory] = useState(saved?.category || ''), [selected, setSelected] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [page,setPage]=useState(0),library=useLibrary(kind,query,category,page,showAll?'':mapType||'battlemap')
  useEffect(() => { remembered.set(kind, { source, query, category }) }, [kind, source, query, category])
  const close = () => { if (material) cancelMaterial(); useEditorStore.setState({ picker: null }) }
  async function highlight(id: string) {
    setSelected(id); setError('')
    if (!material) return
    setBusy(true)
    try { await previewMaterial(id, source) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const assets = source === 'library' ? library.assets : pickerAssets(owned, kind, query, category).filter(a=>showAll||assetAppliesToMap(a.sizing?.applicableMapTypes,mapType))
  const recentItems = assets.filter((a) => recent.some((r) => r.id === a.id && r.kind === kind && r.source === source)).slice(0, 6)
  const grid = (items: typeof assets) => <div className={styles.grid}>{items.map((a) => <button key={a.id} className={styles.card} title={a.name} aria-label={`Choose ${a.name}`} aria-pressed={selected === a.id} disabled={material && !assetAppliesToMap(a.sizing?.applicableMapTypes,mapType)} onClick={() => { void highlight(a.id) }} onDoubleClick={() => { if (!material) void pick(a.id) }}><AssetThumbnail id={a.id} source={source} /><span>{a.name}</span><small>{a.naturalWidth} × {a.naturalHeight}</small></button>)}</div>
  async function pick(id: string) {
    if (busy || !assets.some((a) => a.id === id)) return
    setBusy(true); setError('')
    try { if (material) { applyMaterial(); useEditorStore.setState(s=>({recentAssets:[{id,source,kind},...s.recentAssets.filter(a=>a.id!==id||a.source!==source)].slice(0,10)})) } else await chooseAsset(id, source, kind, replacementId) } catch (cause) { setError((cause as Error).message) } finally { setBusy(false) }
  }
  return <Modal title={material ? 'Apply Material' : kind === 'stamp' ? 'Choose a stamp' : 'Choose a fill pattern'} busy={!material && busy} onClose={close} wide={!material} preview={material}>
    <button className={styles.close} title="Close picker" aria-label="Close picker" disabled={!material && busy} onClick={close}><Icon name="close" /></button>
    {material && <p>Preview on {preview.targets.length} editable Area(s). {useEditorStore.getState().selectedObjectIds.length-preview.targets.length} other selected object(s) skipped. Geometry, stroke and local Texture Brush paint stay unchanged. Existing pattern transforms are preserved; other fills start at scale 1.</p>}
    <fieldset disabled={busy}><label><input type="checkbox" checked={showAll} onChange={e=>{setShowAll(e.target.checked);setPage(0);setSelected('')}}/> Show assets for all map types</label><p className="muted">{showAll?'All map types':`Assets for ${mapTypeName(mapType)}`}</p><div className={styles.filters}><label>Search<input data-autofocus type="search" value={query} onChange={(e) => { setQuery(e.target.value);setPage(0); setSelected('') }} placeholder={kind === 'stamp' ? 'Find a stamp…' : 'Find a fill pattern…'} /></label><label>Category<select value={category} onChange={(e) => { setCategory(e.target.value);setPage(0); setSelected('') }}><option value="">All categories</option>{(source === 'library' ? library.categories : [{ id: 'project', name: 'Project assets' }]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
      {owned.some((a) => a.kind === kind) && <Tabs label="Asset source" value={source} items={[["library", 'Library'], ['project', 'Project assets']]} onChange={(value) => { setSource(value); setSelected(''); setCategory('') }} />}
      <p className="muted">{source === 'library' ? 'Reusable images stored locally on this computer.' : 'Embedded in this project. Choosing one does not import it into the library.'}</p>
      {library.error && source === 'library' && <p role="alert">{library.error} <button onClick={library.retry}>Retry</button></p>}
      <div className={styles.pickerScroll}>{recentItems.length > 0 && <section><h3>Recent</h3>{grid(recentItems)}</section>}<h3>{kind === 'stamp' ? 'Stamps' : 'Fill patterns'} <small>{assets.length}</small></h3>{grid(assets)}{!assets.length && <p className={styles.empty}>{library.loading && source === 'library' ? 'Loading assets…' : 'No matching assets. Import images in Asset library, or choose Project assets when available.'}</p>}</div>
      {source==='library'&&<div><button disabled={!page} onClick={()=>setPage(page-1)}>Previous</button><span> {library.total} results · Page {page+1} </span><button disabled={(page+1)*60>=library.total} onClick={()=>setPage(page+1)}>Next</button></div>}
    </fieldset>{error && <p role="alert">{error}</p>}<div className={styles.footer}><button onClick={close} disabled={!material && busy}>Cancel</button><button className="primary" disabled={!selected || busy || (material && !preview.asset)} onClick={() => { void pick(selected) }}>{busy ? 'Loading image…' : material ? 'Apply' : 'Choose asset'}</button></div>
  </Modal>
}
