import { expect, it } from 'vitest'
import { generatedDefinition, generatedWallStyle, ROOT_WIDTHS } from './generatedWalls'
import { generatedPlacements, rootRunCount } from './generatedWallGeometry'
import { createWall, SIMPLE_WALL } from './walls'
import { createOpening, openingPlacement } from './openings'
import { validatePath, withPathGeometry } from './paths'
import { defaultMapStyle } from './mapSettings'
import { mapWorkspace } from './geography'
import { parseProject } from '../projects/format'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history } from '../store/history'
const map={...defaultMapStyle(),...mapWorkspace({}),width:1200,height:900,background:null}
const style=()=>generatedWallStyle(SIMPLE_WALL,map,'sung-wood','dev-1')
const node=(id:string,x:number,y:number)=>({id,x,y,mode:'corner' as const})
const shapes={straight:[node('a',100,200),node('b',1000,200)],broad:[{...node('a',100,200),out:{x:230,y:-160}},{...node('b',1000,200),in:{x:-230,y:-160}}],tight:[{...node('a',100,200),out:{x:0,y:100}},{...node('b',260,200),in:{x:0,y:100}}],S:[{...node('a',100,200),out:{x:230,y:-160}},{...node('b',1000,200),in:{x:-230,y:160}}],corner:[node('a',100,200),node('b',600,200),node('c',600,650)]}
it('uses the existing bundle with five minimal DEV roles and restrained defaults, preserving production materials',()=>{
  const d=generatedDefinition({id:'sung-wood',revision:'dev-1'})
  expect(d.generatorType).toBe('living-root');expect(d.components).toHaveLength(5);expect(d.defaults).toEqual({width:1,organic:.08,growth:0,overgrowth:0});expect(new Set(d.components.map(c=>c.role)).size).toBe(5)
  expect(generatedDefinition({id:'living-root',revision:'production-1'}).defaults).toEqual({width:1,organic:.55,growth:.45,overgrowth:.15});expect(generatedDefinition({id:'refined-timber',revision:'production-1'}).generatorType).toBe('linear')
})
it.each(Object.entries(shapes))('supports %s at every physical width without decorative scene objects',(_,nodes)=>{
  for(const ft of Object.values(ROOT_WIDTHS)){
    const wall=createWall(nodes,false,{...style(),strokeWidth:ft*10}),parts=generatedPlacements(wall)
    expect(parts.length).toBeGreaterThan(1);expect(new Set(parts.filter(p=>p.component.role!=='knot').map(p=>p.run)).size).toBe(rootRunCount(ft));expect(parts.every(p=>Number.isFinite(p.x+p.y+p.width+p.height+p.angle)&&p.width>0&&p.height>0)).toBe(true)
    expect(parts.some(p=>p.component.role==='moss'||p.component.role==='leaves'||p.component.role==='root-small')).toBe(false);expect(parts).toEqual(generatedPlacements(validatePath(JSON.parse(JSON.stringify(wall)))))
  }
})
it('handles native openings and both open/closed paths while preserving exact project/history semantics',()=>{
  const wall=createWall(shapes.straight,false,style()),door=createOpening(wall,.5,'door',60),parts=generatedPlacements(wall,[door]),cut=openingPlacement(door,wall)
  expect(parts.every(p=>p.distance<cut.start||p.distance>cut.end)).toBe(true);expect(parts.some(p=>p.component.role==='root-end')).toBe(true)
  const closed=createWall([node('a',100,100),node('b',400,100),node('c',400,400),node('d',100,400)],true,style());expect(generatedPlacements(closed).some(p=>p.component.role==='root-end')).toBe(false)
  const layers=[{id:'walls',name:'Walls',visible:true,locked:false,objectIds:[wall.id,door.id]}],tree={roots:['walls'],groups:[]}
  const document={formatVersion:12,id:'sung-test',name:'DEV',createdAt:'2026-10-04T00:00:00.000Z',modifiedAt:'2026-10-04T00:00:00.000Z',map,objects:[wall,door],layers,layerTree:tree,objectGroups:[],assets:[]}
  expect(parseProject(JSON.parse(JSON.stringify(document))).objects).toEqual([wall,door]);project.setState({...document});editor.setState({activeLayerId:'walls',selectedObjectIds:[wall.id],soloLayerId:null});history.reset()
  project.getState().updateWallStyles([wall.id],s=>({...s,wall:{...s.wall,generated:{...s.wall.generated!,seed:77}}}));const after=project.getState().objects;history.undo();expect(project.getState().objects).toEqual([wall,door]);history.redo();expect(project.getState().objects).toEqual(after)
  const changed=withPathGeometry(wall,shapes.S);expect(generatedPlacements(changed)).not.toEqual(parts);expect(project.getState().objects.some(o=>o.kind==='stamp')).toBe(false)
})
