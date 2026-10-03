import type { AssetHierarchy, GeneratorMetadata } from '../domain/generatorAssets'
export const HIERARCHY_SCALE:Record<AssetHierarchy,{min:number;max:number}>={hero:{min:.96,max:1.06},primary:{min:.9,max:1.12},support:{min:.82,max:1.08},detail:{min:.75,max:1.05}}
export const axisDelta=(angle:number,axis:number)=>((angle-axis+270)%180+180)%180-90
export function hierarchyTier(group:string,role:string,depth:number,draw:number):AssetHierarchy {
 if((role==='peak'||group==='volcanic'||group==='forests'&&depth>=5||group==='swamp')&&draw<.035)return 'hero'
 if(group==='details')return role==='foothill'?(draw<.55?'support':'detail'):'detail'
 if(group==='forests'){if(depth<=1)return 'detail';if(depth<3)return 'support';if(depth<5)return draw<.65?'support':'primary';return draw<.65?'primary':draw<.9?'support':'detail'}
 if(group==='swamp')return draw<.35?'primary':draw<.75?'support':'detail'
 return draw<.5?'primary':draw<.85?'support':'detail'
}
export function hierarchyDensity(tier:AssetHierarchy,density:'off'|'low'|'medium'|'high'){
 if(density==='off')return 0
 return ({hero:[1,1,1],primary:[.55,.65,.75],support:[.25,.6,.95],detail:[.1,.5,1]}[tier])[['low','medium','high'].indexOf(density)]
}
export function hierarchyTransform(meta:GeneratorMetadata,tier:AssetHierarchy,draw:number,angle:number,ridge:boolean){
 const authored=meta.scale??{min:1,max:1},bound=HIERARCHY_SCALE[tier],min=Math.max(authored.min,bound.min),max=Math.min(authored.max,bound.max)
 if(min>max)return null
 const policy=meta.rotation,delta=ridge&&meta.ridgeAxis!==undefined?axisDelta(angle,meta.ridgeAxis):0
 if(tier!=='hero'&&policy?.allowed&&Math.max(-8,policy.min)>Math.min(8,policy.max))return null
 const rotation=tier==='hero'||!policy?.allowed?0:Math.max(policy.min,Math.min(policy.max,Math.max(-8,Math.min(8,delta+(draw-.5)*6))))
 return {scale:min+(max-min)*draw,rotation}
}
