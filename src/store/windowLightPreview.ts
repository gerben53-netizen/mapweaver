import { create } from 'zustand'
/** Temporary authoring overlay; never part of project data or bitmap exports. */
export const useWindowLightPreview=create(()=>({enabled:false}))
