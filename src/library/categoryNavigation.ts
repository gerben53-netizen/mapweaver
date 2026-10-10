import { create } from 'zustand'
import { normalizeLibraryText } from '../domain/library'
import type { LibraryCategory } from '../domain/library'
import { readMapTypePreference, rememberMapType, type LibraryMapType } from './mapTypeFilter'

/** An index per response, shared by tree, breadcrumbs and category search. */
export function categoryIndex(categories: LibraryCategory[]) {
  const byId = new Map(categories.map(c => [c.id, c]))
  const children = new Map<string | null, LibraryCategory[]>()
  const paths = new Map<string, LibraryCategory[]>()
  for (const c of categories) {
    if (c.id === 'uncategorized') continue
    const siblings = children.get(c.parentId) || []
    siblings.push(c); children.set(c.parentId, siblings)
    const path: LibraryCategory[] = [], seen = new Set<string>()
    let cursor: LibraryCategory | undefined = c
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id); path.unshift(cursor)
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
    }
    paths.set(c.id, path)
  }
  return { byId, children, paths }
}
export type CategoryIndex = ReturnType<typeof categoryIndex>
export const categoryHasAssets = (c: LibraryCategory) => (c.libraryTotal ?? c.total ?? 0) > 0
export function focusedPath(index: CategoryIndex, id: string) {
  return (index.paths.get(id) || []).map(c => c.id)
}
export function searchCategories(index: CategoryIndex, query: string, showEmpty: boolean) {
  const terms = normalizeLibraryText(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return [...index.paths.entries()].filter(([, path]) => {
    const text = normalizeLibraryText(path.map(c => c.name).join(' '))
    return (showEmpty || categoryHasAssets(path.at(-1)!)) && terms.every(t => text.includes(t))
  }).map(([id]) => index.byId.get(id)!)
}

// Session-only navigation; never stored in a map or library metadata. Keeps context
// across workspace switches/remounts without carrying IDs into another service.
export const useLibraryNavigation = create(() => ({
  category: '', favorite: false, query: '', mapType: readMapTypePreference(), context: '',
  expanded: [] as string[], showEmpty: false, recent: [] as string[],
}))
/** A new map context wins over preferences; navigating the same context keeps choices. */
export function initializeLibraryContext(context: string, mapType?: LibraryMapType) {
  if (useLibraryNavigation.getState().context === context) return false
  useLibraryNavigation.setState({ context, mapType: mapType ?? readMapTypePreference() })
  return true
}
export function chooseLibraryMapType(mapType: LibraryMapType) {
  rememberMapType(mapType)
  useLibraryNavigation.setState({ mapType })
}
