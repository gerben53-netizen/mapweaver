export function Tabs<T extends string>({ label, value, items, onChange }: { label: string; value: T; items: readonly (readonly [T, string])[]; onChange: (value: T) => void }) {
  return <div className="tabs" role="tablist" aria-label={label}>{items.map(([id, name], index) => <button key={id} type="button" role="tab" title={label==='Inspector'?({layers:'Layer order, visibility and locks',objects:'Find placed objects',properties:'Edit the current selection',map:'Canvas, grid and game scale'} as Record<string,string>)[id]:name} aria-selected={value === id} tabIndex={value === id ? 0 : -1} onClick={() => onChange(id)} onKeyDown={(e) => {
    let next: number
    if (e.key === 'ArrowRight') next = (index + 1) % items.length
    else if (e.key === 'ArrowLeft') next = (index + items.length - 1) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else return
    e.preventDefault(); onChange(items[next][0]); (e.currentTarget.parentElement?.children[next] as HTMLElement).focus()
  }}>{name}</button>)}</div>
}

