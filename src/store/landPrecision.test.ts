import { expect, it } from 'vitest'
import { createArea, normalizeGeometry } from '../domain/areas'
import { defaultLandArea } from '../domain/landAreas'
import { precisionSmooth } from '../domain/landPrecision'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { history,useHistoryStore } from './history'
import { commitLandStroke, landBrushInput } from './landBrushActions'
import { currentSnapshot } from '../projects/session'
import { gatherProject, encodeProject, decodeProject } from '../projects/archive'
import { defaultLandBrush } from '../domain/landBrush'
it('commits one precision transaction, undo/redo exact geometry and portable archive',async()=>{
 const o={...createArea(normalizeGeometry({polygons:[{outer:[...Array.from({length:16},(_,i)=>({x:20+i*20,y:30+(i%2)*10})),{x:320,y:200},{x:20,y:200}],holes:[]}]})),land:defaultLandArea('landmass')}
 useProjectStore.setState({map:{...defaultMapStyle(),width:800,height:600,mapType:'world-map',geography:defaultGeography('world-map'),background:null},objects:[o],layers:[{id:'land',name:'Land',visible:true,locked:false,objectIds:[o.id]}],objectGroups:[],layerTree:{roots:['land'],groups:[]}})
 useEditorStore.setState({activeLayerId:'land',soloLayerId:null});history.reset()
 const before=currentSnapshot(),n=precisionSmooth(o,{ring:0,start:0,end:14,amount:40,protectedPoints:[7]})
 commitLandStroke(before,{replacements:[n],removed:[],added:[]},'smooth')
 expect(useHistoryStore.getState().undoCount).toBe(1);expect(currentSnapshot().objects).toEqual([n])
 history.undo();expect(currentSnapshot().objects).toEqual([o]);history.redo();expect(currentSnapshot().objects).toEqual([n])
 const date='2026-10-17T00:00:00.000Z',prepared=await gatherProject(currentSnapshot(),{id:'precision-test',name:'Precision',createdAt:date,modifiedAt:date}),loaded=await decodeProject(await encodeProject(prepared))
 expect(loaded.document.objects).toEqual([n]);expect(loaded.document.map).not.toHaveProperty('referenceImage')
 expect(()=>landBrushInput(currentSnapshot(),{...defaultLandBrush,action:'smooth',smoothing:'off'},[{x:10,y:10}],1,'none')).toThrow('Smoothing is Off')
})
