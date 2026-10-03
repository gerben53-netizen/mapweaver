import { expect, it } from 'vitest'
import { sceneTree, filterSceneTree, visibleSceneRows, sceneIcon, createSceneContentSelector } from './sceneTree'
import { createWall } from './walls'
import { createOpening, reconcileOpenings } from './openings'
import { moveSceneObjects } from './sceneMove'
import { sceneFixture } from './scene.fixture'
import { validateObjectGroups } from './grouping'
it('projects top-level layers, groups and exact unique objects without rewriting interleaved z-order',()=>{
  const source=sceneFixture(),before=JSON.stringify(source),tree=sceneTree(source,new Map()),rows=visibleSceneRows(tree,new Set())
  expect(tree.map(n=>[n.id,n.depth,n.context])).toEqual([['library',0,'Ground floor'],['hall',0,'Ground floor']])
  expect(rows.map(n=>[n.id,n.depth])).toEqual([['library',0],['shelves',1],['c',2],['a',2],['b',1],['hall',0],['d',1]])
  expect(new Set(rows.map(n=>n.id)).size).toBe(rows.length);expect(JSON.stringify(source)).toBe(before)
  expect(sceneIcon('wall')).toBe('wall');expect(sceneIcon('door')).toBe('opening');expect(sceneIcon('title')).toBe('map');expect(sceneIcon('label')).toBe('label');expect(sceneIcon('river')).toBe('route');expect(sceneIcon('place')).toBe('place')
})
it('retains ancestors under search/type/scope and temporarily reveals matches without changing collapse state',()=>{
  const tree=sceneTree(sceneFixture(),new Map()),filter={query:'archiefkast',type:'stamp' as const,scope:'all' as const,activeLayerId:'hall'}
  const result=filterSceneTree(tree,filter)
  expect(visibleSceneRows(result,new Set(['library','shelves']),true).map(n=>n.id)).toEqual(['library','shelves','a'])
  expect(visibleSceneRows(tree,new Set(['shelves'])).map(n=>n.id)).toEqual(['library','shelves','b','hall','d'])
  expect(filterSceneTree(tree,{...filter,query:'',scope:'active'}).map(n=>n.id)).toEqual(['hall'])
  expect(filterSceneTree(tree,{...filter,type:'wall'})).toEqual([])
})
it('distinguishes inherited flags from direct state through retained layer groups and object groups',()=>{
  const s=sceneFixture();s.layerTree!.groups[0].locked=true;s.objectGroups![0].visible=false
  const rows=visibleSceneRows(sceneTree(s,new Map()),new Set()),child=rows.find(n=>n.id==='a')!
  expect(child).toMatchObject({visible:false,locked:true,ownVisible:true,ownLocked:false,inheritedHidden:true,inheritedLocked:true})
  expect(rows.find(n=>n.id==='library')).toMatchObject({locked:true,ownLocked:false,inheritedLocked:true})
})
it('atomically moves an object into a group, out to its layer root and across layers with valid membership',()=>{
  let s=sceneFixture();const original=JSON.stringify(s)
  s={...s,...moveSceneObjects(s,['b'],{layerId:'library',groupId:'shelves'})}
  expect(s.objectGroups![0].objectIds).toContain('b')
  s={...s,...moveSceneObjects(s,['a'],{layerId:'library'})};expect(s.objectGroups![0].objectIds).not.toContain('a')
  s={...s,...moveSceneObjects(s,['c'],{layerId:'hall'})};expect(s.layers[1].objectIds).toEqual(['d','c']);expect(s.objectGroups![0].objectIds).toEqual(['b'])
  expect(validateObjectGroups(s.objectGroups,s.layers,s.objects)).toEqual(s.objectGroups)
  expect(s.objects).toEqual(JSON.parse(original).objects)
})
it('maps before/after to back-to-front IDs and rejects hidden/locked parents and invalid anchors',()=>{
  const s=sceneFixture(),next=moveSceneObjects(s,['a'],{layerId:'library',groupId:'shelves',anchorId:'c',edge:'before'})
  expect(next.layers[0].objectIds).toEqual(['b','c','a'])
  expect(()=>moveSceneObjects(s,['a'],{layerId:'library',groupId:'shelves',anchorId:'b'})).toThrow(/parent/)
  s.layers[1].locked=true;expect(()=>moveSceneObjects(s,['a'],{layerId:'hall'})).toThrow(/destination/)
  s.objectGroups![0].locked=true;expect(()=>moveSceneObjects(s,['a'],{layerId:'library'})).toThrow(/Unlock/)
})
it('keeps projection references stable during canvas transforms but updates scene metadata',()=>{
  const s=sceneFixture(),select=createSceneContentSelector(),first=select(s)
  expect(select({...s,objects:s.objects.map(o=>({...o,x:o.x+10}))})).toBe(first)
  expect(select({...s,objects:s.objects.map(o=>({...o,name:'Changed'}))})).not.toBe(first)
})
it('moves wall assemblies together and rejects unsafe opening-only grouping without mutation',()=>{
  const s=sceneFixture(),wall=createWall([{id:'p',x:0,y:0,mode:'corner'},{id:'q',x:400,y:0,mode:'corner'}]),door=createOpening(wall,.5,'door',50)
  s.objects.push(wall,door);s.layers[0].objectIds.push(wall.id,door.id)
  const before=structuredClone(s)
  expect(()=>moveSceneObjects(s,[door.id],{layerId:'library',groupId:'shelves'})).toThrow(/wall/)
  expect(s).toEqual(before)
  const moved=moveSceneObjects(s,[wall.id],{layerId:'hall'})
  expect(moved.layers[1].objectIds).toEqual(['d',wall.id,door.id]);expect(()=>reconcileOpenings(s.objects,moved.layers)).not.toThrow()
  expect(s.objects).toEqual(before.objects)
})
