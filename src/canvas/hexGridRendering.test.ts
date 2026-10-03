import { expect,it,vi } from 'vitest'
import type { Context } from 'konva/lib/Context'
import { drawGrid } from './drawGrid'
import { toolIntentFixture } from '../../tests/fixtures/toolIntent'
it.each(['hex-flat','hex-pointy'] as const)('draws %s with one clipped stroke and screen width at several zooms',type=>{
 for(const zoom of [.5,1,4]){
  const context={save:vi.fn(),restore:vi.fn(),beginPath:vi.fn(),rect:vi.fn(),clip:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),setAttr:vi.fn(),stroke:vi.fn()}
  const map=toolIntentFixture().map;map.grid={...map.grid,type,cellSize:80,offsetX:31,offsetY:-42}
  drawGrid(context as unknown as Context,map,zoom)
  expect(context.clip).toHaveBeenCalledOnce();expect(context.stroke).toHaveBeenCalledOnce();expect(context.setAttr).toHaveBeenCalledWith('lineWidth',1/zoom);expect(context.moveTo.mock.calls.length).toBeGreaterThan(100)
 }
})
