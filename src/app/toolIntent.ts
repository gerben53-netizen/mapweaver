import { toolNames } from './editorUx'
import type { EditorTool } from '../domain/mapCapabilities'
import type { AreaRole } from '../domain/landAreas'
import type { RouteKind } from '../domain/routes'

export const toolDescriptions: Record<string, string> = {
  Select: 'Select, move or edit existing objects (V)',
  Measure: 'Measure distances using the map scale',
  'Place asset': 'Choose a stamp to place from the asset library',
  Scatter: 'Distribute repeated stamps with an editable brush recipe',
  Ceiling: 'Draw a roof footprint that blocks direct sky illumination only',
  Area: 'Draw a new area with an initial color or material',
  Path: 'Draw a line; choose Generic, River, Road or Border where supported',
  Wall: 'Draw structural walls with thickness and material',
  Opening: 'Insert a door or window into an existing wall',
  'Texture Brush': 'Paint local material variation onto the battlemap',
  'Land / Water': 'Add or remove landmass geometry and shape coastlines',
  'Terrain Region': 'Draw a semantic biome or terrain region',
  'Terrain Brush': 'Paint visual terrain detail without changing biome data',
  'Water Depth': 'Paint or restore shallow and deep water shading',
  'Place Marker': 'Place a settlement, landmark or map marker',
}

export function activeToolName(tool: EditorTool, role: AreaRole, route: RouteKind) {
  if (tool === 'area') return role === 'terrain-region' ? 'Terrain Region' : role === 'landmass' ? 'Landmass · Edit geography' : 'Area'
  if (tool === 'route') return `Path · ${route[0].toUpperCase()}${route.slice(1)}`
  return toolNames[tool] || tool
}
