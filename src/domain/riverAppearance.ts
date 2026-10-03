import type { PathNode } from './models'
export const RIVER_SMOOTHING=['off','low','medium','high'] as const
export interface RiverAppearance {version:1;widthMode:'uniform'|'downstream'|'manual';smoothing:typeof RIVER_SMOOTHING[number];outlineEnabled:boolean;halo:{enabled:boolean;color:string;width:number;opacity:number;softness:number}}
export const defaultRiverAppearance=():RiverAppearance=>({version:1,widthMode:'manual',smoothing:'off',outlineEnabled:true,halo:{enabled:false,color:'#b4d5d9',width:0,opacity:.18,softness:.7}})
export function validateRiverAppearance(a:RiverAppearance){
 const keys=(v:unknown,allowed:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('Invalid river appearance fields.')}
 keys(a,['version','widthMode','smoothing','outlineEnabled','halo']);keys(a.halo,['enabled','color','width','opacity','softness'])
 if(a.version!==1||!['uniform','downstream','manual'].includes(a.widthMode)||!RIVER_SMOOTHING.includes(a.smoothing)||typeof a.outlineEnabled!=='boolean'||typeof a.halo.enabled!=='boolean'||!/^#[0-9a-f]{6}$/i.test(a.halo.color))throw Error('Invalid river appearance.')
 for(const [value,max] of [[a.halo.width,128],[a.halo.opacity,1],[a.halo.softness,1]])if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)throw Error('River halo values exceed supported limits.')
 return a
}
/** Derived Catmull-like tangents, capped to a short local corridor; explicit handles win. */
export function smoothRiverNodes(nodes:PathNode[],level:RiverAppearance['smoothing']):PathNode[]{
 if(level==='off')return nodes
 const strength={low:.35,medium:.65,high:1}[level]
 return nodes.map((n,i)=>{
  if(n.in||n.out)return n
  const prev=nodes[Math.max(0,i-1)],next=nodes[Math.min(nodes.length-1,i+1)],a={x:n.x-prev.x,y:n.y-prev.y},b={x:next.x-n.x,y:next.y-n.y},la=Math.hypot(a.x,a.y),lb=Math.hypot(b.x,b.y)
  if(i>0&&i<nodes.length-1&&(!la||!lb||(a.x*b.x+a.y*b.y)/(la*lb)<-.7))return n
  const tangent={x:next.x-prev.x,y:next.y-prev.y},length=Math.hypot(tangent.x,tangent.y)||1,limit=Math.min(la||lb,lb||la)*.24*strength
  const handle=(dx:number,dy:number,sign:number)=>{const l=Math.hypot(dx,dy)||1,tx=tangent.x/length*sign,ty=tangent.y/length*sign,dot=(tx*dx+ty*dy)/l;if(dot<=0)return {x:0,y:0};const cross=Math.abs(tx*dy-ty*dx)/l,scale=Math.min(limit,l/3,cross?l*.15/cross:limit);return {x:tx*scale,y:ty*scale}}
  return {...n,...(i>0?{in:handle(-a.x,-a.y,-1)}:{}),...(i<nodes.length-1?{out:handle(b.x,b.y,1)}:{})}
 })
}
