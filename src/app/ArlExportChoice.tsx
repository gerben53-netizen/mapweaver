import type { ArlMode } from '../store/arlStore'
export function ArlExportChoice({ value, onChange, disabled }: { value: ArlMode; onChange: (mode: ArlMode) => void; disabled?: boolean }) {
  return <label>Export ARL<select aria-label="Export ARL" disabled={disabled} value={value} onChange={e => onChange(e.target.value as ArlMode)}><option value="OFF">OFF — production baseline</option><option value="B">B — experimental contact</option><option value="C">C — experimental contact, edge, mass</option></select><small>Alleen deze uitvoer. De tijdelijke Voorbeeld-keuze wordt niet overgenomen.</small></label>
}
