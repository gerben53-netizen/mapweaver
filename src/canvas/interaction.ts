// A gesture owns completion and rollback; no Konva nodes enter the history layer.
let active: { finish: () => void; cancel: () => void } | null = null
export function objectGestureActive() { return active !== null }
export function finishObjectGesture() { const previous = active; active = null; previous?.finish() }
export function cancelObjectGesture() { const previous = active; active = null; previous?.cancel() }
export function ownObjectGesture(finish: () => void, cancel = finish) {
  finishObjectGesture()
  const owner = { finish, cancel }; active = owner
  return () => { if (active === owner) active = null }
}
