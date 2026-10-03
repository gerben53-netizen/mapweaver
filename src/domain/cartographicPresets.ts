import { themeElementPreset } from './worldThemes'
import type { MapType } from './geography'
import type { TextStyle } from './annotations'

export type ElementKind = 'place' | 'compass' | 'scaleBar' | 'title' | 'legend' | 'infoPanel'
export type ElementPreset = 'technical' | 'minimal' | 'classic' | 'ornate' | 'parchment' | 'simple' | 'banner' | 'cartouche' | 'legacy' | 'ribbon' | 'scroll' | 'fantasy' | 'plaque'
export interface TitleCarrier { aspect: number; insetX: number; insetY: number; minFontSize: number }
export interface CartographicPreset { titleCarrier?: TitleCarrier; id: ElementPreset; name: string; ink: string; paper: string; size?:number; frame: 'none'|'line'|'ornate'|'parchment'|'banner'|'cartouche'; mapTypes: readonly MapType[] }
const all: readonly MapType[] = ['battlemap','regional-map','world-map']
const preset = (id:ElementPreset,name:string,frame:CartographicPreset['frame']='none',ink='#343e36',paper='#f4f0dd'):CartographicPreset => ({id,name,frame,ink,paper,mapTypes:all})
const minimal=preset('minimal','Minimal'), classic=preset('classic','Cartographic','line'), ornate=preset('ornate','Ornate Fantasy','ornate','#51432c'), parchment=preset('parchment','Parchment','parchment','#634c32','#ead7ad')
export const CARTOGRAPHIC_ELEMENT_PRESETS:Record<ElementKind,readonly CartographicPreset[]> = {
 place:[minimal,classic,ornate,{...parchment,name:'Parchment / Explorer'},preset('technical','Technical')],
 compass:[{...preset('technical','Technical'),size:80},{...minimal,size:100},{...classic,name:'Cartographic Classic',size:160},{...ornate,name:'Ornate Fantasy',size:192},{...parchment,name:'Parchment Explorer',size:176}],
 scaleBar:[minimal,classic,ornate,parchment],
 title:[preset('simple','Simple'),
 {...preset('ribbon','Ribbon Banner','banner','#493a2b','#e8d5a8'),titleCarrier:{aspect:4.4,insetX:.15,insetY:.22,minFontSize:12}},
 {...preset('scroll','Parchment Banner','parchment','#61472f','#ead6aa'),titleCarrier:{aspect:4,insetX:.12,insetY:.22,minFontSize:12}},
 {...preset('fantasy','Ornate Fantasy Cartouche','ornate','#51412c','#f0e3c4'),titleCarrier:{aspect:3.8,insetX:.15,insetY:.24,minFontSize:12}},
 {...preset('plaque','Region Nameplate','cartouche','#3c493e','#d8d8bf'),titleCarrier:{aspect:4.8,insetX:.12,insetY:.2,minFontSize:12}},preset('banner','Banner','banner'),preset('cartouche','Cartouche','cartouche'),ornate,parchment],
 legend:[preset('legacy','Legacy','line'),minimal,classic,ornate,parchment],
 infoPanel:[minimal,classic,ornate,parchment],
}
export const MAP_ELEMENTS:readonly {kind:ElementKind|'label';name:string;description:string}[] = [
 {kind:'place',name:'Marker',description:'Places, landmarks and points of interest'},
 {kind:'compass',name:'Compass',description:'Add a north arrow or compass rose'},
 {kind:'scaleBar',name:'Scale bar',description:'Show distance using the current map scale'},
 {kind:'title',name:'Title / Cartouche',description:'Add a framed map title and subtitle'},
 {kind:'legend',name:'Legend',description:'Explain map symbols in a legend'},
 {kind:'label',name:'Label',description:'Place editable text on the map'},
 {kind:'infoPanel',name:'List / Note',description:'Add a note, index or numbered list'},
]
export const elementName=(kind:string)=>MAP_ELEMENTS.find(e=>e.kind===kind)?.name??kind[0].toUpperCase()+kind.slice(1)
const defaults:Record<MapType,Record<ElementKind,ElementPreset>>={
 battlemap:{place:'minimal',compass:'technical',scaleBar:'minimal',title:'simple',legend:'minimal',infoPanel:'minimal'},
 'regional-map':{place:'classic',compass:'classic',scaleBar:'classic',title:'ribbon',legend:'classic',infoPanel:'classic'},
 'world-map':{place:'ornate',compass:'ornate',scaleBar:'ornate',title:'fantasy',legend:'ornate',infoPanel:'parchment'},
}
export const defaultElementPreset=(kind:ElementKind,mapType:MapType='battlemap',themeId?:string)=>themeElementPreset(kind,mapType,themeId)??defaults[mapType][kind]
/** Unknown style IDs fall back deterministically; never infer a saved style from map type. */
export function elementPreset(kind:ElementKind,id:unknown):CartographicPreset {
 const entries=CARTOGRAPHIC_ELEMENT_PRESETS[kind]
 return entries.find(p=>p.id===id)??entries[0]
}
export const LABEL_PRESETS=['Place','Region','Landmark','Water','Annotation','Title-like'] as const
export function semanticLabelStyle(name:string,current:TextStyle):TextStyle {
 const base={...current,backgroundOpacity:0,bold:false,italic:false,letterSpacing:0}
 switch(name){
 case 'Region':return {...base,size:30,bold:true,letterSpacing:2}
 case 'Landmark':return {...base,size:22,bold:true}
 case 'Water':return {...base,font:'cormorantgaramond',size:24,italic:true,color:'#315f76',strokeColor:'#f7f2e6',strokeWidth:2}
 case 'Annotation':return {...base,size:16}
 case 'Title-like':return {...base,size:36,bold:true,letterSpacing:1}
 default:return {...base,size:20,bold:true}
 }
}
