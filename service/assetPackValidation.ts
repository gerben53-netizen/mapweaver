import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Storage } from './storage'
import { commitPack, previewPack } from './libraryPacks'

function removeValidationDirectory(root: string, parent: string) {
  if (path.dirname(root) !== parent || !path.basename(root).startsWith('mapweaver-pack-validation-')) throw Error('Unsafe validation cleanup path.')
  rmSync(root, { recursive: true, force: true })
}

/** Exercise the real preview and transactional review in an isolated, disposable library. */
export async function validateAssetPack(bytes: Buffer) {
  const parent = realpathSync(os.tmpdir())
  const root = mkdtempSync(path.join(parent, 'mapweaver-pack-validation-'))
  let storage: Storage | undefined
  try {
    storage = new Storage(root)
    const preview = await previewPack(storage, bytes)
    const errors = [...preview.errors]
    if (!errors.length) {
      try {
        commitPack(storage, { token: preview.token, revision: preview.revision, duplicate: 'keep', createCategories: true, useExistingCategories: true }, true)
      } catch (error) { errors.push((error as Error).message) }
    }
    return {
      valid: errors.length === 0,
      assets: preview.entries.length,
      warnings: preview.warnings,
      errors,
      entries: preview.entries.map(({ file, type, width, height }) => ({ file, type, width, height })),
    }
  } finally {
    storage?.close()
    // Only remove the directory created by this invocation, never a configured user library.
    removeValidationDirectory(root, parent)
  }
}
