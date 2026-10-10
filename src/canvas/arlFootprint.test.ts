import { defaultGeography } from '../domain/geography'
import { expect, it } from 'vitest'
import { contactShadowOpacity } from './architecturalReadability'
import { DEFAULT_ARCHITECTURAL_SHADOW as d, effectiveContactShadow, validateRendering } from '../domain/rendering'
import { defaultMapStyle } from '../domain/mapSettings'
import { arlBatches } from './architecturalReadability'
import { arlKey } from './drawArchitecturalReadability'
import { createWall, SIMPLE_WALL } from '../domain/walls'
import { generatedWallStyle } from '../domain/generatedWalls'
import { history } from '../store/history'
import { useProjectStore } from '../store/projectStore'
import { encodeProject, decodeProject } from '../projects/archive'
const map = { ...defaultMapStyle(), width: 600, height: 400, background: null, rendering: undefined, mapType: "battlemap" as const, geography: defaultGeography("battlemap") }
it('core, tail and opacity are independent, bounded and explicitly disableable', () => {
  expect(contactShadowOpacity(2,d)).toBe(.55)
  expect(contactShadowOpacity(4,d)).toBeLessThan(.55)
  expect(contactShadowOpacity(10,d)).toBe(0)
  expect(contactShadowOpacity(9,{...d,opacity:.2})).toBeCloseTo(contactShadowOpacity(9,d)*.2/.55)
  expect(contactShadowOpacity(4,{...d,core:0})).toBeLessThan(contactShadowOpacity(4,d))
  expect(contactShadowOpacity(4,{...d,falloff:0})).toBe(0)
  expect(contactShadowOpacity(2,{...d,enabled:false})).toBe(0)
  expect(contactShadowOpacity(0,{...d,core:0,falloff:0})).toBe(0)
  for(const v of [{...d,core:9},{...d,falloff:-1},{...d,opacity:.81},{...d,enabled:0},{...d,core:NaN}]) expect(()=>validateRendering({contactShadow:v})).toThrow()
})
it('uses union batches on an empty canvas and ignores floor/material data in ARL cache', () => {
  const w=createWall([{id:'a',x:40,y:40,mode:'corner'},{id:'b',x:350,y:200,mode:'corner'}],false,generatedWallStyle(SIMPLE_WALL,map,'living-root','production-1'))
  const b=arlBatches(map,[w],'C')[0]
  expect(b.walls).toEqual([w]);expect(b.floors).toEqual([])
  const key=arlKey(b,map,[w],'C')
  expect(arlKey(b,{...map,backgroundColor:'#000000'},[w],'C')).toBe(key)
  expect(arlKey(b,{...map,rendering:{contactShadow:{...d,core:6}}},[w],'C')).not.toBe(key)
  expect(arlKey(b,{...map,rendering:{contactShadow:{...d,enabled:false}}},[w],'C')).not.toBe(key)
})
it('missing settings inherit defaults while explicit false and zeros survive undo and archive reload', async () => {
  expect(effectiveContactShadow(map)).toEqual(d)
  const disabled={enabled:false,core:0,falloff:0,opacity:0},m={...map,rendering:{arl:'C' as const,contactShadow:disabled}}
  expect(effectiveContactShadow(m)).toEqual(disabled)
  useProjectStore.setState({map,objects:[],layers:[{id:"objects",name:"Objects",visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:null});history.reset()
  useProjectStore.getState().applyMapSettings(m,()=>true)
  expect(history.undo()).toBe(true);expect(effectiveContactShadow(useProjectStore.getState().map)).toEqual(d)
  expect(history.redo()).toBe(true);expect(effectiveContactShadow(useProjectStore.getState().map)).toEqual(disabled)
  const now=new Date().toISOString(),document={formatVersion:12 as const,id:'qa',name:'QA',createdAt:now,modifiedAt:now,map:m,objects:[],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]}
  expect((await decodeProject(await encodeProject({document,assets:new Map()}))).document.map.rendering).toEqual(m.rendering)
})
