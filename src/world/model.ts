import { validateGeographyNetwork } from './geographyNetwork'
import { validateWorldScatterSource } from './scatterModel'
import type { MapObject, MapLayer, MapDocument } from '../domain/models'
import type { LayerTree } from '../domain/grouping'
export interface WorldParameters { seed:string; continents:number; water:number; roughness:number; mountains:number; forests:number; rivers:number; islands:number; climate:'balanced'|'cold'|'tropical'|'dry'|'wet'; width:number; height:number; widthKm:number }
export const WORLD_DEFAULTS:WorldParameters={seed:'Amber coast',continents:4,water:.42,roughness:.55,mountains:.5,forests:.55,rivers:14,islands:.25,climate:'balanced',width:2400,height:1500,widthKm:30000}
export const WORLD_PRESETS:Record<string,Partial<WorldParameters>>={
 'Balanced Fantasy':{},'Archipelago':{continents:8,water:.53,islands:.9,roughness:.8},'Large Continents':{continents:2,water:.35,roughness:.4},'Harsh / Mountainous':{mountains:.9,forests:.2,climate:'cold'},'Wet / Forested':{forests:.9,climate:'wet',rivers:24},'Dry / Sparse':{forests:.15,climate:'dry',rivers:5},
}
export interface WorldGeneration {scatter?:import('./scatterModel').WorldScatterSource;generatorId:'world-v1';generatorVersion:1|2;geography?:import('./geographyNetwork').GeographyNetwork;parameters:WorldParameters;groupId:string;objectIds:string[];layerIds:string[]}
export interface WorldResult {assets?:import('../projects/types').ProjectAsset[];map:MapDocument;objects:MapObject[];layers:MapLayer[];layerTree:LayerTree;stats:{points:number;landFraction:number;riverCount:number;discarded:number}}
export function validateWorldParameters(p:WorldParameters):WorldParameters {
 if(!p||Object.keys(p).some(k=>!Object.keys(WORLD_DEFAULTS).includes(k))||typeof p.seed!=='string'||!p.seed.trim()||p.seed.length>80||[...p.seed].some(c=>c.charCodeAt(0)<32))throw Error('Use a seed of 1–80 printable characters.')
 for(const key of ['water','roughness','mountains','forests','islands'] as const)if(!Number.isFinite(p[key])||p[key]<0||p[key]>1)throw Error('Generation amounts must be between 0 and 100%.')
 if(p.water<.15||p.water>.75)throw Error('Water level must be 15–75%.')
 if(!Number.isInteger(p.continents)||p.continents<1||p.continents>8||!Number.isInteger(p.rivers)||p.rivers<0||p.rivers>40||!['balanced','cold','tropical','dry','wet'].includes(p.climate))throw Error('Choose 1–8 continents, 0–40 rivers and a supported climate.')
 if(![p.width,p.height].every(n=>Number.isInteger(n)&&n>=512&&n<=4096)||p.width*p.height>12000000||!Number.isFinite(p.widthKm)||p.widthKm<1||p.widthKm>1000000)throw Error('World size must be 512–4096 px per side (up to 12 million pixels), with a width of 1–1,000,000 km.')
 return {...p}
}
export function validateWorldGeneration(v:WorldGeneration):WorldGeneration {
 if(!v||Object.keys(v).some(k=>!['generatorId','generatorVersion','parameters','groupId','objectIds','layerIds','scatter','geography'].includes(k))||v.generatorId!=='world-v1'||![1,2].includes(v.generatorVersion)||v.groupId!=='world-v1')throw Error('Unsupported world generator metadata.')
 for(const [ids,max] of [[v.objectIds,840],[v.layerIds,13]] as const)if(!Array.isArray(ids)||ids.length>max||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!/^world-v1-[a-z0-9-]{1,64}$/.test(id)))throw Error('Invalid generated-content ownership.')
 return {...v,...(v.geography!==undefined?{geography:validateGeographyNetwork(v.geography)}:{}),...(v.scatter!==undefined?{scatter:validateWorldScatterSource(v.scatter)}:{}),parameters:validateWorldParameters(v.parameters),objectIds:[...v.objectIds],layerIds:[...v.layerIds]}
}
