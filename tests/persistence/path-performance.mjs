import { createServer } from 'vite'
import fs from 'node:fs/promises'
const server = await createServer({ server: { middlewareMode: true } })
try {
  const m = await server.ssrLoadModule('/src/domain/paths.ts'),
    t = (fn) => {
      const start = performance.now()
      const value = fn()
      return { ms: performance.now() - start, value }
    }
  const makeNodes = (n, offset = 0) =>
    Array.from({ length: n }, (_, i) => ({
      id: String(i),
      x: 30 + i * 25,
      y: 100 + offset + Math.sin(i) * 40,
      mode: 'smooth',
      in: { x: -10, y: -10 },
      out: { x: 10, y: 10 },
    }))
  const hundred = t(() =>
    Array.from({ length: 100 }, (_, i) => m.createPath(makeNodes(20, i))),
  )
  const cached = t(() => {
    for (let pass = 0; pass < 100; pass++)
      for (const p of hundred.value) m.pathGeometry(p)
  })
  const maximum = t(() => m.createPath(makeNodes(m.PATH_LIMITS.nodes)))
  const long = m.createPath(
    [
      { id: 'a', x: 0, y: 100, mode: 'smooth', out: { x: 2000, y: 3000 } },
      { id: 'b', x: 16000, y: 100, mode: 'smooth', in: { x: -2000, y: 3000 } },
    ],
    false,
    12,
    { kind: 'texture', assetId: 'texture', scale: 1, spacing: 12, offset: 0 },
  )
  const texture = t(() => m.texturePositions(long))
  const report = {
    hundredPaths20CurvedNodesMs: hundred.ms,
    cached10000GeometryReadsMs: cached.ms,
    max256NodesMs: maximum.ms,
    maxSamples: m.pathGeometry(maximum.value).samples.length,
    longCurveLength: m.pathGeometry(long).length,
    textureInstances: texture.value.length,
    textureFirstLayoutMs: texture.ms,
    limits: m.PATH_LIMITS,
  }
  await fs.mkdir('.sprint15.local', { recursive: true })
  await fs.writeFile(
    '.sprint15.local/performance.json',
    JSON.stringify(report, null, 2),
  )
  console.log(report)
} finally {
  await server.close()
}
