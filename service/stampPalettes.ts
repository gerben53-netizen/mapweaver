import { emptyStampPalettes, validateStampPalettes } from '../src/domain/stampPalettes'
import { campaign } from './campaigns'
import { Storage, StorageError } from './storage'
export function readStampPalettes(store: Storage, campaignId: string) {
  campaign(store, campaignId)
  const row = store.db.prepare('SELECT value FROM settings WHERE key=?').get(`stampPalettes:${campaignId}`) as { value: string } | undefined
  return row ? validateStampPalettes(JSON.parse(row.value)) : emptyStampPalettes()
}
export function writeStampPalettes(store: Storage, campaignId: string, input: unknown) {
  let value
  try { value = validateStampPalettes(input) } catch (e) { throw new StorageError('INVALID_PALETTE', (e as Error).message) }
  const current = readStampPalettes(store, campaignId)
  if (value.revision !== current.revision) throw new StorageError('PALETTE_CONFLICT', 'Palettes changed in another window. Reload palettes and try again.', 409)
  const next = { ...value, revision: current.revision + 1 }
  store.db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(`stampPalettes:${campaignId}`, JSON.stringify(next))
  return next
}
