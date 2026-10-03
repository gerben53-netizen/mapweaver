import { createPlace } from '../domain/annotations'
import { automaticLabelOverridden } from '../domain/automaticLabelMetadata'
import { beforeEach, expect, it } from 'vitest'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { history, useHistoryStore } from './history'
import { currentSnapshot } from '../projects/session'
import { applyAutomaticLabels } from './automaticLabelActions'
import { generateAutomaticLabels, AUTO_LABEL_DEFAULTS } from '../domain/automaticLabels'
import { createArea, rectangleGeometry } from '../domain/areas'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
import { gatherProject, encodeProject, decodeProject } from '../projects/archive'
import { restyleLabel } from '../domain/annotations'
const source=()=>({...createArea(rectangleGeometry({x:100,y:100,width:800,height:500})),id:'region',name:'Amber Reach'})
beforeEach(()=>{useProjectStore.setState({map:{...defaultMapStyle(),width:1200,height:800,mapType:'world-map',geography:defaultGeography('world-map'),background:null},objects:[source()],layers:[{id:'source',name:'Sources',visible:true,locked:false,objectIds:['region']}],objectGroups:[],layerTree:{roots:['source'],groups:[]}});useEditorStore.setState({activeLayerId:'source',soloLayerId:null,selectedObjectIds:[]});history.reset()})
const apply=()=>{const before=currentSnapshot(),result=generateAutomaticLabels(before,AUTO_LABEL_DEFAULTS);applyAutomaticLabels(before,result);return result.labels[0]}
it('applies/undoes/redoes one layout, roundtrips ZIP and refuses stale previews',async()=>{
 const before=currentSnapshot(),label=apply(),after=currentSnapshot();expect(useHistoryStore.getState().undoCount).toBe(1);history.undo();expect(currentSnapshot()).toEqual(before);history.redo();expect(currentSnapshot()).toEqual(after)
 const now=new Date().toISOString(),prepared=await gatherProject(currentSnapshot(),{id:'labels',name:'Labels',createdAt:now,modifiedAt:now}),loaded=await decodeProject(await encodeProject(prepared));expect(loaded.document.objects.find(o=>o.id===label.id)).toEqual(label)
 expect(()=>applyAutomaticLabels(before,{labels:[label],remove:[],suppressed:0,preserved:0,eligible:1,omitted:0})).toThrow('changed')
})
it.each(['move','rotate','text','font'] as const)('marks %s overrides and preserves them through updating',kind=>{
 const label=apply(),next=kind==='move'?{...label,x:label.x+40}:kind==='rotate'?{...label,rotation:25}:kind==='text'?restyleLabel(label,label.style,'My custom region'):restyleLabel(label,{...label.style,font:'sourcesans3'})
 useProjectStore.getState().updateAnnotations([next]);const changed=currentSnapshot().objects.find(o=>o.id===label.id);expect(changed?.kind==='label'&&changed.automatic?.overridden).toBe(true);apply();expect(currentSnapshot().objects.find(o=>o.id===label.id)).toEqual(changed)
})
it('adds newly named sources, removes stale labels and preserves detached manual labels',()=>{
 const first=apply();useProjectStore.getState().updateAnnotations([{...first,automatic:undefined}]);const manual=currentSnapshot().objects.find(o=>o.id===first.id)
 useProjectStore.setState(s=>({objects:s.objects.filter(o=>o.id!=='region'),layers:s.layers.map(l=>({...l,objectIds:l.objectIds.filter(id=>id!=='region')}))}));apply();expect(currentSnapshot().objects).toContainEqual(manual)
})

it('keeps owner-follow movement automatic while direct label dragging becomes an override',()=>{
 const p={...createPlace({x:600,y:400},'Aster','capital',useProjectStore.getState().map),id:'capital'}
 useProjectStore.setState(s=>({objects:[p],layers:s.layers.map(l=>({...l,objectIds:[p.id]}))}));const label=apply()
 useProjectStore.getState().updateTransform(p.id,{...p,x:p.x+40})
 const moved=useProjectStore.getState().objects.find(o=>o.id===label.id)!
 expect(moved.x).toBe(label.x+40);expect(moved.kind==='label'&&automaticLabelOverridden(moved)).toBe(false)
 useProjectStore.getState().updateTransform(moved.id,{...moved,x:moved.x+20})
 const direct=useProjectStore.getState().objects.find(o=>o.id===label.id)!
 expect(direct.kind==='label'&&automaticLabelOverridden(direct)).toBe(true)
})

it('retains the override flag on repeated final drag samples built from the original object',()=>{
 const label=apply(),p=useProjectStore.getState();p.translate([label],{x:40,y:20});p.translate([label],{x:40,y:20});const moved=p.objects.find(o=>o.id===label.id)
 const saved=useProjectStore.getState().objects.find(o=>o.id===label.id);expect(saved?.kind==='label'&&saved.automatic?.overridden).toBe(true);expect(moved?.x).toBe(label.x)
})

it('updates a renamed source using the same label ID and adds/removes native labels safely',()=>{
 const first=apply(),p=useProjectStore.getState(),second={...source(),id:'second',name:'New Reach',x:950,width:200}
 p.updateArea({...p.objects.find(o=>o.id==='region') as ReturnType<typeof source>,name:'Renamed Reach'})
 const before=currentSnapshot(),result=generateAutomaticLabels(before,AUTO_LABEL_DEFAULTS);expect(result.labels[0]).toMatchObject({id:first.id,text:'Renamed Reach'});applyAutomaticLabels(before,result)
 const newArea={...createArea(rectangleGeometry({x:950,y:200,width:200,height:200})),id:second.id,name:second.name}
 useProjectStore.setState(s=>({objects:[...s.objects,newArea],layers:s.layers.map(l=>l.id==='source'?{...l,objectIds:[...l.objectIds,newArea.id]}:l)}));apply();expect(useProjectStore.getState().objects.filter(o=>o.kind==='label')).toHaveLength(2)
 useProjectStore.setState(s=>({objects:s.objects.filter(o=>o.id!=='second'),layers:s.layers.map(l=>({...l,objectIds:l.objectIds.filter(id=>id!=='second')}))}));apply();expect(useProjectStore.getState().objects.filter(o=>o.kind==='label')).toHaveLength(1)
})
