import { GENERATOR_HIERARCHY, GENERATOR_THEMES, GENERATOR_ROLES } from '../domain/generatorAssets'
import type { GeneratorAsset, GeneratorMetadata } from '../domain/generatorAssets'
import type { DefaultSize } from '../domain/library'
export const DENSITIES = ['off','low','medium','high'] as const
export interface WorldScatterSettings { mountains:typeof DENSITIES[number]; forests:typeof DENSITIES[number]; details:typeof DENSITIES[number]; theme:GeneratorMetadata['themes'][number] }
export const DEFAULT_WORLD_SCATTER:WorldScatterSettings={mountains:'off',forests:'off',details:'off',theme:'genericFantasy'}
export const WORLD_SCATTER_LIMITS={mountains:180,forests:240,details:120,sources:128,assets:10000} as const
export const scatterEnabled=(s:WorldScatterSettings)=>[s.mountains,s.forests,s.details].some(v=>v!=='off')
export interface WorldScatterAsset extends GeneratorAsset { name:string;width:number;height:number;generator:GeneratorMetadata;defaultSize:DefaultSize }
export type GenerationGroup='mountains'|'forests'|'details'|'swamp'|'volcanic'
export interface GeneratedPlacement { hierarchy?:import('../domain/generatorAssets').AssetHierarchy; id:string;sourceId:string;group:GenerationGroup;role:GeneratorMetadata['roles'][number];cell:number;scale:number;fallback:number }
export interface WorldScatterSource { engineVersion:1|2;settings:WorldScatterSettings;libraryFingerprint:string;placements:GeneratedPlacement[];warnings:string[] }
export function validateWorldScatterSettings(s:WorldScatterSettings):WorldScatterSettings {
 if(!s||Object.keys(s).some(k=>!Object.keys(DEFAULT_WORLD_SCATTER).includes(k))||![s.mountains,s.forests,s.details].every(v=>DENSITIES.includes(v))||!GENERATOR_THEMES.includes(s.theme))throw Error('Invalid world scatter settings.')
 return {...s}
}
export function validateWorldScatterSource(s:WorldScatterSource):WorldScatterSource {
 if(!s||Object.keys(s).some(k=>!['engineVersion','settings','libraryFingerprint','placements','warnings'].includes(k))||![1,2].includes(s.engineVersion)||typeof s.libraryFingerprint!=='string'||!/^v1-[0-9a-f]{8}$/.test(s.libraryFingerprint)||!Array.isArray(s.placements)||s.placements.length>540||!Array.isArray(s.warnings)||s.warnings.length>100||s.warnings.some(w=>typeof w!=='string'||w.length>250))throw Error('Invalid world scatter provenance.')
 const ids=new Set<string>()
 for(const p of s.placements){if(!p||Object.keys(p).some(k=>!['id','sourceId','group','role','cell','scale','fallback','hierarchy'].includes(k))||(s.engineVersion===2?!GENERATOR_HIERARCHY.includes(p.hierarchy!):p.hierarchy!==undefined)||typeof p.id!=='string'||!/^world-v1-scatter-[0-9]+$/.test(p.id)||ids.has(p.id)||typeof p.sourceId!=='string'||! /^[a-zA-Z0-9_-]{1,80}$/.test(p.sourceId)||!['mountains','forests','details','swamp','volcanic'].includes(p.group)||!GENERATOR_ROLES.includes(p.role)||!Number.isInteger(p.cell)||p.cell<0||p.cell>=145*97||!Number.isFinite(p.scale)||p.scale<.01||p.scale>100||!Number.isInteger(p.fallback)||p.fallback<1||p.fallback>5)throw Error('Invalid generated placement ownership.');ids.add(p.id)}
 return {...s,settings:validateWorldScatterSettings(s.settings),placements:s.placements.map(p=>({...p})),warnings:[...s.warnings]}
}
