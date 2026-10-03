import { DOCUMENT_LIMITS } from '../domain/documentLimits'
export const PROJECT_LIMITS = { archive: 128 * 1024 * 1024, unpacked: 128 * 1024 * 1024, json: 4 * 1024 * 1024, image: 20 * 1024 * 1024, preview: 1024 * 1024, previewEdge: 512, entries: 514, ...DOCUMENT_LIMITS, pixels: 96000000, ratio: 1000, recents: 5, debounce: 1000 } as const
