import { registerTestAssets } from '../test/assets'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history } from '../store/history'
import { expect,it } from 'vitest'
import { hexCenter,pixelToHex,hexCellCorners,hexCorners,hexNeighbors,hexGridEdges,hexGridRange } from './hexGrid'
import { DEFAULT_GRID,snapPoint,interactionGrid,normalizeGrid } from './mapSettings'
import { snapSelection } from './objectSnapping'
import { defaultLandBrush,applyLandStroke } from './landBrush'
import { resolvedLandBrush } from './landHexGrid'
import { signedArea } from './areas'
import { toolIntentFixture } from '../../tests/fixtures/toolIntent'
import { parseProject } from '../projects/format'
import { encodeProject,decodeProject } from '../projects/codec'
import { exportScene } from '../export/scene'

it.each(['hex-flat','hex-pointy'] as const)('%s axial centers, corners, neighbors and boundary rounding',type=>{
 const g={...DEFAULT_GRID,type,cellSize:100,offsetX:-27,offsetY:43}
 for(let q=-4;q<=4;q++)for(let r=-4;r<=4;r++)expect(pixelToHex(hexCenter({q,r},g),g)).toEqual({q,r})
 const origin=hexCenter({q:0,r:0},g);expect(origin).toEqual({x:-27,y:43})
 const ring=hexCellCorners({q:0,r:0},g);ring.forEach((p,i)=>{expect(Math.hypot(p.x-origin.x,p.y-origin.y)).toBeCloseTo(50);const free=hexCorners(origin,100,type==='hex-flat'?'flat':'pointy')[i];expect(p.x).toBeCloseTo(free.x);expect(p.y).toBeCloseTo(free.y)})
 expect(hexNeighbors({q:0,r:0})).toHaveLength(6)
 for(const neighbor of hexNeighbors({q:0,r:0})){
  const c=hexCenter(neighbor,g),p={x:(origin.x+c.x)/2,y:(origin.y+c.y)/2}
  expect(pixelToHex({x:p.x+(c.x-origin.x)*1e-6,y:p.y+(c.y-origin.y)*1e-6},g)).toEqual(neighbor)
  expect(pixelToHex({x:p.x-(c.x-origin.x)*1e-6,y:p.y-(c.y-origin.y)*1e-6},g)).toEqual({q:0,r:0})
  expect(hexCellCorners(neighbor,g).filter(p=>ring.some(v=>v.x===p.x&&v.y===p.y))).toHaveLength(2)
 }
 expect(normalizeGrid(g)).toEqual(g)
})
it.each(['hex-flat','hex-pointy'] as const)('%s shared snap on/off, Alt and selection center',type=>{
 const g={...DEFAULT_GRID,type,cellSize:120,snapEnabled:true},c=hexCenter({q:2,r:1},g),p={x:c.x+8,y:c.y-12}
 expect(snapPoint(p,g)).toEqual(c);expect(snapPoint(p,g,true)).toEqual(p);expect(snapPoint(p,{...g,snapEnabled:false})).toEqual(p)
 expect(interactionGrid({...toolIntentFixture().map,grid:g}).snapEnabled).toBe(true)
 const s=snapSelection({x:p.x-10,y:p.y-20,width:20,height:40},{x:[],y:[]},g,4,false,false)
 expect(s.delta).toEqual({x:c.x-p.x,y:c.y-p.y})
})
it.each(['hex-flat','hex-pointy'] as const)('%s produces exact matching, joined and removed cells',type=>{
 const g={...DEFAULT_GRID,type,cellSize:120,offsetX:150,offsetY:150},h={q:1,r:1},c=hexCenter(h,g),brush=resolvedLandBrush({...defaultLandBrush,shape:'hexagon',snapHex:true,matchHex:true},g)
 const input={lands:[],editable:[],map:{width:900,height:700},brush,points:[{x:c.x+5,y:c.y+7}],seed:1,newId:'land'}
 const first=applyLandStroke(input).added[0],corners=hexCellCorners(h,g)
 expect(first.geometry.polygons[0].outer).toHaveLength(6);for(const p of corners)expect(first.geometry.polygons[0].outer).toContainEqual(p)
 const adjacent=hexCenter(hexNeighbors(h)[0],g),joined=applyLandStroke({...input,lands:[first],editable:['land'],points:[adjacent]}).replacements[0]
 expect(joined.geometry.polygons).toHaveLength(1);expect(Math.abs(signedArea(joined.geometry.polygons[0].outer))).toBeCloseTo(2*Math.abs(signedArea(corners)),7)
 const cut=applyLandStroke({...input,lands:[joined],editable:['land'],brush:{...brush,action:'remove'},points:[c]}).replacements[0]
 expect(Math.abs(signedArea(cut.geometry.polygons[0].outer))).toBeCloseTo(Math.abs(signedArea(corners)),7)
 for(const edge of ['soft','rough'] as const){const b={...brush,hex:{...brush.hex!,edge}};expect(applyLandStroke({...input,brush:b}).added[0].geometry.polygons[0].outer.length).toBeGreaterThan(6)}
 expect(resolvedLandBrush({...defaultLandBrush,shape:'hexagon',snapHex:true,matchHex:true},g,true).hexGrid).toBeUndefined()
})
it.each(['hex-flat','hex-pointy'] as const)('%s grid has unique edges at multiple sizes and origins',type=>{
 for(const cellSize of [20,75,160])for(const offsetX of [-123,0,47]){
  const edges=hexGridEdges({width:400,height:300},{...DEFAULT_GRID,type,cellSize,offsetX})
  const keys=edges.map(e=>e.map(p=>`${p.x.toFixed(6)},${p.y.toFixed(6)}`).sort().join(':'))
  expect(new Set(keys).size).toBe(keys.length);expect(edges.length).toBeGreaterThan(0)
 }
 expect(hexGridRange({width:16000,height:16000},{...DEFAULT_GRID,type,cellSize:4}).count).toBeGreaterThan(40000)
 expect(()=>hexGridEdges({width:16000,height:16000},{...DEFAULT_GRID,type,cellSize:4})).toThrow('dense')
})
it('preserves old square documents and round-trips hex config',async()=>{
 const old=toolIntentFixture();expect(parseProject(old)).toEqual(old);expect(old.map.grid.type).toBeUndefined()
 expect(snapPoint({x:28,y:80},{...DEFAULT_GRID,snapEnabled:true})).toEqual({x:50,y:100})
 expect(interactionGrid(old.map).snapEnabled).toBe(false)
 for(const type of ['hex-flat','hex-pointy'] as const){const document={...old,map:{...old.map,grid:{...old.map.grid,type,cellSize:120,offsetX:-200,offsetY:123,snapEnabled:true,renderAboveObjects:true}}};const loaded=await decodeProject(await encodeProject({document,assets:new Map()}));expect(loaded.document).toEqual(document);expect(exportScene(document,{scale:2,includeGrid:true,transparent:false}).items.filter(i=>i.kind==='grid')).toHaveLength(1)}
 expect(()=>parseProject({...old,map:{...old.map,grid:{...old.map.grid,type:'triangle'}}})).toThrow()
})

it.each(['hex-flat','hex-pointy'] as const)('%s stamp placement uses the shared center with snap off and bypass preserved',type=>{
 registerTestAssets({tree:'stamp'})
 const fixture=toolIntentFixture(),grid={...DEFAULT_GRID,type,cellSize:100,snapEnabled:true},center=hexCenter({q:3,r:2},grid),point={x:center.x+10,y:center.y+8}
 project.setState({...fixture,map:{...fixture.map,grid}});editor.setState({activeLayerId:fixture.layers[0].id,soloLayerId:null,selectedObjectIds:[]});history.reset()
 const asset={kind:'stamp' as const,id:'tree',name:'Tree',naturalWidth:40,naturalHeight:60,mimeType:'image/png',categoryId:'',contentHash:'',createdAt:''}
 for(const mode of ['snap','bypass','off']){
  project.setState(s=>({map:{...s.map,grid:{...grid,snapEnabled:mode!=='off'}}}))
  project.getState().place(asset,point,mode==='bypass')
  const o=project.getState().objects.at(-1)!,expected=mode==='snap'?center:point
  expect(o.kind).toBe('stamp');expect(o.x+o.width/2).toBeCloseTo(expected.x);expect(o.y+o.height/2).toBeCloseTo(expected.y)
 }
 expect(()=>normalizeGrid({...grid,offsetX:1e100})).toThrow('offsets')
})
