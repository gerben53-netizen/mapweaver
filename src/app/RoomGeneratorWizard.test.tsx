import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RoomGeneratorAction } from './RoomGeneratorWizard'
import { useProjectStore as project } from '../store/projectStore'
import { defaultMapStyle } from '../domain/mapSettings'
import { roomPreview } from './roomPreview'
vi.mock('./roomPreview', () => ({ roomPreview: vi.fn(async () => 'data:image/png;base64,preview') }))
vi.mock('../library/useLibrary', () => ({ useLibrary: () => ({ assets: [], categories: [], error: '', loading: false, total: 0, retry: vi.fn() }) }))
vi.mock('../storage/api', () => ({ api: vi.fn(async () => []) }))
beforeEach(() => { HTMLDialogElement.prototype.showModal = function () { this.open = true }; HTMLDialogElement.prototype.close = function () { this.open = false }; project.setState({ map: { ...defaultMapStyle(), width: 2000, height: 2000, background: null }, objects: [] }) })
it('offers entry only on maps with the centralized rooms capability', () => {
  const view = render(<RoomGeneratorAction />); expect(screen.getByRole('button', { name: 'Generate Room…' })).toBeInTheDocument()
  for (const mapType of ['world-map', 'regional-map'] as const) { project.setState(s => ({ map: { ...s.map, mapType } })); view.rerender(<RoomGeneratorAction />); expect(screen.queryByRole('button', { name: 'Generate Room…' })).toBeNull() }
})
it('previews changes and new seeds without adding objects; cancellation leaves the document intact', async () => {
  const before = project.getState(); render(<RoomGeneratorAction />); fireEvent.click(screen.getByRole('button', { name: 'Generate Room…' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create Room' })).toBeEnabled())
  const seed = screen.getByLabelText('Seed') as HTMLInputElement, previous = seed.value
  fireEvent.click(screen.getByRole('button', { name: 'Regenerate' })); expect(seed.value).not.toBe(previous)
  fireEvent.change(screen.getByLabelText('Shape'), { target: { value: 'oval' } }); fireEvent.change(screen.getByLabelText('Width (cells)'), { target: { value: '10' } })
  await waitFor(() => expect(vi.mocked(roomPreview).mock.calls.at(-1)?.[1]).toMatchObject({ shape: 'oval', width: 10, seed: Number(seed.value) }))
  expect(project.getState()).toBe(before); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(screen.queryByRole('dialog')).toBeNull(); expect(project.getState()).toBe(before)
})
it('disables creation for invalid sizes and unsafe door counts with an explanation', async () => {
  render(<RoomGeneratorAction />); fireEvent.click(screen.getByRole('button', { name: 'Generate Room…' }))
  fireEvent.change(screen.getByLabelText('Width (cells)'), { target: { value: '0' } }); expect(screen.getByRole('button', { name: 'Create Room' })).toBeDisabled(); expect(screen.getByRole('status')).toHaveTextContent('Room interior')
  fireEvent.change(screen.getByLabelText('Width (cells)'), { target: { value: '1.2' } }); fireEvent.change(screen.getByLabelText('Height (cells)'), { target: { value: '1.2' } }); fireEvent.change(screen.getByLabelText('Door width (cells)'), { target: { value: '1' } }); expect(screen.getByRole('status')).toHaveTextContent('doors fit safely')
})


it('preset selection resets logical thickness; manual override reaches only the temporary recipe', async () => {
  render(<RoomGeneratorAction />); fireEvent.click(screen.getByRole('button', { name: 'Generate Room…' }))
  fireEvent.change(screen.getByLabelText('Walls'), { target: { value: 'living-wood' } })
  expect(screen.getByLabelText('Wall thickness')).toHaveValue(.4)
  fireEvent.change(screen.getByLabelText('Wall thickness'), { target: { value: '1' } })
  await waitFor(() => expect(vi.mocked(roomPreview).mock.calls.at(-1)?.[1].walls.strokeWidth).toBe(50))
  fireEvent.change(screen.getByLabelText('Walls'), { target: { value: 'timber' } })
  expect(screen.getByLabelText('Wall thickness')).toHaveValue(.2)
})
