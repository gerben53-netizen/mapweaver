import { createLayeredContent } from '../domain/layers'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ObjectProperties } from './ObjectProperties'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { libraryRepository } from '../storage/libraryRepository'
const object = { kind: 'stamp' as const, id: 'a', assetId: 'asset', x: 10, y: 20, width: 100, height: 200, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
beforeEach(() => {
  vi.spyOn(libraryRepository, 'getBlob').mockResolvedValue(new Blob(['image']))
  useProjectStore.setState(createLayeredContent([object])); useEditorStore.getState().select('a')
  vi.spyOn(libraryRepository, 'getAsset').mockResolvedValue({ id: 'asset', name: 'Tree', naturalWidth: 100, naturalHeight: 200, mimeType: 'image/png', categoryId: 'trees', contentHash: '', createdAt: '' })
})
it('edits numeric coordinates and rotation with keyboard and rejects invalid input', async () => {
  render(<ObjectProperties />)
  expect(await screen.findByText('Tree')).toBeInTheDocument()
  const x = screen.getByRole('spinbutton', { name: 'X' })
  fireEvent.change(x, { target: { value: '-25.5' } }); fireEvent.keyDown(x, { key: 'Enter' })
  expect(useProjectStore.getState().objects[0].x).toBe(-25.5)
  fireEvent.change(x, { target: { value: '' } }); fireEvent.blur(x)
  expect(x).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByRole('spinbutton', { name: 'X' })).toBe(x)
  expect(useProjectStore.getState().objects[0].x).toBe(-25.5)
  const rotation = screen.getByRole('spinbutton', { name: 'Rotation (degrees)' })
  fireEvent.change(rotation, { target: { value: '-15' } }); fireEvent.keyDown(rotation, { key: 'Enter' })
  expect(useProjectStore.getState().objects[0].rotation).toBe(345)
})
it('exposes reversible flip actions and a quiet no-selection state', async () => {
  render(<ObjectProperties />)
  await screen.findByText('Tree')
  for (const name of ['Flip horizontal', 'Flip vertical']) {
    const button = screen.getByRole('button', { name })
    fireEvent.click(button); expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button); expect(button).toHaveAttribute('aria-pressed', 'false')
  }
  expect(useProjectStore.getState().objects[0]).toEqual(object)
  act(() => useEditorStore.getState().select(null))
  expect(screen.getByText('Select an object to edit its properties.')).toBeInTheDocument()
})





