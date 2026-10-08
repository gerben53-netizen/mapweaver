import type { ArlMode } from '../store/arlStore'
export function ArlExportChoice({ value, onChange, disabled }: { value: ArlMode; onChange: (mode: ArlMode) => void; disabled?: boolean }) {
  return <label>Export ARL<select aria-label="Export ARL" disabled={disabled} value={value} onChange={e => onChange(e.target.value as ArlMode)}><option value="OFF">OFF — ARL uit</option><option value="B">B — contact</option><option value="C">C — premium contact, edge, mass</option></select><small>Alleen deze uitvoer. Begint met de opgeslagen kaartinstelling; Voorbeeld-diagnose wordt niet overgenomen.</small></label>
}
