import { expect, it } from 'vitest'
import { validTransform, parseNumericProperty } from './transforms'
import { normalizePattern, DEFAULT_PATTERN } from './patterns'
import { importBackground } from '../imports/importBackground'
import { newProject } from '../projects/session'
import { useProjectStore as project } from '../store/projectStore'
it('MW-AUD-003 rejects geometry that cannot be serialized before it reaches project state', () => {
  expect(parseNumericProperty('1000000001')).toBeNull()
  expect(validTransform({x:1e9+1,y:0,width:10,height:10,rotation:0,scaleX:1,scaleY:1})).toBe(false)
  expect(()=>normalizePattern({...DEFAULT_PATTERN,patternOffsetX:1e9+1})).toThrow()
})
it('MW-AUD-004 rejects a background decode that finishes after the project was replaced', async () => {
  newProject('Before',600,400,'#ffffff',()=>true)
  let finish!: (image: {blob:Blob;mimeType:string;width:number;height:number})=>void
  const pending=importBackground(new File(['x'],'background.png'),()=>true,()=>new Promise(resolve=>{finish=resolve}))
  newProject('After',800,500,'#ffffff',()=>true)
  const before=project.getState().map
  finish({blob:new Blob(['x']),mimeType:'image/png',width:100,height:100})
  await expect(pending).rejects.toThrow(/project changed/i)
  expect(project.getState().map).toBe(before)
})
import { resourcesFit, registerResource, installProjectAssets } from '../projects/assets'
it('MW-AUD-010 budgets unique decoded sources, deduplicates hashes and resets on project replacement', () => {
  installProjectAssets(new Map())
  const ids = new Set<string>()
  for (let i = 0; i < 4; i++) { const id = `large-${i}`; ids.add(id); registerResource(id, id, 1024, 24000000) }
  expect(resourcesFit(ids)).toBe(true)
  registerResource('copy', 'large-0', 1024, 24000000); ids.add('copy')
  expect(resourcesFit(ids)).toBe(true)
  registerResource('fifth', 'fifth', 1024, 24000000); ids.add('fifth')
  expect(resourcesFit(ids)).toBe(false)
  registerResource('bytes', 'bytes', 128 * 1024 * 1024, 1)
  expect(resourcesFit(new Set(['bytes']))).toBe(false)
  installProjectAssets(new Map())
  expect(resourcesFit(ids)).toBe(true)
})
import { DOCUMENT_LIMITS } from './documentLimits'
import { createLayeredContent } from './layers'
import { useEditorStore as editor } from '../store/editorStore'
import { history } from '../store/history'
it('MW-AUD-003 refuses layer and duplicate overflow without creating history or corrupting references', () => {
  newProject('Limits', 600, 400, '#ffffff', () => true)
  const layers = Array.from({ length: DOCUMENT_LIMITS.layers }, (_, i) => ({ id: `layer-${i}`, name: `Layer ${i}`, visible: true, locked: false, objectIds: [] }))
  project.setState({layers}); history.reset(); project.getState().addLayer(); expect(project.getState().layers).toHaveLength(DOCUMENT_LIMITS.layers)
  const objects = Array.from({length: DOCUMENT_LIMITS.objects},(_,i)=>({kind:'stamp' as const,id:`object-${i}`,assetId:'asset',x:0,y:0,width:10,height:10,rotation:0,scaleX:1,scaleY:1,opacity:1}))
  project.setState(createLayeredContent(objects)); history.reset(); editor.setState({ selectedObjectIds:['object-0'], activeLayerId:'objects' })
  project.getState().duplicate(); expect(project.getState().objects).toHaveLength(DOCUMENT_LIMITS.objects); expect(project.getState().layers[0].objectIds).toHaveLength(DOCUMENT_LIMITS.objects)
  newProject('Fresh',600,400,'#ffffff',()=>true)
})
it('MW-AUD-003 rejects oversized completed metadata atomically while allowing a reduction', () => {
  newProject('Metadata',600,400,'#ffffff',()=>true)
  const before = project.getState().objects
  const objects = Array.from({length:9000},(_,i)=>({kind:'patternFill' as const,id:crypto.randomUUID(),assetId:crypto.randomUUID(),x:i+Number("0.123456789012345"),y:Number("234.23456789012345"),width:Number("345.34567890123456"),height:Number("456.45678901234567"),opacity:Number("0.8765432109876543"),rotation:0 as const,scaleX:1 as const,scaleY:1 as const,mode:'repeat' as const,patternScale:Number("1.2345678901234567"),patternRotation:Number("23.123456789012345"),patternOffsetX:Number("12.345678901234567"),patternOffsetY:Number("23.456789012345678")}))
  history.run('Oversized edit',()=>project.setState(createLayeredContent(objects)))
  expect(project.getState().objects).toEqual(before)
  expect(editor.getState().message).toContain('metadata budget')
  project.setState(createLayeredContent(objects)); history.reset(); editor.setState({ selectedObjectIds:[objects[0].id] }); project.getState().deleteSelection()
  expect(project.getState().objects).toHaveLength(8999)
  newProject('Fresh',600,400,'#ffffff',()=>true)
})
