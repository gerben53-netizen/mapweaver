import { create } from 'zustand'
/** Editor-only visibility; deliberately absent from project snapshots, archives and assets. */
export const useReferenceViewStore=create(()=>({open:false}))
