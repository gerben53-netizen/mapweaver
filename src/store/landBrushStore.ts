import { create } from 'zustand'
import { defaultLandBrush, type LandBrush, type LandBrushResult } from '../domain/landBrush'
import type { Point } from '../canvas/viewport'
export const useLandBrushStore=create(()=>({settings:{...defaultLandBrush} as LandBrush,preview:null as LandBrushResult|null,cursor:null as Point|null,angle:0,inverted:false,busy:false}))
