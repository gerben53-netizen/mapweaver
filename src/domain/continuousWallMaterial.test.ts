import { expect, it } from 'vitest'
import { continuousDefinition } from './continuousWall.fixture'
import { materialStyle, validateWallSet } from './wallSets'
import { materialPixelsPerUnit, materialValues, materialMapReference } from './continuousWallMaterial'
import { createWall, SIMPLE_WALL, wallConnections } from './walls'
import { organicOffset, wallField, wallFlow } from './continuousWallGeometry'
import { withPathGeometry, validatePath } from './paths'
import { createOpening, reconcileOpenings, openingCutout } from './openings'
import { defaultMapStyle } from './mapSettings'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { installProjectAssets } from '../projects/assets'
const style=()=>({...materialStyle({definition:continuousDefinition(),assetId:'atlas'},SIMPLE_WALL),strokeWidth:35})
const nodes=[{id:'a',x:20,y:30,mode:'corner' as const},{id:'b',x:220,y:30,mode:'corner' as const},{id:'c',x:220,y:230,mode:'corner' as const}]
it('validates immutable material contracts and rejects unknown channels, unsafe values and source indices',()=>{
  const d=continuousDefinition();expect(validateWallSet(d,true)).toEqual(d)
  for(const continuous of [{...d.continuous,sources:{fill:[4]}},{...d.continuous,defaults:{...d.continuous!.defaults,organic:NaN}},{...d.continuous,sources:{fill:[0],evil:[0]}},{...d.continuous,version:2}])expect(()=>validateWallSet({...d,continuous},true)).toThrow()
  const w=createWall(nodes,false,style());expect(()=>validatePath({...w,wall:{...w.wall!,material:{...w.wall!.material!,materialId:'wrong'}}})).toThrow()
})
it('uses backward-compatible defaults and explicit world references independent of viewport',()=>{
  const s=style(),m=s.wall.material!;expect(materialValues(s)).toEqual(continuousDefinition().continuous!.defaults)
  expect(materialPixelsPerUnit(s,'ft')).toBe(10)
  expect(materialPixelsPerUnit({...s,wall:{...s.wall,unit:'m',pixelsPerUnit:10/.3048}},'ft')).toBeCloseTo(10)
  expect(materialMapReference({width:400,height:300,background:null,...defaultMapStyle()})).toEqual({unit:'ft',pixelsPerUnit:10})
  expect(validatePath(createWall(nodes,false,{...s,wall:{...s.wall,material:{set:m.set,seed:42,roughness:0}}}))).toBeTruthy()
  expect(createWall(nodes,false,SIMPLE_WALL).wall?.material).toBeUndefined()
})
it('keeps seeds, local flow and coherent contours stable after serialization and unrelated edits',()=>{
  const w=createWall(nodes,false,style()),a=wallField(w),b=wallField(JSON.parse(JSON.stringify(w)))
  expect(wallField(w)).toBe(a);expect(organicOffset(a,80,30)).toEqual(organicOffset(b,80,30))
  expect(Math.abs(organicOffset(a,80,30).y-organicOffset(a,80.01,30).y)).toBeLessThan(.01)
  const edited=withPathGeometry(w,[{...nodes[0],x:0},nodes[1],nodes[2]])
  expect(wallFlow(wallField(edited),220,150).u).toBe(wallFlow(a,220,150).u)
  expect(organicOffset(wallField(edited),220,150)).toEqual(organicOffset(a,220,150))
  const randomized=withPathGeometry({...w,wall:{...w.wall!,material:{...w.wall!.material!,seed:w.wall!.material!.seed^123}}})
  expect(organicOffset(wallField(randomized),80,30)).not.toEqual(organicOffset(a,80,30))
})
it('supports T junctions, crossings, closed curves and wide opening cutouts without adding objects',()=>{
  const a=createWall(nodes,false,style()),b=createWall([{id:'d',x:120,y:30,mode:'corner'},{id:'e',x:120,y:160,mode:'corner'}],false,style()),cross=createWall([{id:'f',x:100,y:0,mode:'corner'},{id:'g',x:100,y:200,mode:'corner'}],false,style())
  expect(wallConnections([a,b,cross]).get(a.id)?.filter(c=>c.neighbor)).toHaveLength(2)
  const door=createOpening(a,.25,'door',25);expect(()=>reconcileOpenings([a,door])).not.toThrow();expect(openingCutout(door,a).length).toBeGreaterThan(3)
  const curve=createWall([{id:'q',x:50,y:50,mode:'smooth',out:{x:100,y:-40}},{id:'r',x:200,y:200,mode:'smooth',in:{x:40,y:-100}}],false,style());expect(wallField(curve).segments.length).toBeGreaterThan(2)
  expect(wallField(createWall(nodes,true,style())).closed).toBe(true)
})
it('edits material, width and seed in one native undo/redo operation without losing the path',()=>{
  installProjectAssets(new Map([['atlas',{blob:new Blob(['fixture'],{type:'image/png'}),manifest:{id:'atlas',kind:'fillPattern',fileName:'atlas.png',mimeType:'image/png',width:32,height:16,hash:'b'.repeat(64),path:'assets/atlas.png'}}]]))
  const wall=createWall(nodes,false,style());project.setState({objects:[wall],layers:[{id:'walls',name:'Walls',visible:true,locked:false,objectIds:[wall.id]}],objectGroups:[],layerTree:{roots:['walls'],groups:[]},map:{width:400,height:300,background:null,...defaultMapStyle()}});editor.setState({selectedObjectIds:[wall.id],activeLayerId:'walls',soloLayerId:null});history.reset()
  const changed=withPathGeometry({...wall,strokeWidth:60,wall:{...wall.wall!,material:{...wall.wall!.material!,organic:.9,seed:12345}}})
  history.run('Wall material',()=>project.getState().updatePath(changed))
  expect(useHistoryStore.getState().undoCount).toBe(1);expect(project.getState().objects[0]).toEqual(changed)
  history.undo();expect(project.getState().objects[0]).toEqual(wall);history.redo();expect(project.getState().objects[0]).toEqual(changed)
})
