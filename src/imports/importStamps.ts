import type { StampAsset, AssetKind } from '../domain/models'
import { contentHash, errorMessage, readImage } from './readImage'
import { validateBatch } from './limits'

export interface ImportReport { added: number; skipped: { name: string; reason: string }[] }
export async function importStamps(files: File[], categoryId: string, repository: { add(asset:StampAsset, blob:Blob, thumbnail?:Blob, originalName?:string):Promise<boolean> }, progress: (done: number) => void = () => {}, read = readImage, hash = contentHash, kind: AssetKind = 'stamp'): Promise<ImportReport> {
  validateBatch(files.length)
  const report: ImportReport = { added: 0, skipped: [] }
  for (const [index, file] of files.entries()) {
    try {
      const image = await read(file)
      const asset: StampAsset = { kind, id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, '') || 'Untitled stamp', mimeType: image.mimeType, naturalWidth: image.width, naturalHeight: image.height, categoryId, createdAt: new Date().toISOString(), contentHash: await hash(image.blob) }
      if (await repository.add(asset, image.blob, image.thumbnail, file.name)) report.added++
      else report.skipped.push({ name: file.name, reason: 'This exact image is already in the library.' })
    } catch (error) { report.skipped.push({ name: file.name, reason: errorMessage(error) }) }
    progress(index + 1)
  }
  return report
}

