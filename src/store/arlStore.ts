import { create } from 'zustand'
/** Session-only Preview experiment. Export chooses its own explicit profile.
 * Never persisted or enabled by map migration; Edit always uses native OFF. */
export type ArlMode = 'OFF' | 'B' | 'C'
export const useArlStore = create<{ mode: ArlMode; setMode: (mode: ArlMode) => void }>(set => ({
  mode: 'OFF', setMode: mode => set({ mode }),
}))
