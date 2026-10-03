import type { ProjectFile, AssetManifest } from './types'
export interface RecoveryRow { id: string; name: string; modifiedAt: string; savedAt: string; downloadedAt: string | null; document: ProjectFile }
export interface RecoveryAssetRow { projectId: string; assetId: string; manifest: AssetManifest; blob: Blob }
