import { create } from 'zustand'
/** Session-only Preview diagnosis. Undefined inherits the saved map setting/default.
 * Never persisted or forwarded to export; Edit always uses native OFF. */
import type { ArlMode } from '../domain/rendering'
export type { ArlMode } from '../domain/rendering'
export const useArlStore = create<{ mode: ArlMode | undefined; setMode: (mode: ArlMode | undefined) => void }>(set => ({
  mode: undefined, setMode: mode => set({ mode }),
}))
