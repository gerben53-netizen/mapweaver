import { seededRandom } from '../domain/seededRandom'
const tiles = new Map<string, HTMLCanvasElement>()
/** Small, deterministic, seamless built-ins; ordinary CanvasPatterns, like imported fills. */
export function terrainTexture(kind: 'grain' | 'sand' | 'waves') {
  const cached = tiles.get(kind)
  if (cached) return cached
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
  const c = canvas.getContext('2d')!
  for (let i = 0; i < 1600; i++) {
    const x = seededRandom(712,i,0)*128, y = seededRandom(712,i,1)*128
    c.fillStyle = i % 2 ? '#ffffff' : '#15251d'
    c.globalAlpha = .08 + seededRandom(712,i,2)*.23
    c.fillRect(x,y,kind === 'sand' ? 3 : 1.5,1)
  }
  if (kind === 'waves') {
    c.globalAlpha = .65; c.strokeStyle = '#dfebe6'; c.lineWidth = .7
    for (let y = 8; y < 128; y += 16) {
      c.beginPath()
      for (let x = 0; x <= 128; x += 2) { const py = y + Math.sin(x*Math.PI/32 + y*Math.PI/64)*1.6; if (!x) c.moveTo(x,py); else c.lineTo(x,py) }
      c.stroke()
    }
  }
  tiles.set(kind,canvas); return canvas
}
