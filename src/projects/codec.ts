import { contentHash, readImage } from '../imports/readImage'
import type { ValidatedImage } from '../imports/readImage'
import { parseProject } from './format'
import { readZip, writeZip, strToU8 } from './zip'
import { PROJECT_LIMITS as L } from './limits'
import type { PreparedProject, ProjectAsset } from './types'
type ImageValidator = (file: File) => Promise<ValidatedImage>
export async function encodeProject(prepared: PreparedProject): Promise<Uint8Array> {
  const document = parseProject(prepared.document), json = strToU8(JSON.stringify(document))
  if (json.length > L.json) throw new Error('Project metadata exceeds 4 MiB.')
  const files: Record<string, Uint8Array> = { 'project.json': json }; let size = json.length
  for (const asset of document.assets) {
    const blob = (prepared.assets.get(asset.id) || [...prepared.assets.values()].find((a) => a.manifest.path === asset.path && a.manifest.hash === asset.hash))?.blob
    if (!blob || blob.size > L.image || await contentHash(blob) !== asset.hash) throw new Error(`Missing or changed asset: ${asset.fileName}`)
    if (!files[asset.path]) { files[asset.path] = new Uint8Array(await blob.arrayBuffer()); size += blob.size }
  }
  if (size > L.unpacked) throw new Error('Project exceeds 128 MiB.')
  return writeZip(files)
}
export async function decodeProject(bytes: Uint8Array, validate: ImageValidator = readImage): Promise<PreparedProject> {
  const files = await readZip(bytes)
  let value: unknown
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(files.get('project.json')!)) } catch { throw new Error('project.json is not valid JSON.') }
  const document = parseProject(value), assets = new Map<string, ProjectAsset>()
  if (files.size !== new Set(document.assets.map((a) => a.path)).size + 1 + Number(files.has('preview.png'))) throw new Error('ZIP contains unlisted or missing assets.')
  const decoded = new Map<string, ProjectAsset>()
  for (const manifest of document.assets) {
    const existing = decoded.get(manifest.path)
    if (existing) { assets.set(manifest.id, { ...existing, manifest }); continue }
    const bytes = files.get(manifest.path)
    if (!bytes) throw new Error(`Missing asset: ${manifest.fileName}`)
    const blob = new Blob([new Uint8Array(bytes)], { type: manifest.mimeType })
    if (await contentHash(blob) !== manifest.hash) throw new Error(`Image hash mismatch: ${manifest.fileName}`)
    const image = await validate(new File([blob], manifest.fileName, { type: manifest.mimeType }))
    if (image.width !== manifest.width || image.height !== manifest.height) throw new Error(`Image dimensions mismatch: ${manifest.fileName}`)
    const asset = { manifest, blob, thumbnail: image.thumbnail }
    decoded.set(manifest.path, asset); assets.set(manifest.id, asset)
  }
  if (files.has('preview.png')) {
    const image = await validate(new File([new Uint8Array(files.get('preview.png')!)], 'preview.png', { type: 'image/png' }))
    if (Math.max(image.width, image.height) > L.previewEdge) throw new Error('Preview exceeds 512 pixels.')
  }
  return { document, assets }
}
export function downloadName(name: string) {
  let safe = [...name].map((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? '-' : c).join('').replace(/[<>:"/\\|?*]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 100)
  if (!safe || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) safe = 'Mapweaver-project'
  return `${safe}.mapweaver`
}


