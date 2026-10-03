import { expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { Tabs } from './Tabs'
import { SaveStatus } from './SaveStatus'
import { readFileSync } from 'node:fs'
const css = readFileSync('src/styles/global.css', 'utf-8')

const tokens = Object.fromEntries([...css.matchAll(/(--color-[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))
function color(name: string): string {
  const value = tokens[`--color-${name}`]
  return value.startsWith('var(') ? color(value.slice(12, -1)) : value
}
function luminance(name: string) {
  const rgb = color(name).slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
}
function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
}
it.each([
  ['text', 'panel'], ['muted', 'toolbar'], ['muted', 'surface'],
  ['active-text', 'selected'], ['active-text', 'selected-hover'],
  ['active-text', 'primary'], ['active-text', 'primary-hover'],
  ['danger', 'danger-subtle'], ['danger', 'surface'], ['disabled', 'panel'],
])('%s remains readable on %s', (foreground, background) => {
  expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
})
it('keeps focus visible on active, hover and panel surfaces and selection different from hover', () => {
  for (const surface of ['selected', 'selected-hover', 'hover', 'panel', 'surface']) expect(contrast('focus', surface)).toBeGreaterThanOrEqual(3)
  expect(color('selected')).not.toBe(color('hover'))
  expect(color('selected-hover')).not.toBe(color('hover'))
})
it.each(['Workspace', 'Inspector'])('%s tabs keep selected and keyboard focus synchronized', label => {
  function Example() {
    const [value, setValue] = useState('first')
    return <Tabs label={label} value={value} onChange={setValue} items={label === 'Workspace' ? [['first', 'Map editor'], ['second', 'Asset library']] : [['first', 'Layers'], ['second', 'Properties']]}/>
  }
  render(<Example/>)
  const tabs = screen.getAllByRole('tab')
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
  expect(tabs[0]).toHaveAttribute('aria-selected', 'false')
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
  expect(tabs[1]).toHaveFocus()
})
it.each([
  ['saved', 'Saved'], ['saving', 'Saving…'], ['error', 'Save failed'], ['conflict', 'Save conflict'], ['dirty', 'Unsaved changes'],
] as const)('exposes the %s save variant without losing its accessible message', (saveStatus, message) => {
  render(<SaveStatus saveStatus={saveStatus} recoveryDirty={false} savedAt="2026-09-24T12:00:00Z"/>)
  expect(screen.getByRole('status')).toHaveTextContent(message)
  expect(screen.getByRole('status')).toHaveAttribute('data-save-state', saveStatus)
  expect(screen.getByRole('status')).toHaveAttribute('title', expect.stringContaining('Autosave is on.'))
})

it.each(['sidebar','inspector','palette','control-group'])('warm %s surfaces preserve text and focus contrast',surface=>{
 expect(contrast('text',surface)).toBeGreaterThanOrEqual(4.5)
 expect(contrast('muted',surface)).toBeGreaterThanOrEqual(4.5)
 expect(contrast('focus',surface)).toBeGreaterThanOrEqual(3)
})
it('cartographic brass stays distinct from keyboard focus and readable as an active edge',()=>{
 expect(color('brass')).not.toBe(color('focus'))
 for(const surface of ['selected','sidebar','panel'])expect(contrast('brass',surface)).toBeGreaterThanOrEqual(3)
 expect(css).toContain('prefers-reduced-motion: reduce')
 expect(css).toContain('transition:none')
})
