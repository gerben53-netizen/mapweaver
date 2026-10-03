import { beforeEach,expect,it } from 'vitest'
import { render,screen,fireEvent,act } from '@testing-library/react'
import { WaterDepthTools } from './WaterDepthTools'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { useWaterDepthStore } from '../store/waterDepthStore'
import { history } from '../store/history'
import { waterDepthStudy } from '../../tests/fixtures/waterDepthStudy'
beforeEach(()=>{useProjectStore.setState(waterDepthStudy());useEditorStore.setState({activeTool:'waterDepth'});history.reset()})
it('explicitly enables depth, exposes all modes and keeps brush edits transient',()=>{
 render(<WaterDepthTools/>);expect(useProjectStore.getState().map.waterDepth).toBeUndefined()
 fireEvent.click(screen.getByLabelText('Use automatic depth'));expect(useProjectStore.getState().map.waterDepth?.enabled).toBe(true)
 const map=useProjectStore.getState().map
 for(const mode of ['shallow','deep','erase','blend']){fireEvent.change(screen.getByLabelText('Depth mode'),{target:{value:mode}});expect(useWaterDepthStore.getState().settings.mode).toBe(mode)}
 fireEvent.change(screen.getByLabelText('Water size'),{target:{value:'240'}});expect(useWaterDepthStore.getState().settings.size).toBe(240);expect(useProjectStore.getState().map).toBe(map)
})
it('global reset is undoable and disabling depth retains paint',()=>{
 const snapshot=waterDepthStudy(true);useProjectStore.setState(snapshot);render(<WaterDepthTools/>)
 fireEvent.click(screen.getByText('Reset painted depth'));expect(useProjectStore.getState().map.waterDepth?.paint).toBeUndefined();act(()=>{history.undo()});expect(useProjectStore.getState().map.waterDepth).toEqual(snapshot.map.waterDepth)
 fireEvent.click(screen.getByLabelText('Use automatic depth'));expect(useProjectStore.getState().map.waterDepth?.enabled).toBe(false);expect(useProjectStore.getState().map.waterDepth?.paint).toEqual(snapshot.map.waterDepth?.paint)
})

it('allows typing a shelf value through an incomplete draft without saving invalid values',()=>{
 render(<WaterDepthTools/>);fireEvent.click(screen.getByLabelText('Use automatic depth'));const input=screen.getByLabelText('Coastal shelf (map px)')
 fireEvent.change(input,{target:{value:'1'}});expect(input).toHaveValue(1);expect(useProjectStore.getState().map.waterDepth?.shelf).toBe(140)
 fireEvent.change(input,{target:{value:'100'}});expect(useProjectStore.getState().map.waterDepth?.shelf).toBe(100)
 fireEvent.change(input,{target:{value:''}});fireEvent.blur(input);expect(input).toHaveValue(100)
})
it('explicit style upgrade preserves old manual masks and is undoable',()=>{
 const snapshot=waterDepthStudy(true),old={...snapshot.map.waterDepth!};delete old.model;delete old.coastEdge
 useProjectStore.setState({...snapshot,map:{...snapshot.map,waterDepth:old}});render(<WaterDepthTools/>)
 expect(screen.getByText(/Legacy water appearance/)).toBeInTheDocument()
 fireEvent.click(screen.getByText('Apply current water style'))
 expect(useProjectStore.getState().map.waterDepth?.model).toBe('bathymetry');expect(useProjectStore.getState().map.waterDepth?.paint).toEqual(old.paint)
 fireEvent.click(screen.getByLabelText('Thin shoreline edge'));expect(useProjectStore.getState().map.waterDepth?.coastEdge).toBe(true)
 act(()=>{history.undo();history.undo()});expect(useProjectStore.getState().map.waterDepth).toEqual(old)
})

it('edits contours independently, preserves overrides when disabled and restores undo',()=>{
 render(<WaterDepthTools/>);expect(useProjectStore.getState().map.coastalContours).toBeUndefined()
 fireEvent.click(screen.getByLabelText('Enable coastal contours'));expect(useProjectStore.getState().map.waterDepth).toBeUndefined()
 fireEvent.change(screen.getByLabelText('Contour preset'),{target:{value:'world.darkFantasy'}});expect(useProjectStore.getState().map.coastalContours?.count).toBe(2)
 fireEvent.change(screen.getByLabelText('Contour lines'),{target:{value:'3'}});fireEvent.change(screen.getByLabelText('Contour spacing'),{target:{value:'1.5'}})
 const saved=useProjectStore.getState().map.coastalContours!;expect(saved.spacing).toBe(15)
 fireEvent.click(screen.getByLabelText('Enable coastal contours'));expect(useProjectStore.getState().map.coastalContours).toEqual({...saved,enabled:false})
 act(()=>history.undo());expect(useProjectStore.getState().map.coastalContours).toEqual(saved)
 fireEvent.change(screen.getByLabelText('Contour lines'),{target:{value:'0'}});expect(useProjectStore.getState().map.coastalContours?.count).toBe(0)
})
