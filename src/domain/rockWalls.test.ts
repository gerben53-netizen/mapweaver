import { expect, it } from 'vitest'
import { generatedDefinition, generatedWallStyle, validateGeneratedDefinition } from './generatedWalls'
import { generatedPlacements } from './generatedWallGeometry'
import { createWall, SIMPLE_WALL } from './walls'
import { defaultMapStyle } from './mapSettings'
import { pathGeometry, pointAtDistance, validatePath } from './paths'
import { createOpening, openingPlacement } from './openings'

const map = {...defaultMapStyle(),width:400,height:300,background:null}
const style = () => generatedWallStyle(SIMPLE_WALL,map,'cave-rock','dev-1')
const nodes = [{id:'a',x:20,y:40,mode:'corner' as const},{id:'b',x:380,y:40,mode:'corner' as const}]
it('admits the immutable rock vocabulary/defaults and rejects cross-strategy parameters', () => {
  const d = generatedDefinition({id:'cave-rock',revision:'dev-1'})
  expect(validateGeneratedDefinition(d)).toBe(d); expect(d.components).toHaveLength(9)
  expect(style().wall.generated).toMatchObject({roughness:.55,variation:.7,seed:1})
  for (const patch of [{components:[]},{defaults:{...d.defaults,roughness:2}},{defaults:{...d.defaults,regularity:.5}},{components:d.components.map(c=>({...c,role:'block-small'}))}]) expect(()=>validateGeneratedDefinition({...d,...patch})).toThrow()
  const w = createWall(nodes,false,style())
  for (const patch of [{roughness:undefined},{variation:NaN},{regularity:.5},{organic:.5}]) expect(()=>validatePath({...w,wall:{...w.wall!,generated:{...w.wall!.generated!,...patch}}})).toThrow()
})
it('is deterministic, uses independent physical masses and bounds width without stretching', () => {
  const w = createWall(nodes,false,style()), a = generatedPlacements(w)
  expect(a).toEqual(generatedPlacements(validatePath(JSON.parse(JSON.stringify(w)))))
  for (const field of ['seed','roughness','variation'] as const) expect(generatedPlacements({...w,wall:{...w.wall!,generated:{...w.wall!.generated!,[field]:field==='seed'?83:0}}})).not.toEqual(a)
  for (const width of [5,10,20,30]) {
    const parts = generatedPlacements(createWall(nodes,false,{...style(),strokeWidth:width}))
    expect(parts.every(p=>p.width===p.height&&p.width<=16.65)).toBe(true)
    expect(parts.every(p=>Math.abs(p.y-40)<width*.9)).toBe(true)
  }
  expect(JSON.stringify(w)).not.toContain('placements')
})
it.each(['straight','broad','tight','S','corner','closed'])('covers %s centerline and inner nominal band with guaranteed opaque cores', shape => {
  const ns = shape==='corner' ? [...nodes,{id:'c',x:380,y:220,mode:'corner' as const}] : shape==='closed' ? [...nodes,{id:'c',x:200,y:220,mode:'corner' as const}] : shape==='straight' ? nodes : [{...nodes[0],out:{x:shape==='tight'?20:100,y:-70}},{...nodes[1],in:{x:-100,y:shape==='S'?70:-70}}]
  for (const width of [5,10,20,30]) {
    const w = createWall(ns,shape==='closed',{...style(),strokeWidth:width}), parts = generatedPlacements(w), length = pathGeometry(w).length
    for (let d=width;d<length-width;d+=.8) {
      const at = pointAtDistance(w,d)
      for (const offset of [-width*.45,0,width*.45]) {
        const x=at.point.x-at.tangent.y*offset,y=at.point.y+at.tangent.x*offset
        expect(parts.some(p=>Math.hypot(p.x-x,p.y-y)<p.width*.39),`${shape}, width ${width}, distance ${d}, offset ${offset}`).toBe(true)
      }
    }
  }
})
it('keeps natural free ends and clear intervals when passages move/resize/remove', () => {
  const w = createWall(nodes,false,style()), door = createOpening(w,.5,'door',30), cut = openingPlacement(door,w)
  const parts = generatedPlacements(w,[door]); expect(parts.every(p=>p.distance<cut.start||p.distance>cut.end)).toBe(true)
  expect(parts).not.toEqual(generatedPlacements(w,[{...door,position:.6,openingWidth:40}]))
  expect(parts).not.toEqual(generatedPlacements(w,[]))
  expect(validatePath(w).closed).toBe(false)
  expect(()=>createWall(nodes,false,{...style(),wall:{...style().wall,alignment:'outside'}})).toThrow('Outside')
})
it('retains independent T/cross/corridor objects and exact control undo/redo', async () => {
  const {useProjectStore:s}=await import('../store/projectStore'),{useEditorStore:e}=await import('../store/editorStore'),{history}=await import('../store/history')
  s.setState({map,objects:[],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]}});e.setState({activeLayerId:'objects',selectedObjectIds:[],soloLayerId:null});history.reset()
  const a=createWall(nodes,false,style()), b=createWall(nodes.map(n=>({...n,y:n.y+40})),false,style());s.getState().addPath(a);s.getState().addPath(b);history.reset()
  s.getState().updateWallStyles([a.id],v=>({...v,wall:{...v.wall,generated:{...v.wall.generated!,roughness:.9,variation:.2,seed:77}}}));const changed=structuredClone(s.getState().objects);history.undo();expect(s.getState().objects).toEqual([a,b]);history.redo();expect(s.getState().objects).toEqual(changed)
  expect(changed).toHaveLength(2);expect(changed.every(o=>o.kind==='path'&&!o.closed)).toBe(true)
  expect(()=>createWall([{...nodes[0]},{...nodes[1],x:999999}],false,style())).toThrow('budget')
})


it('covers independent T/cross junctions with ordinary overlapping masses and keeps earlier spans stable',()=>{
 const a=createWall(nodes,false,style()),cross=createWall([{id:'a',x:200,y:10,mode:'corner'},{id:'b',x:200,y:180,mode:'corner'}],false,style()),branch=createWall([{id:'a',x:200,y:40,mode:'corner'},{id:'b',x:200,y:180,mode:'corner'}],false,style());
 for(const second of [cross,branch]){const parts=[...generatedPlacements(a),...generatedPlacements(second)];for(let x=196;x<=204;x++)for(let y=38;y<=42;y++)expect(parts.some(p=>Math.hypot(p.x-x,p.y-y)<p.width*.39)).toBe(true);expect(second.closed).toBe(false);expect(second.id).not.toBe(a.id)}
 const make=(y:number)=>createWall([...nodes,{id:'c',x:380,y,mode:'corner'}],false,style());const earlier=(y:number)=>generatedPlacements(make(y)).filter(p=>p.distance<330);expect(earlier(180)).toEqual(earlier(230));
})

it('registers Natural Cave Rock as production while retaining DEV footprints and identical native geometry',()=>{
 const d=generatedDefinition({id:'natural-cave-rock',revision:'production-1'}),dev=generatedDefinition({id:'cave-rock',revision:'dev-1'}),production=generatedWallStyle(SIMPLE_WALL,map,d.id,d.revision)
 expect(d.name).toBe('Natuurlijke grotrots');expect(d.defaults).toEqual(dev.defaults);expect(production.strokeWidth).toBe(10)
 expect(d.components.map(({image,...c})=>{expect(image).toContain('/natural-cave-rock-production-1/');return c})).toEqual(dev.components.map(({image,...c})=>{expect(image).toContain('/cave-rock-dev-1/');return c}))
 for(const closed of [false,true])for(const width of [5,10,20,30]){
  const ns=[...nodes,{id:'c',x:250,y:220,mode:'corner' as const}],a=createWall(ns,closed,{...style(),strokeWidth:width}),b=createWall(ns,closed,{...production,strokeWidth:width})
  expect(validatePath(b).closed).toBe(closed)
  const normalize=(w:ReturnType<typeof createWall>)=>generatedPlacements(w).map(({component,...p})=>({...p,component:{...component,image:''}}))
  expect(normalize(b)).toEqual(normalize(a))
  const door=createOpening(b,.5,'door',30);expect(generatedPlacements(b,[door])).not.toEqual(generatedPlacements(b))
 }
 expect(()=>createWall(nodes,false,{...production,wall:{...production.wall,alignment:'outside'}})).toThrow('Outside')
})
