import { useMemo } from 'react'
import type { CategoryIndex } from './categoryNavigation'
import { categoryHasAssets, searchCategories } from './categoryNavigation'
import styles from './CategoryBrowser.module.css'
interface Props {
  index: CategoryIndex; category: string; scopeName: string; total: number;
  query: string; showEmpty: boolean; recent: string[];
  onSelect: (id: string, jump?: boolean) => void; compact?: boolean
}
export function CategoryBrowser(p: Props) {
  const path = p.index.paths.get(p.category) || []
  const matches = useMemo(() => searchCategories(p.index, p.query, p.showEmpty), [p.index, p.query, p.showEmpty])
  const children = (p.index.children.get(p.category || null) || []).filter(c => p.showEmpty || categoryHasAssets(c))
  const fullPath = path.map(c => c.name).join(' › ')
  const recent = p.recent.map(id => p.index.byId.get(id)).filter(c => c && c.id !== p.category)
  return <section className={styles.context} aria-label="Category navigation">
    <div className={styles.header}><h2>{path.at(-1)?.name || p.scopeName}</h2><span>{p.total} assets</span>
      {!!path.length && <button onClick={() => p.onSelect(path.at(-2)?.id || '')}>Up</button>}
      {!!recent.length && <label className={styles.recent}>Recent locations<select value="" onChange={e => { if(e.target.value) p.onSelect(e.target.value, true) }}><option value="">Choose location…</option>{recent.map(c => c && <option key={c.id} value={c.id}>{p.index.paths.get(c.id)?.map(v => v.name).join(' › ')}</option>)}</select></label>}
    </div>
    <nav aria-label="Category breadcrumb" title={fullPath || p.scopeName} className={styles.breadcrumb}>
      <button onClick={() => p.onSelect('')} aria-current={!p.category && p.scopeName==='All assets' ? 'location' : undefined}>All assets</button>
      {path.map((c,i) => <span key={c.id}><span aria-hidden="true">›</span><button title={p.index.paths.get(c.id)?.map(v => v.name).join(' › ')} aria-current={i===path.length-1?'location':undefined} onClick={() => p.onSelect(c.id)}>{c.name}</button></span>)}
      {p.category==='uncategorized' && <span aria-current="location">› Uncategorized</span>}
    </nav>
    {!!matches.length && <div className={styles.matches} role="region" aria-label="Matching categories"><strong>Categories · {matches.length}</strong><div>{matches.map(c => <button key={c.id} onClick={() => p.onSelect(c.id,true)} title={p.index.paths.get(c.id)?.map(v => v.name).join(' › ')}><b>{c.name}</b>{' '}<small>{p.index.paths.get(c.id)?.slice(0,-1).map(v=>v.name).join(' › ') || 'Root category'}</small></button>)}</div></div>}
    {!p.compact && !!children.length && <div className={styles.children} role="region" aria-label="Subcategories">{children.map(c => <button key={c.id} title={`${c.name} · ${c.total ?? 0} assets including subcategories, with current filters`} onClick={() => p.onSelect(c.id)}><span aria-hidden="true">▱ </span>{c.name} <span className={styles.count}>{c.total ?? 0}</span></button>)}</div>}
  </section>
}
