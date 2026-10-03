import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ContinuousWallFields } from './ContinuousWallFields'
import { continuousDefinition } from '../domain/continuousWall.fixture'
import { materialStyle } from '../domain/wallSets'
import { SIMPLE_WALL } from '../domain/walls'
it('shows only declared parameters, applies physical width/presets and randomizes an explicit seed',()=>{
  const value=materialStyle({definition:continuousDefinition(),assetId:'atlas'},{...SIMPLE_WALL,wall:{...SIMPLE_WALL.wall,unit:'ft',pixelsPerUnit:10}}),onChange=vi.fn()
  render(<ContinuousWallFields value={value} onChange={onChange}/>);
  expect(screen.getByLabelText('Wall organic')).toHaveValue('50');expect(screen.queryByLabelText('Wall growth')).toBeNull()
  fireEvent.change(screen.getByLabelText('Wall organic'),{target:{value:'80'}});expect(onChange.mock.lastCall?.[0].wall.material.organic).toBe(.8)
  fireEvent.change(screen.getByLabelText('Wall width preset'),{target:{value:'heavy'}});expect(onChange.mock.lastCall?.[0].strokeWidth).toBe(60)
  fireEvent.change(screen.getByLabelText('Material preset'),{target:{value:'0'}});expect(onChange.mock.lastCall?.[0].wall.material.organic).toBe(0)
  fireEvent.click(screen.getByRole('button',{name:'Randomize variation'}));expect(Number.isInteger(onChange.mock.lastCall?.[0].wall.material.seed)).toBe(true)
  expect(onChange.mock.lastCall?.[0].wall.material.seed).not.toBe(value.wall.material?.seed)
})
