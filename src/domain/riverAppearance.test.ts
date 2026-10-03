import { expect,it } from 'vitest'
import { createRoute,routePreset,routeWidth,routeRadius,splitRoute } from './routes'
import { riverPreset,RIVER_PRESETS } from './riverPresets'
import { createPath,pathGeometry,pointAtPosition,withPathGeometry,validatePath,insertPathNode,removePathNode,reversePath,transformPath } from './paths'
import { smoothRiverNodes,validateRiverAppearance } from './riverAppearance'
import { routeSamples,paintRoute } from '../canvas/drawRoute'
import { parseProject } from '../projects/format'
import { defaultMapStyle } from './mapSettings'
import { defaultGeography } from './geography'
import { styleWorld } from '../world/styleWorld'
import { generateWorld } from '../world/generate'
import { WORLD_DEFAULTS } from '../world/model'
const nodes=()=>[{id:'a',x:100,y:100,mode:'corner' as const},{id:'b',x:200,y:120,mode:'corner' as const},{id:'c',x:260,y:220,mode:'corner' as const},{id:'d',x:420,y:190,mode:'corner' as const}]
function document(p:ReturnType<typeof createPath>){const now='2026-09-25T00:00:00.000Z';return {formatVersion:12,id:'test',name:'Rivers',createdAt:now,modifiedAt:now,map:{...defaultMapStyle(),width:800,height:600,background:null,mapType:'world-map',geography:defaultGeography('world-map')},objects:[p],layers:[{id:'layer',name:'Rivers',objectIds:[p.id],visible:true,locked:false}],objectGroups:[],layerTree:{roots:['layer'],groups:[]},assets:[]}}
it('keeps legacy generic and river models/geometry untouched on load',()=>{
 for(const p of [createPath(nodes()),createRoute(nodes(),false,routePreset('river'))]){expect(parseProject(document(p)).objects[0]).toEqual(p);expect(p.route?.kind==='river'&&p.route.appearance).toBeFalsy();expect(pathGeometry(p).segments.every(s=>s.straight)).toBe(true)}
})
it('registers five valid styles and keeps taper based on arc distance with manual/uniform modes',()=>{
 for(const id of Object.keys(RIVER_PRESETS) as (keyof typeof RIVER_PRESETS)[]){const p=createRoute(nodes(),false,riverPreset(id));expect(validatePath(p)).toEqual(p);expect(routeWidth(p,0)).toBe(2);expect(routeWidth(p,1)).toBe(8);expect(parseProject(document(p)).objects[0]).toEqual(p)}
 const p=createRoute(nodes(),false,riverPreset('fantasyRiver'));if(p.route?.kind!=='river')throw Error();p.route.appearance!.widthMode='uniform';const uniform=withPathGeometry(p);expect(routeSamples(uniform).every(s=>s.width===8)).toBe(true);expect(routeWidth(reversePath(uniform),0)).toBe(8)
 p.route.appearance!.widthMode='manual';const manual=withPathGeometry({...p,route:{...p.route,startWidth:3,endWidth:11}});expect(routeWidth(manual,.25)).toBe(5);const split=splitRoute(manual,1);expect(routeWidth(split[0],1)).toBeCloseTo(routeWidth(split[1],0));expect(routeWidth(reversePath(manual),0)).toBe(11)
})
it('derives bounded smoothing without mutating nodes or overriding authored handles',()=>{
 const original=nodes(),frozen=JSON.stringify(original)
 for(const smoothing of ['off','low','medium','high'] as const){const p=createRoute(original,false,riverPreset('fantasyRiver'));if(p.route?.kind!=='river')throw Error();p.route.appearance!.smoothing=smoothing;const g=pathGeometry(p);expect(JSON.stringify(original)).toBe(frozen);expect(g.samples.every(s=>Number.isFinite(s.point.x+s.point.y))).toBe(true);for(const s of g.samples){const a=original[s.segment],b=original[s.segment+1],margin=Math.hypot(a.x-b.x,a.y-b.y)*.16;expect(s.point.x).toBeGreaterThanOrEqual(Math.min(a.x,b.x)-margin);expect(s.point.x).toBeLessThanOrEqual(Math.max(a.x,b.x)+margin);expect(s.point.y).toBeGreaterThanOrEqual(Math.min(a.y,b.y)-margin);expect(s.point.y).toBeLessThanOrEqual(Math.max(a.y,b.y)+margin)}}
 const authored=nodes();authored[1]={...authored[1],out:{x:12,y:18}} as typeof authored[1];expect(smoothRiverNodes(authored,'high')[1]).toBe(authored[1])
 const hairpin=[{id:'a',x:0,y:0,mode:'corner' as const},{id:'b',x:100,y:0,mode:'corner' as const},{id:'c',x:1,y:1,mode:'corner' as const}];expect(smoothRiverNodes(hairpin,'high')[1]).toEqual(hairpin[1])
})
it('preserves the displayed spline on explicit insertion/split and moves/scales all appearance',()=>{
 const p=createRoute(nodes(),false,riverPreset('brightWater')),inserted=insertPathNode(p,1,.4)
 for(let i=0;i<=20;i++){const a=pointAtPosition(p,i/20).point,b=pointAtPosition(inserted,i/20).point;expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeLessThan(.03)}
 const [left,right]=splitRoute(p,2);expect(pathGeometry(left).length+pathGeometry(right).length).toBeCloseTo(pathGeometry(p).length,4);expect(removePathNode(inserted,2).nodes.length).toBe(p.nodes.length)
 const moved=transformPath(p,{...p,x:p.x+50,y:p.y+30});expect(moved.nodes[0].x).toBeCloseTo(p.nodes[0].x+50)
 const scaled=transformPath(p,{...p,width:p.width*2,height:p.height*2});expect(routeWidth(scaled,.4)).toBeCloseTo(routeWidth(p,.4)*2);expect(scaled.route?.kind==='river'&&scaled.route.appearance!.halo.width).toBe(8)
})
it('bounds include halo and render order is halo, outline, water with no halo in hit paint',()=>{
 const p=createRoute(nodes(),false,riverPreset('brightWater')),colors:string[]=[]
 const c={globalAlpha:1,save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},arc(){},fillStyle:'',fill(this:{fillStyle:string}){colors.push(this.fillStyle)}} as unknown as CanvasRenderingContext2D
 paintRoute(c,p);expect(colors.slice(0,5)).toEqual(Array(5).fill('#c9eef1'));expect(colors.slice(-2)).toEqual(['#518795','#91d5e2']);colors.length=0;paintRoute(c,p,undefined,'#ff0000');expect(colors).toEqual(['#ff0000']);expect(p.x).toBeLessThan(pathGeometry(p).bounds.x-routeRadius(p));expect(()=>validateRiverAppearance({...(p.route?.kind==='river'?p.route.appearance!:{}),halo:{enabled:true,width:999,color:'#ffffff',opacity:1,softness:1}} as never)).toThrow()
})
it('only newly styled generator output receives the preset; geography stays untouched',()=>{
 const base=generateWorld(WORLD_DEFAULTS),copy=JSON.stringify(base),styled=styleWorld(base);expect(JSON.stringify(base)).toBe(copy)
 for(const o of styled.objects)if(o.kind==='path'&&o.pathKind==='river'){expect(o.route?.preset).toBe('fantasyRiver');expect(o.nodes).toEqual(base.objects.find(p=>p.id===o.id)!.kind==='path'?(base.objects.find(p=>p.id===o.id) as typeof o).nodes:[])}
})
