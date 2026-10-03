export interface Point { x: number; y: number }
export interface Size { width: number; height: number }
export interface Viewport { zoom: number; pan: Point }

export const MIN_ZOOM = 0.01
export const MAX_ZOOM = 4
export const FIT_PADDING = 48

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function screenToMap(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.pan.x) / viewport.zoom,
    y: (point.y - viewport.pan.y) / viewport.zoom,
  }
}

export function mapToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.zoom + viewport.pan.x,
    y: point.y * viewport.zoom + viewport.pan.y,
  }
}

export function zoomAtPoint(viewport: Viewport, point: Point, zoom: number): Viewport {
  const anchor = screenToMap(point, viewport)
  const boundedZoom = clampZoom(zoom)
  return {
    zoom: boundedZoom,
    pan: { x: point.x - anchor.x * boundedZoom, y: point.y - anchor.y * boundedZoom },
  }
}

export function fitToMap(map: Size, canvas: Size): Viewport {
  const zoom = clampZoom(Math.min(
    Math.max(1, canvas.width - FIT_PADDING * 2) / map.width,
    Math.max(1, canvas.height - FIT_PADDING * 2) / map.height,
  ))
  return {
    zoom,
    pan: { x: (canvas.width - map.width * zoom) / 2, y: (canvas.height - map.height * zoom) / 2 },
  }
}

/** Wheel deltaMode: pixels (0), lines (1), or pages (2). */
export function wheelZoom(zoom: number, delta: number, mode: number, height: number): number {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? height : 1)
  return clampZoom(zoom * Math.exp(-Math.max(-250, Math.min(250, pixels)) * 0.002))
}

