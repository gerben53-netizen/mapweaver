import { uploadAsset } from '../storage/api'
import { registerResource, useAssetContext } from '../projects/assets'
import { finishObjectGesture } from '../canvas/interaction'
import { contentHash, readImage } from './readImage'
import { useProjectStore } from '../store/projectStore'
import { keepBackground } from '../images/backgroundAssets'
export { backgroundBlob } from '../images/backgroundAssets'
export async function importBackground(file: File, confirm: () => boolean, read = readImage): Promise<boolean> {
  const generation = useAssetContext.getState().generation
  const image = await read(file), hash = await contentHash(image.blob)
  if (generation !== useAssetContext.getState().generation) throw new Error('The project changed while reading the background. Import it again.')
  if (useProjectStore.getState().map.background && !confirm()) return false
  finishObjectGesture()
  const id = read === readImage ? (await uploadAsset(image.blob, 'background', file.name.slice(0,120), file.name)).asset.id : crypto.randomUUID()
  if (generation !== useAssetContext.getState().generation) throw new Error('The project changed during import. Choose the background again.')
  registerResource(id, hash, image.blob.size, image.width * image.height)
  keepBackground(id, image.blob)
  useProjectStore.getState().setBackground({ id, name: file.name, width: image.width, height: image.height })
  return true
}


