import { beforeEach, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EnvironmentalDetailTools } from './EnvironmentalDetailTools'
import { useEditorStore } from '../store/editorStore'
import { useEnvironmentalDetailStore } from '../store/environmentalDetailStore'
import { defaultDetailBrush, DETAIL_PRESETS } from '../domain/environmentalDetail'
import { useProjectStore } from '../store/projectStore'
import { ToolRail } from './ToolRail'
beforeEach(()=>{useEditorStore.setState({activeTool:'environmentalDetail'});useEnvironmentalDetailStore.setState({settings:{...defaultDetailBrush},preview:null});useProjectStore.setState(s=>({map:{...s.map,mapType:'battlemap',environmentalDetail:undefined}}))})
it('exposes four surface and seven decal DEV presets without normal stamp/library placement',()=>{render(<EnvironmentalDetailTools/>);expect(screen.getByLabelText('Environmental preset').querySelectorAll('option')).toHaveLength(4);fireEvent.change(screen.getByLabelText('Environmental mode'),{target:{value:'decals'}});expect(screen.getByLabelText('Environmental preset').querySelectorAll('option')).toHaveLength(7);fireEvent.change(screen.getByLabelText('Environmental action'),{target:{value:'erase'}});expect(useEnvironmentalDetailStore.getState().settings.action).toBe('erase');fireEvent.change(screen.getByLabelText('Environmental edge bias'),{target:{value:'walls'}});expect(useEnvironmentalDetailStore.getState().settings.edgeBias).toBe('walls');expect(DETAIL_PRESETS.every(p=>p.id.startsWith('dev.'))).toBe(true);expect(useEditorStore.getState().picker).toBeNull()})
it('makes the dedicated tool available through the normal rail',()=>{render(<ToolRail/>);fireEvent.click(screen.getByRole('button',{name:/^Environmental Detail$/}));expect(useEditorStore.getState().activeTool).toBe('environmentalDetail')})
