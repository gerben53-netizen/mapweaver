import { beforeEach, expect, it, vi } from 'vitest'
import { preparedDocument } from '../projects/localSession'
import { applyPrepared, useProjectSession } from '../projects/session'
import { resolveAsset } from '../projects/assets'
import { createWall, SIMPLE_WALL } from './walls'
import { withPathGeometry, validatePath } from './paths'
import { materialPieces } from './wallMaterialGeometry'
import { validateWallSet, materialStyle } from './wallSets'
import type { WallSetDefinition } from './wallSets'
import { transformSelection } from './selectionTransform'
import { applyWallStyleChanges } from './wallStylePatch'
import { createArea, rectangleGeometry } from './areas'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { installProjectAssets } from '../projects/assets'
import { defaultMapStyle } from './mapSettings'
const art={file:'assets/rock.png',width:100,height:100,anchor:{x:50,y:50},weight:1,rotation:8,scaleVariation:.05,rect:{x:0,y:0},hull:[{x:10,y:10},{x:90,y:10},{x:90,y:90},{x:10,y:90}]}
const set:WallSetDefinition={schemaVersion:1,id:'test-rock',version:'1',title:'Rock',description:'Test art',renderingMode:'segments',nominalWidthPx:60,defaultThickness:40,repeatLengthPx:80,overlapPx:30,coreColor:'#778877',roughnessLimits:{max:1,default:.5,maxProtrusionPx:30},bodyVariants:[art,{...art,weight:2}],cap:art,join:art,author:'Test',source:'Fixture',license:'Test fixture',atlasWidth:100,atlasHeight:100,revision:'a'.repeat(64)}
const style=()=>materialStyle({definition:set,assetId:'atlas'},SIMPLE_WALL)
const nodes=[{id:'a',x:100,y:100,mode:'corner' as const},{id:'b',x:500,y:100,mode:'corner' as const}]
beforeEach(()=>{
  installProjectAssets(new Map([['atlas',{blob:new Blob(['atlas'],{type:'image/png'}),manifest:{id:'atlas',kind:'fillPattern',fileName:'atlas.png',mimeType:'image/png',width:100,height:100,hash:'a'.repeat(64),path:'assets/atlas.png'}}]]))
  project.setState({map:{width:800,height:600,background:null,...defaultMapStyle()},objects:[],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]}})
  editor.setState({activeLayerId:'objects',soloLayerId:null,selectedObjectIds:[],activeTool:'select'});history.reset()
})
it('rejects unsafe contract fields, newer versions, invalid seeds and out-of-atlas rectangles',()=>{
  expect(validateWallSet(set,true)).toEqual(set)
  for(const value of [{...set,schemaVersion:2},{...set,repeatLengthPx:0},{...set,overlapPx:1000},{...set,bodyVariants:[{...art,file:'../a.png'}]},{...set,bodyVariants:[{...art,rect:{x:10,y:0}}]}])expect(()=>validateWallSet(value,true)).toThrow()
  const wall=createWall(nodes,false,style());expect(()=>validatePath({...wall,wall:{...wall.wall!,material:{...wall.wall!.material!,seed:NaN}}})).toThrow()
})
it('keeps seeded art identical after serialization, translation and scale; finite bounded corners and curves',()=>{
  const wall=createWall(nodes,false,style()),before=materialPieces(wall)
  expect(materialPieces(JSON.parse(JSON.stringify(wall)))) .toEqual(before)
  expect(materialPieces(wall)).toBe(before)
  const moved=withPathGeometry(wall,wall.nodes.map(n=>({...n,x:n.x+150,y:n.y-20})))
  expect(materialPieces(moved).map(p=>({...p,x:p.x-150,y:p.y+20}))).toEqual(before)
  const scaled=transformSelection([wall],{scale:2,rotation:90})[0];if(scaled.kind!=='path')throw new Error('Expected wall')
  expect(scaled.strokeWidth).toBe(wall.strokeWidth*2);expect(materialPieces(scaled)).toHaveLength(before.length)
  expect(materialPieces(scaled)[0].scale).toBeCloseTo(before[0].scale*2)
  for(const points of [[nodes[0],{...nodes[1],x:100.02}],[nodes[0],{...nodes[1],x:110},{id:'c',x:101,y:101,mode:'corner' as const}],[{...nodes[0],out:{x:0,y:200}},{...nodes[1],in:{x:0,y:-200}}]])for(const closed of [false,...(points.length>2?[true]:[])]){
    const p=createWall(points,closed,style());expect(materialPieces(p).length).toBeLessThan(4097)
    for(const part of materialPieces(p)){expect(Number.isFinite(part.x+part.y+part.angle+part.scale)).toBe(true);const r=part.scale*Math.hypot(part.art.width,part.art.height);expect(part.x-r).toBeLessThan(p.x+p.width);expect(part.x+r).toBeGreaterThan(p.x)}
  }
})
it('includes transparent material protrusions in bounds and refuses unbounded part allocation',()=>{
  const plain=createWall(nodes),wall=createWall(nodes,false,style())
  expect(wall.width).toBeGreaterThan(plain.width)
  for(const part of materialPieces(wall))for(const v of part.art.hull){const x=(v.x-part.anchorX)*part.scale,y=(v.y-part.art.anchor.y+part.lateral)*part.scale,px=part.x+x*Math.cos(part.angle)-y*Math.sin(part.angle),py=part.y+x*Math.sin(part.angle)+y*Math.cos(part.angle);expect(px).toBeGreaterThanOrEqual(wall.x);expect(px).toBeLessThanOrEqual(wall.x+wall.width);expect(py).toBeGreaterThanOrEqual(wall.y);expect(py).toBeLessThanOrEqual(wall.y+wall.height)}
  expect(()=>createWall([nodes[0],{...nodes[1],x:999999}],false,style())).toThrow(/4096/)
})
it('applies only explicitly edited mixed properties and gives material/seed changes one undo step',()=>{
  const a=createWall(nodes,false,style()),b=createWall(nodes,false,{...style(),strokeWidth:60,opacity:.4}),initial={...SIMPLE_WALL},draft={...initial,strokeWidth:36}
  expect(applyWallStyleChanges({...initial,opacity:.4},initial,draft)).toMatchObject({strokeWidth:36,opacity:.4})
  project.getState().addPath(a);project.getState().addPath(b);history.reset()
  project.getState().updateWallStyles([a.id,b.id],old=>({...old,wall:{...old.wall,material:{...old.wall.material!,seed:77}}}))
  expect(useHistoryStore.getState().undoCount).toBe(1);history.undo();expect(project.getState().objects).toEqual([a,b]);history.redo()
  expect((project.getState().objects[1] as typeof b).opacity).toBe(.4)
})
it('copies Area outer/holes once, keeps source intact and respects locked target with atomic undo',()=>{
  const area=createArea(rectangleGeometry({x:100,y:100,width:300,height:200}));project.getState().addArea(area);history.reset()
  project.getState().createBoundaryWalls(area.id,style(),true,false)
  expect(project.getState().objects[0]).toEqual(area);expect(project.getState().objects).toHaveLength(2);expect(useHistoryStore.getState().undoCount).toBe(1)
  history.undo();expect(project.getState().objects).toEqual([area]);history.redo();expect(project.getState().objects).toHaveLength(2)
  project.setState({layers:project.getState().layers.map(l=>({...l,locked:true}))});expect(()=>project.getState().createBoundaryWalls(area.id,style(),true,false)).toThrow(/unlocked/)
})
it('opens a material-only missing atlas as an editable warned fallback, without substituting export bytes',async()=>{
  const wall=createWall(nodes,false,style()),now=new Date().toISOString(),state=project.getState()
  vi.stubGlobal('fetch',async(url:string)=>url.endsWith('/health')?Response.json({generation:'missing-wall-test',instanceId:'test'}):Response.json({code:'ASSET_UNREADABLE',message:'Missing image'},{status:409}))
  try{
    const prepared=await preparedDocument({formatVersion:8,id:'missing-art',name:'Repair wall',createdAt:now,modifiedAt:now,map:state.map,objects:[wall],layers:[{...state.layers[0],objectIds:[wall.id]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[{id:'atlas',kind:'fillPattern',fileName:'atlas.png',mimeType:'image/png',width:100,height:100,hash:'a'.repeat(64),path:'assets/atlas.png'}]})
    expect(prepared.assets.get('atlas')?.unavailable).toBe(true);applyPrepared(prepared,()=>true)
    expect(useProjectSession.getState().warning).toContain('remain editable')
    expect(project.getState().objects[0]).toEqual(wall);await expect(resolveAsset('atlas')).rejects.toThrow('unavailable')
    project.getState().updateWallStyles([wall.id],SIMPLE_WALL);expect((project.getState().objects[0] as typeof wall).wall?.material).toBeUndefined();history.undo();expect(project.getState().objects[0]).toEqual(wall)
  }finally{vi.unstubAllGlobals()}
})
