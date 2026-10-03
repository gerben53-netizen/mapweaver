import type { MapType } from './geography'
export const normalizeLibraryText = (s: string) => s.normalize('NFKC').trim().toLocaleLowerCase('en-US')
export const deriveTitle = (file: string) => file.split('/').at(-1)!.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim() || 'Untitled asset'
export const LIBRARY_LIMITS = { title: 120, description: 4000, tags: 30, tag: 80, depth: 8, dimension: 1e6, batch: 1000 }
export interface DefaultSize { mode: 'native' | 'grid' | 'world'; width?: number; height?: number; unit?: 'cells' | 'ft' | 'm'; lockAspectRatio: boolean }
export interface LibraryMetadata { description: string; tags: string[]; favorite: boolean; defaultSize: DefaultSize; applicableMapTypes: MapType[]; author: string; source: string; license: string }
export interface LibraryCategory { id: string; name: string; parentId: string | null; sortOrder: number; createdAt: string; modifiedAt: string; direct?: number; total?: number; libraryTotal?: number }
export interface LibraryCollection { id: string; name: string; description: string }
export function libraryText(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || [...value].some(c => c.charCodeAt(0) < 32 && (required || ![9,10].includes(c.charCodeAt(0))) || c.charCodeAt(0) === 127) || (required && !value.trim())) throw Error(`Enter ${required ? '1' : '0'}–${max} characters.`)
  return value.trim()
}
export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 30) throw Error('Use at most 30 tags.')
  return [...new Map(value.map(t => { const s = libraryText(t, 80, true); return [normalizeLibraryText(s), s] })).values()]
}
export function validateDefaultSize(value: unknown, aspect?: number): DefaultSize {
  if (!value || typeof value !== 'object') throw Error('Invalid default size.')
  const s = value as DefaultSize
  if (!['native', 'grid', 'world'].includes(s.mode) || typeof s.lockAspectRatio !== 'boolean') throw Error('Invalid size mode or aspect lock.')
  for (const n of [s.width, s.height]) if (n !== undefined && (!Number.isFinite(n) || n <= 0 || n > LIBRARY_LIMITS.dimension)) throw Error('Size must be greater than zero and at most 1,000,000.')
  if(s.unit!==undefined&&!['cells','ft','m'].includes(s.unit))throw Error('Unknown size unit.')
  if (s.mode === 'native') return { mode: 'native', lockAspectRatio: s.lockAspectRatio }
  if (s.mode === 'grid' ? s.unit !== 'cells' : !['ft', 'm'].includes(s.unit || '')) throw Error('Size unit does not match mode.')
  if (!s.width && !s.height || !s.lockAspectRatio && (!s.width || !s.height)) throw Error('Enter both dimensions, or one with aspect lock.')
  if (s.lockAspectRatio && aspect && s.width && s.height && Math.abs(s.width / s.height / aspect - 1) > .001) throw Error('Locked dimensions conflict with source aspect ratio (0.1% tolerance).')
  return { mode: s.mode, unit: s.unit, lockAspectRatio: s.lockAspectRatio, ...(s.width ? { width: s.width } : {}), ...(s.height ? { height: s.height } : {}) }
}
export function mapTypes(value: unknown): MapType[] {
  if (value === 'any' || Array.isArray(value) && value.length === 1 && value[0] === 'any') return []
  if (!Array.isArray(value) || value.length > 3 || value.some(t => !['battlemap', 'regional-map', 'world-map'].includes(t))) throw Error('Invalid applicable map types.')
  return [...new Set(value)] as MapType[]
}
export function categoryPath(categories: LibraryCategory[], id: string): LibraryCategory[] {
  const result: LibraryCategory[] = [], seen = new Set<string>()
  while (id && id !== 'uncategorized') { const c = categories.find(c => c.id === id); if (!c || seen.has(id)) throw Error('Invalid category tree.'); seen.add(id); result.unshift(c); id = c.parentId || '' }
  return result
}
export function validateCategoryTree(categories: LibraryCategory[]) {
  const keys = new Set<string>()
  for (const c of categories) {
    libraryText(c.name, 80, true)
    const key = (c.parentId || '') + '\0' + normalizeLibraryText(c.name)
    if (keys.has(key)) throw Error('A sibling category already has this name. Rename it explicitly.')
    keys.add(key)
    if (c.parentId === 'uncategorized' || categoryPath(categories, c.id).length > 8) throw Error('Categories support at most eight levels; Uncategorized cannot be a parent.')
  }
}
