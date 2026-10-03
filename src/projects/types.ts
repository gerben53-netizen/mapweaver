import type { ProjectSnapshot } from '../store/history'
import type { AssetKind } from '../domain/models'
export interface ProjectInfo { id: string; name: string; createdAt: string; modifiedAt: string }
export interface AssetManifest { id: string; kind?: AssetKind; fileName: string; mimeType: string; width: number; height: number; hash: string; path: string }
export interface ProjectFile extends ProjectSnapshot, ProjectInfo { formatVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12; assets: AssetManifest[] }
export interface ProjectAsset { unavailable?: true; manifest: AssetManifest; blob: Blob; thumbnail?: Blob }
export interface PreparedProject { document: ProjectFile; assets: Map<string, ProjectAsset> }

