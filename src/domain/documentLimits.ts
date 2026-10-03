// Persisted limits shared by editing boundaries and the portable format parser.
export const DOCUMENT_LIMITS = { geometry: 1e9, objects: 10000, layers: 256, assets: 512 } as const
export const inGeometryRange = (value: number) => Number.isFinite(value) && Math.abs(value) <= DOCUMENT_LIMITS.geometry
// Reserve 1 MiB of the format's JSON budget for asset manifests and project metadata.
export const EDITABLE_JSON_BYTES = 3 * 1024 * 1024
