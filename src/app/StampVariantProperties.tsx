import type { StampObject } from '../domain/models'
import { useProjectStore } from '../store/projectStore'

export function StampVariantProperties({ object }: { object: StampObject }) {
  if (!object.family) return null
  const selection = object.family
  const change = (id?: string) => useProjectStore.getState().changeStampVariant(object.id, id)
  return <div><label>Variant<select aria-label="Variant" value={selection.variantId} onChange={e => change(e.target.value)}>
    {selection.family.variants.map(v => <option key={v.id} value={v.id} disabled={v.deprecated}>{v.label || v.id}{v.deprecated ? ' (deprecated)' : ''}</option>)}
  </select></label><button disabled={selection.family.variants.filter(v => !v.deprecated).length < 2} onClick={() => change()}>Andere variant</button></div>
}
