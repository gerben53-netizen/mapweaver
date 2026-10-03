import { expect, it } from 'vitest'
import { installProjectAssets, captureClipboardAssets, restoreClipboardAssets, resolveAsset, assetHasKind } from './assets'
import type { ProjectAsset } from './types'
it('retains clipboard image bytes across project changes and remaps conflicting IDs', async () => {
  const make = (hash: string, text: string): ProjectAsset => ({ blob: new Blob([text], { type: 'image/png' }), manifest: { id: 'shared', kind: 'stamp', fileName: 'tree.png', mimeType: 'image/png', width: 1, height: 1, hash: hash.repeat(64), path: 'assets/shared.png' } })
  installProjectAssets(new Map([['shared', make('a', 'original')]]))
  captureClipboardAssets(['shared'])
  installProjectAssets(new Map([['shared', make('b', 'destination')]]))
  const id = restoreClipboardAssets().get('shared')!
  expect(id).not.toBe('shared'); expect(assetHasKind(id, 'stamp')).toBe(true)
  expect(await (await resolveAsset(id)).blob.text()).toBe('original')
  expect(await (await resolveAsset('shared')).blob.text()).toBe('destination')
  installProjectAssets(new Map())
})
