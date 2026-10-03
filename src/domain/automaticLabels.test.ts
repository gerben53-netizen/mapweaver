import { describe, expect, it } from 'vitest'
import { createArea, rectangleGeometry } from './areas'
import { defaultLandArea } from './landAreas'
import { createPlace, createLabel } from './annotations'
import { createRoute, routePreset } from './routes'
import { defaultMapStyle } from './mapSettings'
import { defaultGeography } from './geography'
import { labelSource, generateAutomaticLabels, AUTO_LABEL_DEFAULTS, interiorCandidates, readableAngle, labelBox } from './automaticLabels'
import { automaticLabelStyle } from './automaticLabelStyle'
import { automaticLabelFingerprint, validateAutomaticLabel } from './automaticLabelMetadata'
import { pointInArea } from './scatter'
import type { MapObject, MapDocument } from './models'
import type { ProjectSnapshot } from '../store/history'
export const labelMap:MapDocument={...defaultMapStyle(),width:1600,height:1000,mapType:'world-map',geography:defaultGeography('world-map'),background:null}
export const region=(id='region',x=100,y=100,w=600,h=400)=>({...createArea(rectangleGeometry({x,y,width:w,height:h})),id,name:'Amber Reach',land:defaultLandArea('terrain-region')})
export const labelFixture=(objects:MapObject[]):ProjectSnapshot=>({map:labelMap,objects,layers:[{id:'source',name:'Sources',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['source'],groups:[]}})
const generate=(objects:MapObject[])=>generateAutomaticLabels(labelFixture(objects),{...AUTO_LABEL_DEFAULTS,density:'high'})
const city=(id:string,name:string,x=800,y=500,type='city')=>({...createPlace({x,y},name,type,labelMap),id,importance:3})
describe('automatic native label layout',()=>{
 it('classifies named semantic sources without inventing names or labeling stamps',()=>{
  expect(labelSource(region())?.category).toBe('regions');expect(labelSource(city('c','Aster'))?.labelClass).toBe('majorCity');expect(labelSource(city('l','Ancient gate',800,500,'landmark'))?.category).toBe('landmarks')
  expect(labelSource({...region(),name:'Mirror lake',land:{...defaultLandArea(),labelKind:'waterMinor'}})?.category).toBe('water');expect(labelSource({...region(),name:'Iron Peaks',land:{...defaultLandArea(),terrain:'mountains'}})?.labelClass).toBe('mountainRange');expect(labelSource({...region(),name:'Landmass'})).toBeNull()
 })
 it('uses relative theme hierarchy and boxless distinct water text',()=>{
  const m={...labelMap,theme:{version:1 as const,id:'world.darkFantasy',map:{},managed:{}}},major=automaticLabelStyle(m,'majorRegion','Amber'),capital=automaticLabelStyle(m,'capital','Aster'),village=automaticLabelStyle(m,'settlement','Brook'),water=automaticLabelStyle(m,'river','Silverwater')
  expect(major.size).toBeGreaterThan(capital.size);expect(capital.size).toBeGreaterThan(village.size);expect(water).toMatchObject({italic:true,backgroundOpacity:0,font:'spectral',color:'#d1e6e6'});expect(major.strokeWidth).toBeGreaterThan(0)
 })
 it('finds an interior visual center in a concave region with a poor bbox center',()=>{
  const o={...createArea({polygons:[{outer:[{x:100,y:100},{x:600,y:100},{x:600,y:250},{x:250,y:250},{x:250,y:600},{x:100,y:600}],holes:[]}]}),name:'Crooked Reach'}
  expect(pointInArea({x:350,y:350},o.geometry)).toBe(false);expect(interiorCandidates(o).length).toBeGreaterThan(1);expect(interiorCandidates(o).every(p=>pointInArea(p,o.geometry))).toBe(true)
  const label=generate([o]).labels[0];expect(label.visible).not.toBe(false);expect(pointInArea({x:label.x+label.width/2,y:label.y+label.height/2},o.geometry)).toBe(true)
 })
 it('places labels outside marker icons and avoids existing manual labels',()=>{
  const a=city('a','Aster'),manual=createLabel({x:980,y:500},'Protected cartouche'),result=generate([a,manual]),label=result.labels[0],box=labelBox(label)
  expect(label.ownerId).toBe('a');expect(box.x>=a.x+a.width||box.x+box.width<=a.x||box.y>=a.y+a.height||box.y+box.height<=a.y).toBe(true);expect(result.remove).not.toContain(manual.id)
 })
 it('never duplicates a linked marker label, including hidden labels or disabled marker labels',()=>{
  const a=city('a','Aster'),manual={...createLabel({x:0,y:0},'Custom city name',a),visible:false};expect(generate([a,manual]).labels).toHaveLength(0)
 })
 it('honors priorities and suppresses low priority collisions without deleting sources',()=>{
  const capital=city('capital','Aster',800,500,'capital'),villages=Array.from({length:20},(_,i)=>city('v'+i,'Long village '+i,800,500,'village')),result=generate([...villages,capital])
  expect(result.labels[0].automatic?.sourceId).toBe('capital');expect(result.labels[0].visible).not.toBe(false);expect(result.suppressed).toBeGreaterThan(0);expect(result.labels.filter(o=>o.visible===false).every(o=>o.automatic?.suppressed)).toBe(true)
 })
 it('keeps density independent of font size and suppresses border/map clipping',()=>{
  const objects=[city('c','Aster',100,100,'capital'),city('v','Brook',800,500,'village')],snapshot=labelFixture(objects),low=generateAutomaticLabels(snapshot,{...AUTO_LABEL_DEFAULTS,density:'low'}),high=generate(objects)
  expect(low.labels).toHaveLength(1);expect(high.labels).toHaveLength(2);expect(low.labels[0].style.size).toBe(high.labels[0].style.size)
  const tiny={...snapshot,map:{...labelMap,width:50,height:50},objects:[city('tiny','Very long impossible name',25,25)]};tiny.layers=[{...snapshot.layers[0],objectIds:['tiny']}];expect(generateAutomaticLabels(tiny,AUTO_LABEL_DEFAULTS).suppressed).toBe(1)
 })
 it('aligns river labels to a long clear segment in readable orientation',()=>{
  const river={...createRoute([{id:'a',x:1200,y:650,mode:'corner'},{id:'b',x:500,y:350,mode:'corner'}],false,routePreset('river')),name:'Silverwater'},label=generate([river]).labels[0]
  expect(label.automatic?.labelClass).toBe('river');expect(label.visible).not.toBe(false);expect(label.rotation<=90||label.rotation>=270).toBe(true);expect(label.rotation).not.toBe(0);expect(readableAngle(-1,-1)).toBe(45)
 })
 it('retains manual overrides and cleans only unmodified orphan automatic labels',()=>{
  const source=region(),initial=generate([source]).labels[0],manual={...initial,x:initial.x+20},snapshot=labelFixture([source,manual]);expect(generateAutomaticLabels(snapshot,AUTO_LABEL_DEFAULTS).labels).toHaveLength(0)
  expect(generate([initial]).remove).toContain(initial.id);expect(generate([manual]).remove).not.toContain(initial.id);expect(initial.automatic?.baseline).toBe(automaticLabelFingerprint(initial))
 })
 it('preserves unselected categories, hidden/locked source layers, and validates metadata',()=>{
  const source=region(),label=generate([source]).labels[0],snapshot=labelFixture([source,label]);snapshot.layers[0].locked=true;expect(generateAutomaticLabels(snapshot,AUTO_LABEL_DEFAULTS).remove).toEqual([])
  expect(()=>validateAutomaticLabel({...label.automatic!,version:2 as 1})).toThrow();expect(generateAutomaticLabels(labelFixture([source,label]),{categories:['rivers'],density:'high'}).remove).toEqual([])
 })
})
