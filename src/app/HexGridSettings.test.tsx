import { beforeEach,expect,it } from 'vitest'
import { render,screen,fireEvent,act } from '@testing-library/react'
import { MapSettingsPanel } from './MapSettingsPanel'
import { LandBrushTools } from './LandBrushTools'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { useLandBrushStore } from '../store/landBrushStore'
import { defaultLandBrush } from '../domain/landBrush'
import { toolIntentFixture } from '../../tests/fixtures/toolIntent'
import { history } from '../store/history'
beforeEach(()=>{project.setState(toolIntentFixture());editor.setState({activeTool:'select'});history.reset()})
it('updates type, size, offsets and style live with one-step undo',()=>{
 render(<MapSettingsPanel/>);expect(screen.getByLabelText('Grid type')).toHaveValue('square')
 fireEvent.change(screen.getByLabelText('Grid type'),{target:{value:'hex-flat'}})
 expect(project.getState().map.grid.type).toBe('hex-flat');expect(screen.queryByLabelText('Resolution (px/square)')).not.toBeInTheDocument()
 fireEvent.change(screen.getByLabelText('Hex diameter (px)'),{target:{value:'160'}});fireEvent.blur(screen.getByLabelText('Hex diameter (px)'))
 expect(project.getState().map.grid.cellSize).toBe(160)
 act(()=>history.undo());expect(project.getState().map.grid.cellSize).toBe(50)
 fireEvent.click(screen.getByLabelText('Snap to grid'));expect(project.getState().map.grid.snapEnabled).toBe(true)
 fireEvent.click(screen.getByText('Advanced grid settings'))
 fireEvent.change(screen.getByLabelText('Offset X (px)'),{target:{value:'-75'}});fireEvent.blur(screen.getByLabelText('Offset X (px)'));expect(project.getState().map.grid.offsetX).toBe(-75)
})
it('matches one cell while retaining soft/rough choices and locking grid-aligned rotation',()=>{
 project.setState(s=>({map:{...s.map,grid:{...s.map.grid,type:'hex-pointy',cellSize:120}}}));editor.setState({activeTool:'landBrush'});useLandBrushStore.setState({settings:{...defaultLandBrush,shape:'hexagon'}})
 render(<LandBrushTools/>);fireEvent.click(screen.getByLabelText('Match one hex cell'))
 expect(screen.getByLabelText('Snap to hex grid')).toBeChecked();expect(screen.getByLabelText('Hex orientation')).toBeDisabled();expect(screen.getByLabelText('Hex orientation')).toHaveValue('pointy')
 expect(screen.queryByLabelText('Hex rotation (degrees)')).not.toBeInTheDocument();expect(screen.queryByLabelText('Land brush size slider')).not.toBeInTheDocument()
 fireEvent.change(screen.getByLabelText('Land brush shape'),{target:{value:'round'}});expect(screen.getByLabelText('Land brush size slider')).toBeEnabled()
 fireEvent.change(screen.getByLabelText('Land brush shape'),{target:{value:'hexagon'}})
 fireEvent.change(screen.getByLabelText('Hex edge style'),{target:{value:'rough'}});expect(screen.getByLabelText('Roughness (%)')).toBeEnabled()
 fireEvent.click(screen.getByLabelText('Snap to hex grid'));expect(screen.getByLabelText('Match one hex cell')).not.toBeChecked();expect(screen.getByLabelText('Hex rotation (degrees)')).toBeEnabled()
})

