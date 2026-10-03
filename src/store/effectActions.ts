import { validateStampEffects, type StampEffects } from '../domain/mapEffects'
import { editableProjectIds } from '../domain/projectView'
import { history } from './history'
import { useProjectStore } from './projectStore'

export function setStampEffects(id: string, effects: StampEffects) {
  const validated = validateStampEffects(effects), state = useProjectStore.getState()
  if (!editableProjectIds(state).has(id) || !state.objects.some(o => o.id === id && o.kind === 'stamp')) throw Error('Select an editable stamp first.')
  history.run('Change stamp effects', () => useProjectStore.setState(s => ({ objects: s.objects.map(o => o.id === id && o.kind === 'stamp' ? { ...o, effects: validated } : o) })))
}
