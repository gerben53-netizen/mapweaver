vi.mock('../world/themePreview',()=>({themePreview:vi.fn(()=>new Promise(()=>{}))}))
import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorldThemePicker } from './WorldThemePicker'
import { useProjectStore } from '../store/projectStore'
import { applyTheme } from '../projects/applyTheme'
vi.mock('../projects/applyTheme', () => ({ applyTheme: vi.fn() }))
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  useProjectStore.setState({ map: { ...useProjectStore.getState().map, mapType: 'world-map', theme: undefined } })
  vi.mocked(applyTheme).mockReset()
})
it('offers five preview cards and keeps selection/cancel separate from application', () => {
  const before = useProjectStore.getState().map
  render(<WorldThemePicker/>); expect(screen.getByText('Custom')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Choose visual theme' })); expect(screen.getAllByRole('radio')).toHaveLength(7)
  fireEvent.click(screen.getByRole('radio', { name: /Dark Fantasy/ })); expect(applyTheme).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(useProjectStore.getState().map).toBe(before)
})
it('submits explicit reset/adoption choices and leaves errors visible for retry', async () => {
  vi.mocked(applyTheme).mockRejectedValue(Error('Map changed; apply again.'))
  render(<WorldThemePicker/>); fireEvent.click(screen.getByRole('button', { name: 'Choose visual theme' }))
  fireEvent.click(screen.getByRole('radio', { name: /Classic Parchment/ })); fireEvent.click(screen.getByLabelText('Reset visual properties to theme defaults'))
  fireEvent.click(screen.getByLabelText('Apply theme to existing labels and map elements')); fireEvent.click(screen.getByLabelText('Replace semantic stamps with compatible library assets'))
  fireEvent.click(screen.getByRole('button', { name: 'Apply theme' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Map changed'))
  expect(applyTheme).toHaveBeenCalledWith('world.classicParchment', { reset: true, elements: true, assets: false }); expect(screen.getByRole('button', { name: 'Apply theme' })).toBeEnabled()
})
it('does not expose world styles on battlemaps', () => {
  useProjectStore.setState({ map: { ...useProjectStore.getState().map, mapType: 'battlemap' } }); render(<WorldThemePicker/>); expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
