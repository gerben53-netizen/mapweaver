import { paintGeographyFinish } from './drawGeographyFinish'
import type { MapDocument, MapObject } from '../domain/models'
import { WATER_STYLES } from '../domain/terrainStyles'
import { terrainTexture } from './terrainTexture'
export function paintWater(c: CanvasRenderingContext2D, map: MapDocument, objects: MapObject[] = []) {
  const water = map.water
  c.save(); c.fillStyle = water ? WATER_STYLES[water.style].deep : map.backgroundColor
  c.fillRect(0,0,map.width,map.height)
  if (water) {
    const preset = WATER_STYLES[water.style]
    const pattern = c.createPattern(terrainTexture('waves'),'repeat')!
    pattern.setTransform(new DOMMatrix().scale(water.patternScale))
    c.fillStyle = pattern; c.globalAlpha *= water.textureOpacity*preset.waves
    c.fillRect(0,0,map.width,map.height)
    c.globalAlpha = water.vignette
    const gradient = c.createRadialGradient(map.width/2,map.height/2,0,map.width/2,map.height/2,Math.hypot(map.width,map.height)/2)
    gradient.addColorStop(.35,'#00000000'); gradient.addColorStop(1,'#071c2c')
    c.fillStyle = gradient; c.fillRect(0,0,map.width,map.height)
  }
  paintGeographyFinish(c,map,objects,'ocean')
  c.restore()
}
