import { expect,it } from 'vitest'
import { waterDepthStudy } from '../../tests/fixtures/waterDepthStudy'
import { useProjectStore } from './projectStore'
import { contourPreset } from '../domain/coastalContours'
import { history,useHistoryStore } from './history'
import { currentSnapshot } from '../projects/session'
import { gatherProject,encodeProject,decodeProject } from '../projects/archive'
import { applyWorldTheme } from '../domain/applyWorldTheme'
it('round trips optional contours, leaves legacy absent and supports undo',async()=>{
 const before=waterDepthStudy();useProjectStore.setState(before);history.reset()
 const now='2026-09-26T00:00:00.000Z',metadata={id:'contour-study',name:'Contours',createdAt:now,modifiedAt:now}
 const roundtrip=async()=>decodeProject(await encodeProject(await gatherProject(currentSnapshot(),metadata)))
 expect((await roundtrip()).document.map.coastalContours).toBeUndefined()
 const next=contourPreset();history.run('Contours',()=>useProjectStore.setState(s=>({map:{...s.map,coastalContours:next}})))
 expect(useHistoryStore.getState().undoCount).toBe(1);expect((await roundtrip()).document.map.coastalContours).toEqual(next)
 history.undo();expect(currentSnapshot().map.coastalContours).toBeUndefined();history.redo();expect(currentSnapshot().map.coastalContours).toEqual(next)
 const themed=applyWorldTheme(currentSnapshot(),'world.darkFantasy',{reset:true,elements:false,assets:false}).snapshot
 expect(themed.map.coastalContours?.preset).toBe('world.darkFantasy')
})
