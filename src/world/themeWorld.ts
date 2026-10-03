import type { WorldResult } from './model'
import { styleWorld } from './styleWorld'
import { applyWorldTheme } from '../domain/applyWorldTheme'
import { worldTheme } from '../domain/worldThemes'
import type { WorldScatterAsset } from './scatterModel'

/** Restrict fallback to the selected visual family, never silently mix other themes. */
export function themeWorldAssets(assets: WorldScatterAsset[], themeId: string) {
  const theme = worldTheme(themeId)
  return theme ? assets.filter(a => a.generator.themes.includes(theme.assetTheme)) : assets
}
export function themeWorld(result: WorldResult, themeId: string): WorldResult {
  if (!worldTheme(themeId)) return result
  const styled = styleWorld(result)
  const { snapshot } = applyWorldTheme(styled, themeId, { reset: true, elements: true, assets: false })
  return { ...result, map: snapshot.map, objects: snapshot.objects }
}
