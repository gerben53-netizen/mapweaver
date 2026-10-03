import {expect,it} from 'vitest'
import {automaticDepth,bathymetricDepth,buildDepthField,depthColor,waterDepthPreset,waterStroke,defaultWaterDepthBrush,paintedDepthSampler,estuaryInfluence,validateWaterDepth} from './waterDepth'
const refined=waterDepthPreset(),map={width:256,height:256},wet=()=>true
it('preserves missing-model fields exactly and rejects unknown models',()=>{
 const old={...refined};delete old.model;delete old.coastEdge
 expect(validateWaterDepth(old)).toBe(old)
 const mask=new Uint8Array(100);mask[55]=1
 expect(buildDepthField(mask,10,10,5,old)[56]).toBeCloseTo(automaticDepth(5,140,.75,30,25))
 expect(()=>validateWaterDepth({...refined,model:'future'})).toThrow()
 expect(()=>validateWaterDepth({...old,coastEdge:true})).toThrow()
})
it('has deterministic monotonic depth and spatially varying shelves',()=>{
 const values=[0,10,50,140,500,2000].map(d=>bathymetricDepth(d,140,.75,300,100))
 expect(values).toEqual([...values].sort((a,b)=>a-b));expect(values[0]).toBe(0);expect(values.at(-1)).toBeGreaterThan(.999)
 expect(bathymetricDepth(100,140,.75,0,0)).not.toBe(bathymetricDepth(100,140,.75,400,300))
 const mask=new Uint8Array(10000);mask[5050]=1
 expect(buildDepthField(mask,100,100,4,refined)).toEqual(buildDepthField(mask,100,100,4,refined))
})
it('caps small island shelves and gives enclosed lakes shallow edges and deeper centers',()=>{
 const island=new Uint8Array(10000);island[5050]=1
 const d=buildDepthField(island,100,100,4,refined);expect(d[5054]).toBeGreaterThan(.8)
 const lake=new Uint8Array(10000).fill(1)
 for(let y=10;y<90;y++)for(let x=10;x<90;x++)lake[y*100+x]=0
 const l=buildDepthField(lake,100,100,4,{...refined,shelf:60})
 expect(l[5010]).toBeLessThan(.1);expect(l[5050]).toBeGreaterThan(.8)
})
it('new ramps are muted, theme-specific and preserve exact endpoints',()=>{
 for(const style of ['deep','calm','dark','minimal'] as const){const p=waterDepthPreset(style),a=depthColor(0,p),b=depthColor(1,p);expect(Math.max(...a)).toBeLessThan(175);expect(a.reduce((n,v)=>n+v)).toBeGreaterThan(b.reduce((n,v)=>n+v));expect(depthColor(.001,p).every((v,i)=>Math.abs(v-a[i])<2)).toBe(true)}
 expect(waterDepthPreset('parchment').shallow).not.toBe(refined.shallow)
})
it('accumulates scalar strokes, resets to automatic, and clips every edit to water',()=>{
 const auto=()=>.8,p={x:128,y:128},brush={...defaultWaterDepthBrush,size:60,strength:.25,softness:0}
 const a=waterStroke(undefined,brush,map,wet,auto);a.add(p);const first=a.finish()
 const b=waterStroke(first,brush,map,wet,auto);b.add(p);const second=b.finish()
 expect(paintedDepthSampler(second,auto)(p)).toBeLessThan(paintedDepthSampler(first,auto)(p))
 const reset=waterStroke(second,{...brush,mode:'erase',strength:1},map,wet,auto);reset.add(p);expect(paintedDepthSampler(reset.finish(),auto)(p)).toBe(.8)
 const land=waterStroke(second,{...brush,mode:'deep',strength:1},map,()=>false,auto);land.add(p);expect(land.finish().tiles).toEqual(second.tiles)
})
it('Blend smooths the final automatic field even where no manual paint existed',()=>{
 const auto=(p:{x:number})=>p.x<128?.15:.85
 const b=waterStroke(undefined,{...defaultWaterDepthBrush,mode:'blend',size:100,strength:1,softness:0},map,wet,auto);b.add({x:128,y:128});const paint=b.finish(),sample=paintedDepthSampler(paint,auto)
 expect(sample({x:125,y:129})).toBeGreaterThan(.2);expect(sample({x:129,y:129})).toBeLessThan(.8)
 expect(validateWaterDepth({...refined,paint})).toBeTruthy()
})
it('Blend excludes land samples and preserves the source masks',()=>{
 const auto=(p:{x:number})=>p.x<128?0:.8,source=waterStroke(undefined,{...defaultWaterDepthBrush,strength:.5},map,wet,auto);source.add({x:170,y:120});const base=source.finish(),before=JSON.stringify(base)
 const b=waterStroke(base,{...defaultWaterDepthBrush,mode:'blend'},map,p=>p.x>=128,auto);b.add({x:128,y:128});b.finish();expect(JSON.stringify(base)).toBe(before)
 const clean=waterStroke(undefined,{...defaultWaterDepthBrush,mode:'blend',strength:1},map,p=>p.x>=128,auto);clean.add({x:128,y:128});expect(paintedDepthSampler(clean.finish(),auto)({x:129,y:129})).toBeCloseTo(.8)
})
it('estuary is directional with compact continuous support and width-dependent reach',()=>{
 const m={id:'mouth',x:0,y:0,dx:1,dy:0,width:10,radius:40}
 expect(estuaryInfluence({x:25,y:0},m)).toBeGreaterThan(.8)
 expect(estuaryInfluence({x:0,y:25},m)).toBe(0)
 expect(estuaryInfluence({x:-10,y:0},m)).toBe(0)
 expect(estuaryInfluence({x:90,y:0},m)).toBe(0)
 expect(estuaryInfluence({x:90,y:0},{...m,width:30,radius:120})).toBeGreaterThan(.5)
})
it('shelves from different island classes meet continuously rather than changing at a Voronoi seam',()=>{
 const w=200,h=80,land=new Uint8Array(w*h)
 for(let y=0;y<h;y++)for(let x=0;x<40;x++)land[y*w+x]=1
 for(let y=35;y<45;y++)for(let x=135;x<145;x++)land[y*w+x]=1
 const d=buildDepthField(land,w,h,4,refined)
 for(let x=60;x<125;x++)expect(Math.abs(d[40*w+x]-d[40*w+x-1])).toBeLessThan(.06)
})
