import { createRef } from 'react'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LandBrushController } from './LandBrushController'
import { calculateLandStroke } from './landBrushClient'
import { applyLandStroke, defaultLandBrush } from '../domain/landBrush'
import { nextOrganicLandSeed } from '../domain/organicLandFootprint'
import { defaultMapStyle } from '../domain/mapSettings'
import { useLandBrushStore } from '../store/landBrushStore'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history } from '../store/history'

vi.mock('./landBrushClient',()=>({calculateLandStroke:vi.fn(async input=>applyLandStroke(input))}))
afterEach(cleanup)
beforeEach(()=>{
 vi.mocked(calculateLandStroke).mockClear()
 useEditorStore.setState({activeTool:'landBrush',activeLayerId:'land',viewport:{zoom:1,pan:{x:0,y:0}},soloLayerId:null})
 useProjectStore.setState({map:{...defaultMapStyle(),mapType:'world-map',width:1000,height:800,background:null},objects:[],layers:[{id:'land',name:'Land',visible:true,locked:false,objectIds:[]}],layerTree:{roots:['land'],groups:[]},objectGroups:[]})
 useLandBrushStore.setState({settings:{...defaultLandBrush,shape:'organicSoft',softness:0,roughness:.65,smoothing:'off'},organicSeed:713,busy:false,preview:null,cursor:null})
 history.reset()
})
function mount(){
 const surface=createRef<HTMLDivElement>();render(<><div ref={surface}/><LandBrushController surface={surface}/></>)
 const el=surface.current!;el.setPointerCapture=vi.fn();el.hasPointerCapture=()=>false;el.releasePointerCapture=vi.fn()
 const pointer=(type:string,x=400,y=350)=>fireEvent(el,Object.assign(new MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y}),{pointerId:7}))
 return{pointer}
}
it('uses the same seed for cursor/preview/commit and varies the next completed gesture',async()=>{
 const{pointer}=mount();pointer('pointerdown');await waitFor(()=>expect(useLandBrushStore.getState().preview).not.toBeNull())
 expect(vi.mocked(calculateLandStroke).mock.calls[0][0].seed).toBe(713);expect(useLandBrushStore.getState().organicSeed).toBe(713)
 pointer('pointerup');await waitFor(()=>expect(useLandBrushStore.getState().organicSeed).toBe(nextOrganicLandSeed(713)))
 expect(useProjectStore.getState().objects).toHaveLength(1);expect(vi.mocked(calculateLandStroke).mock.calls.every(([input])=>input.seed===713)).toBe(true)
 pointer('pointerdown',650,350);await waitFor(()=>expect(vi.mocked(calculateLandStroke).mock.lastCall?.[0].seed).toBe(nextOrganicLandSeed(713)))
 fireEvent.keyDown(window,{key:'Escape'});expect(useLandBrushStore.getState().organicSeed).toBe(nextOrganicLandSeed(713));expect(useLandBrushStore.getState().preview).toBeNull()
})
it('retains the legacy Round seed and cancellation never commits or advances the organic sequence',async()=>{
 useLandBrushStore.setState({settings:{...defaultLandBrush,shape:'round'}})
 const{pointer}=mount();pointer('pointerdown');await waitFor(()=>expect(calculateLandStroke).toHaveBeenCalled());expect(vi.mocked(calculateLandStroke).mock.calls[0][0].seed).toBe(1)
 fireEvent.blur(window);expect(useProjectStore.getState().objects).toHaveLength(0);expect(useLandBrushStore.getState().organicSeed).toBe(713)
})
