import { create } from 'zustand'
/** Session-only renderer experiment. Never persisted or enabled by map migration. */
export type ArlMode = 'OFF' | 'B' | 'C'
export const useArlStore = create<{ mode: ArlMode; setMode: (mode: ArlMode) => void }>(set => ({
  mode: 'OFF', setMode: mode => set({ mode }),
}))
