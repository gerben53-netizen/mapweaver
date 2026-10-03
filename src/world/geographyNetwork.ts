import type { Point } from '../canvas/viewport'
import type { PathObject } from '../domain/models'
import { createRoute, routePreset } from '../domain/routes'
import { smoothRiverNodes, defaultRiverAppearance } from '../domain/riverAppearance'
export interface RidgePath { id:string; level:'major'|'secondary'; points:Point[]; foothillWidth:number }
export interface DrainageReach { id:string; from:number; to:number; downstream:string|null; tributaries:string[]; order:number; cells:number[]; mouth:'ocean'|'lake'|'confluence'; startWidth:number; endWidth:number }
export interface GeographyNetwork { version:1; cols:number; rows:number; ridges:RidgePath[]; drainage:DrainageReach[] }
type Field={cols:number;rows:number;height:number[];biomes:string[]}
/** Connect cross-slope maxima through short highland corridors, then split a spanning
 * forest into a principal diameter and secondary branches. No random zigzags. */
export function extractRidges(f:Field,water:number,width:number,height:number):RidgePath[] {
  const {cols,rows}=f,candidates:number[]=[]
  for(let y=2;y<rows-2;y++)for(let x=2;x<cols-2;x++){
    const i=y*cols+x;if(f.height[i]<water+.09||!['mountains','alpine','hills','upland','tundra'].includes(f.biomes[i]))continue
    if([[1,0],[0,1],[1,1],[1,-1]].some(([dx,dy])=>f.height[i]>Math.max(f.height[i-dx-dy*cols],f.height[i+dx+dy*cols])+.001))candidates.push(i)
  }
  const selected=candidates.sort((a,b)=>f.height[b]-f.height[a]||a-b).slice(0,700),parents=new Map(selected.map(i=>[i,i])),adj=new Map(selected.map(i=>[i,[] as number[]]))
  const find=(i:number):number=>{const p=parents.get(i)!;if(p===i)return i;const root=find(p);parents.set(i,root);return root}
  const edges:{a:number;b:number;score:number}[]=[]
  for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++){
    const a=selected[i],b=selected[j],dx=a%cols-b%cols,dy=Math.floor(a/cols)-Math.floor(b/cols),d=Math.hypot(dx,dy)
    if(d>4||d===0)continue
    let valid=true;for(let k=1;k<8;k++){const t=k/8,x=Math.round(a%cols-dx*t),y=Math.round(Math.floor(a/cols)-dy*t);if(f.height[y*cols+x]<water+.06)valid=false}
    if(valid)edges.push({a,b,score:d/(.1+Math.min(f.height[a],f.height[b])-water)})
  }
  edges.sort((a,b)=>a.score-b.score||a.a-b.a||a.b-b.b)
  for(const {a,b} of edges)if(find(a)!==find(b)){parents.set(find(a),find(b));adj.get(a)!.push(b);adj.get(b)!.push(a)}
  const components=new Map<number,number[]>();for(const i of selected){const root=find(i);components.set(root,[...(components.get(root)??[]),i])}
  const result:RidgePath[]=[],used=new Set<string>(),edgeKey=(a:number,b:number)=>[Math.min(a,b),Math.max(a,b)].join(':')
  const emit=(cells:number[],level:RidgePath['level'])=>{
    if(cells.length<3||result.length>=64)return
    const raw=cells.map(i=>({x:i%cols*width/(cols-1),y:Math.floor(i/cols)*height/(rows-1)}))
    const points=raw.map((p,i)=>i===0||i===raw.length-1?p:{x:p.x*.6+(raw[i-1].x+raw[i+1].x)*.2,y:p.y*.6+(raw[i-1].y+raw[i+1].y)*.2})
    result.push({id:`ridge-${result.length}`,level,points,foothillWidth:width/(level==='major'?65:110)})
  }
  for(const cells of [...components.values()].filter(c=>c.length>=4).sort((a,b)=>b.length-a.length||a[0]-b[0])){
    const far=(start:number)=>{const prev=new Map<number,number>(),queue=[start],dist=new Map([[start,0]]);for(let k=0;k<queue.length;k++){const i=queue[k];for(const j of adj.get(i)!)if(!dist.has(j)){dist.set(j,dist.get(i)!+Math.hypot(i%cols-j%cols,Math.floor(i/cols)-Math.floor(j/cols)));prev.set(j,i);queue.push(j)}}return {end:queue.reduce((a,b)=>dist.get(a)!>dist.get(b)!?a:b),prev}}
    const start=far(cells[0]).end,{end,prev}=far(start),spine=[end];while(spine.at(-1)!==start)spine.push(prev.get(spine.at(-1)!)!)
    for(let i=1;i<spine.length;i++)used.add(edgeKey(spine[i-1],spine[i]));emit(spine,'major')
    const branches:number[][]=[]
    for(const origin of spine)for(const first of adj.get(origin)!)if(!used.has(edgeKey(origin,first))){const stack=[[origin,first]];while(stack.length){const chain=stack.pop()!;let at=chain.at(-1)!;used.add(edgeKey(chain[chain.length-2],at));while(true){const next=adj.get(at)!.filter(i=>!used.has(edgeKey(at,i)));if(next.length!==1){for(const j of next)stack.push([at,j]);break}used.add(edgeKey(at,next[0]));chain.push(next[0]);at=next[0]}branches.push(chain)}}
    for(const branch of branches.sort((a,b)=>b.length-a.length).slice(0,8))emit(branch,'secondary')
  }
  return result
}
/** Split at every confluence. Each editable reach has its own downstream widths. */
export function drainageNetwork(chains:number[][],f:Field,filled:number[],lake:boolean[],water:number,width:number,height:number) {
  const downstream=new Map<number,number>(),incoming=new Map<number,number[]>()
  for(const chain of chains)for(let i=1;i<chain.length;i++){const a=chain[i-1],b=chain[i];downstream.set(a,b)}
  for(const [a,b] of downstream)incoming.set(b,[...(incoming.get(b)??[]),a])
  const cells=[...new Set([...downstream.keys(),...downstream.values()])].sort((a,b)=>filled[b]-filled[a]||a-b),order=new Map<number,number>(),volume=new Map<number,number>()
  for(const i of cells){const ins=incoming.get(i)??[],orders=ins.map(j=>order.get(j)??1),max=Math.max(1,...orders);order.set(i,max+(orders.filter(v=>v===max).length>=2?1:0));volume.set(i,ins.length?ins.reduce((s,j)=>s+(volume.get(j)??1),0):1)}
  const starts=cells.filter(i=>(incoming.get(i)?.length??0)!==1&&downstream.has(i)),reaches:DrainageReach[]=[],paths:PathObject[]=[]
  const cellWidth=(i:number)=>Math.min(width/300,width/1800*(1+Math.sqrt(volume.get(i)??1)*1.1))
  for(const start of starts){const chain=[start];let at=start;while(downstream.has(at)){at=downstream.get(at)!;chain.push(at);if((incoming.get(at)?.length??0)!==1)break}
    const id=`world-v1-river-${reaches.length}`,style=routePreset('river');if(style.route.kind!=='river')throw Error('River preset unavailable')
    const startWidth=cellWidth(start),endWidth=Math.max(startWidth,cellWidth(at))
    style.strokeWidth=endWidth;style.stroke={kind:'solid',color:'#729fb0'};style.route={...style.route,startWidth,endWidth,startFactor:1,endFactor:1,bank:{color:'#346c7c',width:width/6000},appearance:{...defaultRiverAppearance(),smoothing:'off'}}
    // Gentle handles stay inside a short corridor; all centerline samples remain downstream.
    const sample=(x:number,y:number,values=f.height)=>{const ix=Math.max(0,Math.min(f.cols-2,Math.floor(x))),iy=Math.max(0,Math.min(f.rows-2,Math.floor(y))),u=Math.max(0,Math.min(1,x-ix)),v=Math.max(0,Math.min(1,y-iy));return (values[iy*f.cols+ix]*(1-u)+values[iy*f.cols+ix+1]*u)*(1-v)+(values[(iy+1)*f.cols+ix]*(1-u)+values[(iy+1)*f.cols+ix+1]*u)*v}
    let previousHeight=Infinity
    const nodes=smoothRiverNodes(chain.map((i,n)=>{
      let x=i%f.cols,y=Math.floor(i/f.cols)
      if(n>0&&n<chain.length-1){const prev=chain[n-1],next=chain[n+1],dx=next%f.cols-prev%f.cols,dy=Math.floor(next/f.cols)-Math.floor(prev/f.cols),len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,left=sample(x-nx,y-ny),right=sample(x+nx,y+ny),curvature=left+right-2*f.height[i]
        // Subcell valley fitting, never random noise. Keep junction/source/mouth fixed.
        const offset=curvature>1e-6?Math.max(-.32,Math.min(.32,(left-right)/(2*curvature))):0;const candidate=sample(x+nx*offset,y+ny*offset,filled);if(candidate<=previousHeight&&candidate>=filled[next]){x+=nx*offset;y+=ny*offset}
      }
      previousHeight=sample(x,y,filled)
      return {id:`node-${n}`,x:x*width/(f.cols-1),y:y*height/(f.rows-1),mode:'corner' as const}
    }),'medium')
    const path=createRoute(nodes,false,style);path.id=id;path.name=`River reach ${reaches.length+1}`;paths.push(path)
    reaches.push({id,from:start,to:at,downstream:null,tributaries:[],order:order.get(start)??1,cells:chain,mouth:f.height[at]<=water?'ocean':lake[at]?'lake':'confluence',startWidth,endWidth})
  }
  for(const r of reaches){r.downstream=reaches.find(v=>v.from===r.to)?.id??null;r.tributaries=reaches.filter(v=>v.to===r.from).map(v=>v.id)}
  return {reaches,paths}
}
export function validateGeographyNetwork(value:unknown):GeographyNetwork {
  const keys=(v:unknown,allowed:string[])=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k))
  const v=value as GeographyNetwork,bad=()=>{throw Error('Invalid generated geography network.')}
  if(!v||v.version!==1||v.cols!==145||v.rows!==97||!Array.isArray(v.ridges)||v.ridges.length>64||!Array.isArray(v.drainage)||v.drainage.length>120||Object.keys(v).some(k=>!['version','cols','rows','ridges','drainage'].includes(k)))bad()
  let points=0
  for(const r of v.ridges){if(!keys(r,['id','level','points','foothillWidth'])||!/^ridge-\d+$/.test(r.id)||!['major','secondary'].includes(r.level)||!Array.isArray(r.points)||r.points.length<2||!Number.isFinite(r.foothillWidth)||r.foothillWidth<=0||r.foothillWidth>4096)bad();points+=r.points.length;if(points>4096)bad();for(const p of r.points)if(!keys(p,['x','y'])||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>4096||p.y>4096)bad()}
  if(points>4096)bad()
  if(v.drainage.some(r=>!keys(r,['id','from','to','downstream','tributaries','order','cells','mouth','startWidth','endWidth'])))bad()
  const ids=new Set(v.drainage.map(r=>r.id));if(ids.size!==v.drainage.length)bad()
  for(const r of v.drainage){if(!/^world-v1-river-\d+$/.test(r.id)||!Number.isInteger(r.order)||r.order<1||r.order>10||!['ocean','lake','confluence'].includes(r.mouth)||!Array.isArray(r.cells)||r.cells.length<2||r.cells.length>256||r.cells[0]!==r.from||r.cells.at(-1)!==r.to||new Set(r.cells).size!==r.cells.length||r.cells.some(i=>!Number.isInteger(i)||i<0||i>=v.cols*v.rows)||!Array.isArray(r.tributaries)||r.tributaries.length>120||new Set(r.tributaries).size!==r.tributaries.length||r.tributaries.some(id=>!ids.has(id))||r.downstream!==null&&!ids.has(r.downstream)||![r.startWidth,r.endWidth].every(n=>Number.isFinite(n)&&n>=.1&&n<=1024))bad()
    if(r.downstream){const next=v.drainage.find(n=>n.id===r.downstream)!;if(next.from!==r.to||!next.tributaries.includes(r.id))bad()}
    for(const id of r.tributaries){const child=v.drainage.find(n=>n.id===id)!;if(child.downstream!==r.id||child.to!==r.from)bad()}
    const seen=new Set<string>();let current:DrainageReach|undefined=r;while(current){if(seen.has(current.id))bad();seen.add(current.id);current=v.drainage.find(n=>n.id===current!.downstream)}
  }
  return structuredClone(v)
}
