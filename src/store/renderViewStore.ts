import { useArlStore } from './arlStore'
import { create } from 'zustand'
import { finishObjectGesture, objectGestureActive } from '../canvas/interaction'
import { useHistoryStore } from './history'
import { useProjectSession } from '../projects/session'
export const useRenderViewStore = create(() => ({ view: 'edit' as 'edit' | 'preview' }))
export function setRenderView(view: 'edit' | 'preview') {
  finishObjectGesture()
  if (objectGestureActive() || useHistoryStore.getState().busy) throw Error('Rond de huidige bewerking af voordat je het voorbeeld opent.')
  useRenderViewStore.setState({ view })
}
let generation = useProjectSession.getState().generation
useProjectSession.subscribe(s => {
  if (s.generation !== generation) { generation = s.generation; useArlStore.getState().setMode(undefined); useRenderViewStore.setState({ view: 'edit' }) }
})
