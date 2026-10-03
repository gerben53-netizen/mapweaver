export const MAX_FILE_BYTES = 20 * 1024 * 1024
export const MAX_IMPORT_FILES = 50
export const MAX_IMAGE_EDGE = 8192
export const MAX_IMAGE_PIXELS = 24_000_000
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',')
export function validateFile(file: Pick<File, 'type' | 'size'>) {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.')
  if (file.size === 0) throw new Error('The file is empty.')
  if (file.size > MAX_FILE_BYTES) throw new Error('The image exceeds the 20 MiB file limit.')
}
export function validateDimensions(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error('The image has invalid dimensions.')
  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS) throw new Error('The image exceeds 8,192 pixels per side or 24 million pixels in total.')
}
export function validateBatch(count: number) {
  if (count > MAX_IMPORT_FILES) throw new Error('Choose at most 50 images per import.')
}
