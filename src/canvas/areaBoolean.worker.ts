import { combineGeometry } from '../domain/areaBoolean'
self.onmessage = (event: MessageEvent<Parameters<typeof combineGeometry>>) => {
  try {
    self.postMessage({ geometry: combineGeometry(...event.data) })
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : 'Unable to combine areas.',
    })
  }
}
