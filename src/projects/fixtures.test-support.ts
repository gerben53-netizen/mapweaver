import { encodedDimensions, contentHash } from '../imports/readImage'
import { defaultMapStyle } from '../domain/mapSettings'
import { createPattern } from '../domain/patterns'
import type { PreparedProject, ProjectFile } from './types'
export async function validateFixture(file: File) {
  const dimensions = encodedDimensions(new Uint8Array(await file.arrayBuffer()), file.type)
  return { blob: file, mimeType: file.type, ...dimensions }
}
export async function fixture(): Promise<PreparedProject> {
  const blob = new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))], { type: 'image/png' })
  const manifest = { id: 'shared', fileName: 'floor.png', mimeType: 'image/png', width: 1, height: 1, hash: await contentHash(blob), path: 'assets/shared.png' }
  const pattern = { ...createPattern('shared', { x: 0, y: 0, width: 100, height: 80 }), id: 'pattern' }
  const document: ProjectFile = { formatVersion: 1, id: 'project', name: 'Test map', createdAt: '2026-09-23T00:00:00.000Z', modifiedAt: '2026-09-23T00:00:00.000Z', map: { width: 600, height: 400, ...defaultMapStyle(), background: { id: 'shared', name: 'floor.png', width: 1, height: 1 } }, objects: [{ id: 'stamp', assetId: 'shared', kind: 'stamp', x: 40, y: 50, width: 10, height: 10, rotation: 0, scaleX: 1, scaleY: -1, opacity: .5 }, pattern], layers: [{ id: 'objects', name: 'Objects', visible: true, locked: false, objectIds: ['stamp', 'pattern'] }], assets: [manifest] }
  return { document, assets: new Map([['shared', { manifest, blob }]]) }
}
