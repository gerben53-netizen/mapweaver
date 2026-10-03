// Session resource ownership, deliberately separate from document snapshots.
const backgrounds = new Map<string, Blob>()
export function keepBackground(id: string, blob: Blob) { backgrounds.set(id, blob) }
export async function backgroundBlob(id: string): Promise<Blob> {
  const blob = backgrounds.get(id)
  if (!blob) throw new Error('The background image is unavailable.')
  return blob
}
export function retainBackgrounds(ids: Set<string>) {
  for (const id of backgrounds.keys()) if (!ids.has(id)) backgrounds.delete(id)
}
