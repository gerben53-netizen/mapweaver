import type { WallStyle } from './walls'
/** Only fields deliberately changed in a mixed-selection form are transferred. */
export function applyWallStyleChanges(previous:WallStyle,initial:WallStyle,draft:WallStyle):WallStyle {
  function changed(old:unknown,next:unknown,current:unknown):unknown {
    if(JSON.stringify(old)===JSON.stringify(next))return current
    if(old&&next&&typeof old==='object'&&typeof next==='object'&&!Array.isArray(old)&&!Array.isArray(next)){
      const a=old as Record<string,unknown>,b=next as Record<string,unknown>,c=(current||{}) as Record<string,unknown>
      // Discriminated values and set revisions must be transferred as complete contracts.
      if(a.kind!==b.kind||a.revision!==b.revision||a.renderingMode!==b.renderingMode)return next
      return Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b),...Object.keys(c)])].map(k=>[k,changed(a[k],b[k],c[k])]))
    }
    return next
  }
  return changed(initial,draft,previous) as WallStyle
}
