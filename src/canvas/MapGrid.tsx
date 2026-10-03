import { memo } from 'react'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import type { MapDocument } from '../domain/models'
import { drawGrid } from './drawGrid'
export const MapGrid = memo(function MapGrid({ map, zoom }: { map: MapDocument; zoom: number }) {
  return <Shape listening={false} perfectDrawEnabled={false} sceneFunc={(context) => drawGrid(context, map, zoom)} />
})
