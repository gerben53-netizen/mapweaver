import { useRef } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useStampPlacement } from '../canvas/useStampPlacement'
import { useEditorStore as editor } from '../store/editorStore'
import { useProjectStore as project } from '../store/projectStore'
import { history, useHistoryStore } from '../store/history'
import { installProjectAssets } from '../projects/assets'
import { defaultMapStyle } from '../domain/mapSettings'
import { createLayeredContent } from '../domain/layers'
import type { TypedAsset } from '../domain/models'
import { useStampGhost, activateStamp, beginStampDrag, useStampDrag, stampPlacementError } from './stampPlacement'
import { handleEditorShortcut } from '../store/shortcuts'
import { libraryRepository } from '../storage/libraryRepository'
import { placementSize } from '../domain/placement'
const asset: TypedAsset = { id:'bookcase',kind:'stamp',name:'Bookcase',naturalWidth:400,naturalHeight:200,mimeType:'image/png',contentHash:'a'.repeat(64),categoryId:'room',createdAt:'',sizing:{sizingMode:'world',defaultWidth:20,defaultHeight:null,sizingUnit:'ft',sizingScope:'battlemap',aspectRatioLocked:true,applicableMapTypes:['battlemap']} }
vi.mock('../images/imageCache', () => ({ acquireAssetImage: () => ({ promise: Promise.resolve({ width:400,height:200 }),release:vi.fn() }) }))
vi.mock('../storage/libraryRepository', () => ({ libraryRepository: { getAsset:vi.fn(),getThumbnail:vi.fn(async()=>new Blob(['thumb'])),getBlob:vi.fn(async()=>new Blob(['image'])) } }))
beforeEach(() => {
  project.setState({ map:{width:1000,height:800,background:null,...defaultMapStyle(),mapType:'battlemap',grid:{...defaultMapStyle().grid,cellSize:50,snapEnabled:true,physicalScale:{unit:'ft',distancePerCell:5}}},...createLayeredContent() })
  editor.setState({activeTool:'select',workspace:'editor',stampAsset:null,activeLayerId:'objects',soloLayerId:null,viewport:{zoom:1,pan:{x:0,y:0}},message:''})
  installProjectAssets(new Map()); history.reset(); vi.mocked(libraryRepository.getAsset).mockResolvedValue(asset)
  useStampDrag.setState({id:'',source:''});useStampGhost.setState({asset:null,point:null,error:''})
})
function Harness() { const ref=useRef<HTMLDivElement>(null);useStampPlacement(ref);return <div data-mapweaver-editor onKeyDown={e=>handleEditorShortcut(e.nativeEvent)}><div ref={ref} tabIndex={0} aria-label="Canvas"/></div> }
function pointer(type:string,x=106,y=108) { const e=new MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperty(e,'pointerId',{value:1});fireEvent(screen.getByLabelText('Canvas'),e) }
it('ten clicks produce ten native individually undoable stamps on the active layer, with world-sized snapped ghosts and Escape exit',async()=>{
  render(<Harness/>);await act(()=>activateStamp(asset.id))
  pointer('pointermove');expect(useStampGhost.getState()).toMatchObject({asset:{id:'bookcase'},point:{x:106,y:108},error:''})
  expect(placementSize(asset,project.getState().map)).toEqual({width:200,height:100})
  for(let i=0;i<10;i++){pointer('pointerdown');pointer('pointerup')}
  expect(project.getState().objects).toHaveLength(10);expect(useHistoryStore.getState().undoCount).toBe(10)
  expect(project.getState().objects[0]).toMatchObject({kind:'stamp',assetId:asset.id,x:0,y:50,width:200,height:100})
  expect(project.getState().layers.find(l=>l.id==='objects')?.objectIds).toHaveLength(10)
  expect(editor.getState().activeTool).toBe('placeStamp')
  act(()=>{history.undo();history.undo();history.undo()});expect(project.getState().objects).toHaveLength(7)
  act(()=>{history.redo();history.redo();history.redo()});expect(project.getState().objects).toHaveLength(10)
  pointer('pointerdown');fireEvent.keyDown(screen.getByLabelText('Canvas'),{key:'Escape'});pointer('pointerup')
  expect(editor.getState().activeTool).toBe('select');expect(project.getState().objects).toHaveLength(10)
})
it('rejects locked destinations, incompatible types and out-of-map positions without a fallback layer',async()=>{
  await activateStamp(asset.id);render(<Harness/>);act(()=>project.setState(s=>({layers:s.layers.map(l=>({...l,locked:true}))})))
  pointer('pointermove');expect(useStampGhost.getState().error).toMatch(/locked/);pointer('pointerdown');pointer('pointerup');expect(project.getState().objects).toHaveLength(0)
  expect(stampPlacementError({...asset,sizing:{...asset.sizing!,applicableMapTypes:['world-map']}})).toMatch(/compatible/)
  act(()=>project.setState(s=>({layers:s.layers.map(l=>({...l,locked:false}))})))
  expect(stampPlacementError(asset,{x:-10,y:0})).toMatch(/inside/)
})
it('latest asynchronous asset choice wins and a switched tool cannot reactivate placement',async()=>{
  let resolve!: (a: TypedAsset)=>void
  vi.mocked(libraryRepository.getAsset).mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
  const first=activateStamp('slow');await activateStamp('fast');resolve({...asset,id:'slow'});await first
  expect(editor.getState().stampAsset?.id).toBe(asset.id)
  vi.mocked(libraryRepository.getAsset).mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
  const pending=activateStamp('slow');editor.setState({activeTool:'select'});resolve(asset);await pending
  expect(editor.getState().activeTool).toBe('select')
})
it('Library and Palette drag payloads create exactly one stamp without changing the prior tool',async()=>{
  render(<Harness/>)
  for(const source of ['library','palette'] as const){
    const values=new Map<string,string>(),dt={setData:(k:string,v:string)=>values.set(k,v),getData:(k:string)=>values.get(k),types:['application/x-mapweaver-stamp'],effectAllowed:'',dropEffect:''}
    beginStampDrag({dataTransfer:dt} as never,asset.id,source)
    await waitFor(()=>expect(useStampGhost.getState().asset?.id).toBe(asset.id))
    fireEvent.dragOver(screen.getByLabelText('Canvas'),{dataTransfer:dt,clientX:200,clientY:200})
    fireEvent.drop(screen.getByLabelText('Canvas'),{dataTransfer:dt,clientX:200,clientY:200})
    await waitFor(()=>expect(project.getState().objects).toHaveLength(source==='library'?1:2))
    expect(editor.getState().activeTool).toBe('select')
  }
})

it('adopts a colliding family cover once, so repeated placement survives history resource pruning',async()=>{
  const family={id:'bookcase-family',revision:1,displayName:'Bookcase',anchor:'center' as const,coverVariantId:'cover',variants:[{id:'cover',assetId:asset.id,weight:1},{id:'other',assetId:'other-image',weight:1}]}
  const chosen={...asset,family},other={...asset,id:'other-image',contentHash:'c'.repeat(64)}
  installProjectAssets(new Map([[asset.id,{blob:new Blob(['old']),manifest:{id:asset.id,kind:'stamp',fileName:'Existing unrelated image',mimeType:'image/png',width:10,height:10,hash:'b'.repeat(64),path:'assets/old.png'}}]]))
  vi.mocked(libraryRepository.getAsset).mockImplementation(async id=>id===asset.id?chosen:other)
  render(<Harness/>);await act(()=>activateStamp(asset.id));const prepared=editor.getState().stampAsset!
  expect(prepared.id).not.toBe(asset.id);expect(prepared.family!.variants[0].assetId).toBe(prepared.id)
  for(let i=0;i<3;i++){pointer('pointerdown');pointer('pointerup')}
  expect(project.getState().objects).toHaveLength(3);expect(useHistoryStore.getState().undoCount).toBe(3)
})
