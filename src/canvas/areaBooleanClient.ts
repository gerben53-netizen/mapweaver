import type { AreaGeometry } from '../domain/models'
import { AREA_LIMITS } from '../domain/areas'
export function combineInWorker(
  operation: 'union' | 'subtract' | 'intersect',
  inputs: AreaGeometry[],
): Promise<AreaGeometry | null> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./areaBoolean.worker.ts', import.meta.url),
      { type: 'module' },
    )
    const done = () => {
      clearTimeout(timer)
      worker.terminate()
    }
    const timer = setTimeout(() => {
      done()
      reject(
        new Error(
          'Geometry calculation exceeded its time limit. Simplify the selection.',
        ),
      )
    }, AREA_LIMITS.timeoutMs)
    worker.onmessage = (event) => {
      done()
      if (event.data.error) reject(new Error(event.data.error))
      else resolve(event.data.geometry)
    }
    worker.onerror = () => {
      done()
      reject(
        new Error('Geometry calculation failed. Source areas were retained.'),
      )
    }
    worker.postMessage([operation, inputs])
  })
}
