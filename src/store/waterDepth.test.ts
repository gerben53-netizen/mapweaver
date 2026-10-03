import { expect,it } from 'vitest'
import { waterDepthStudy } from '../../tests/fixtures/waterDepthStudy'
import { useProjectStore } from './projectStore'
import { commitWaterDepth } from './waterDepthStore'
import { history,useHistoryStore } from './history'
import { currentSnapshot } from '../projects/session'
import { gatherProject,encodeProject,decodeProject } from '../projects/archive'
import { applyWorldTheme } from '../domain/applyWorldTheme'
it('saves optional configuration and paint, restores one undo/redo and resets safely',async()=>{
 const before=waterDepthStudy(),next=waterDepthStudy(true).map.waterDepth!;useProjectStore.setState(before);history.reset()
 commitWaterDepth(next,undefined,'Paint water depth');expect(useHistoryStore.getState().undoCount).toBe(1);expect(currentSnapshot().objects).toEqual(before.objects)
 history.undo();expect(currentSnapshot().map.waterDepth).toBeUndefined();history.redo();expect(currentSnapshot().map.waterDepth).toEqual(next)
 expect(()=>commitWaterDepth(next,undefined)).toThrow('changed')
 const now='2026-09-26T00:00:00.000Z',archive=await gatherProject(currentSnapshot(),{id:'water-study',name:'Water study',createdAt:now,modifiedAt:now}),loaded=await decodeProject(await encodeProject(archive));expect(loaded.document.map.waterDepth).toEqual(next)
 commitWaterDepth({...next,paint:undefined},next);history.undo();expect(currentSnapshot().map.waterDepth).toEqual(next)
 const themed=applyWorldTheme(currentSnapshot(),'world.painterlyFantasy',{reset:true,elements:false,assets:false}).snapshot;expect(themed.map.waterDepth?.paint).toEqual(next.paint)
})
