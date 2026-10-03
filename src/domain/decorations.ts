import { worldTheme, themeText } from './worldThemes'
import { unitMeters, metersPerPixel } from './mapScale'
import { defaultFont, validFont } from '../fonts/registry'
import { createMarkerBundle } from './markers'
import { markerDefaults } from './markerRegistry'
import type { AnnotationBase, TextStyle, Annotation, LegendEntry } from './annotations'
import { createCompass,createLegend,legendLayout,DEFAULT_TEXT,textLayout,textWidth,validateTextStyle } from './annotations'
import type { MapDocument } from './models'
import type { Point } from '../canvas/viewport'
import { isLandMap } from './geography'
import { validTransform } from './transforms'
import { defaultElementPreset,elementPreset } from './cartographicPresets'
import type { ElementKind,ElementPreset } from './cartographicPresets'

interface DecorationBase extends AnnotationBase { assetId?:never; elementVersion:1; elementPreset:ElementPreset; color:string; background:string }
export type ScaleUnit='km'|'mi'|'m'|'ft'
export interface ScaleBarObject extends DecorationBase {kind:'scaleBar';font?:string;unit:ScaleUnit;showLabels:boolean}
export interface TextPanelFields extends DecorationBase {title:string;body:string;contentMode:'note'|'list';style:TextStyle;frame:boolean}
export type TextPanelObject=TextPanelFields & ({kind:'title'}|{kind:'infoPanel'})
export type DecorationObject=ScaleBarObject|TextPanelObject
export const SCALE_UNITS:readonly ScaleUnit[]=['km','mi','m','ft']
export { unitMeters, metersPerPixel } from './mapScale'
/** The complete bar spans the object's width. Resizing changes the real displayed distance, never the scale. */
export function scaleBarMeasure(o:Pick<ScaleBarObject,'width'|'unit'>,map:MapDocument){
 const scale=metersPerPixel(map)
 if(scale===null)return null
 const value=o.width*scale/unitMeters(o.unit)
 const format=(n:number)=>Number(n.toPrecision(5)).toString()
 return {value,label:format(value)+' '+o.unit,halfLabel:format(value/2),pixels:o.width}
}
export function scaleBarWidth(distance:number,unit:ScaleUnit,map:MapDocument):number {
 const scale=metersPerPixel(map)
 if(scale===null)throw Error('Configure physical scale in Map settings first.')
 if(!Number.isFinite(distance)||distance<=0)throw Error('Choose a positive distance.')
 const width=distance*unitMeters(unit)/scale
 if(!Number.isFinite(width)||width<1||width>1e7)throw Error('This distance is outside the supported object size.')
 return width
}
export function panelLayout(o:Pick<TextPanelObject,'kind'|'title'|'body'|'contentMode'|'style'> & {elementPreset?:ElementPreset}){
 const carrier=o.kind==='title'?elementPreset('title',o.elementPreset).titleCarrier:undefined
 if(carrier)return titleCarrierLayout(o,carrier)
 const bodyText=o.kind==='infoPanel'&&o.contentMode==='list'?o.body.split('\n').map((line,i)=>`${i+1}. ${line}`).join('\n'):o.body
 const titleStyle={...o.style,bold:o.kind==='title'?o.style.bold:true,size:o.kind==='title'?o.style.size:o.style.size*1.15,padding:0,backgroundOpacity:0}
 const bodyStyle={...o.style,size:o.kind==='title'?o.style.size*.55:o.style.size,padding:0,backgroundOpacity:0}
 const title=textLayout(o.title,titleStyle),body=textLayout(bodyText,bodyStyle)
 const pad=22+o.style.strokeWidth
 return {width:o.style.maxWidth+pad*2,height:pad*2+(o.title?title.height:0)+(o.body?body.height+(o.title?12:0):0),title,body,titleStyle,bodyStyle,pad,padY:pad,overflow:false}
}

/** New carriers fit text within their vector safe area; legacy layouts are untouched. */
function titleCarrierLayout(o:Pick<TextPanelObject,'title'|'body'|'style'>,carrier:import('./cartographicPresets').TitleCarrier){
 const width=o.style.maxWidth+44,height=width/carrier.aspect,pad=width*carrier.insetX,padY=height*carrier.insetY
 const maxWidth=width-pad*2-2*o.style.strokeWidth,available=height-padY*2
 const titleText=o.title,bodyText=o.body.replace(/\n/g,' ')
 const desired={...o.style,maxWidth,padding:0,backgroundOpacity:0}
 const ratio=Math.min(1,maxWidth/Math.max(1,textWidth(titleText,desired)),maxWidth/Math.max(1,textWidth(bodyText,{...desired,size:desired.size*.55})),Math.max(0,available-(o.title&&o.body?12:0))/Math.max(1,(o.title?desired.size*desired.lineHeight:0)+(o.body?desired.size*.55*desired.lineHeight:0)))
 const size=Math.max(Math.min(carrier.minFontSize,desired.size),desired.size*ratio)
 const titleStyle={...desired,size},bodyStyle={...desired,size:size*.55}
 const title={lines:o.title?[titleText]:[],height:o.title?size*desired.lineHeight:0},body={lines:o.body?[bodyText]:[],height:o.body?size*.55*desired.lineHeight:0}
 const contentHeight=title.height+body.height+(o.title&&o.body?12:0)
 const overflow=textWidth(titleText,titleStyle)>maxWidth||textWidth(bodyText,bodyStyle)>maxWidth||contentHeight>available
 return {width,height,title,body,titleStyle,bodyStyle,pad,padY:Math.max(padY,(height-contentHeight)/2),overflow}
}
export function createMapElement(kind:ElementKind,point:Point,map:MapDocument,entries:LegendEntry[]=[],presetId=defaultElementPreset(kind,map.mapType,map.theme?.id)):Annotation {
 if(kind==='place'){const choice=markerDefaults(map.mapType),preset=elementPreset(kind,presetId);return createMarkerBundle(point,{...choice,marker:{...choice.marker,style:preset.id as typeof choice.marker.style,ink:preset.ink,outline:preset.paper}},map)[0]}
 const candidate=worldTheme(map.theme?.id)
 const theme=candidate?.mapTypes.includes(map.mapType??'battlemap')&&presetId===defaultElementPreset(kind,map.mapType,map.theme?.id)?candidate:undefined
 const preset={...elementPreset(kind,presetId),...(theme?{ink:theme.ink,paper:theme.paper}:{})}
 if(kind==='compass')return center({...createCompass(point),width:preset.size??80,height:preset.size??80,elementPreset:preset.id,color:preset.ink,northLabel:true,cardinalLabels:preset.id!=='technical'&&preset.id!=='minimal',ring:preset.id!=='minimal'},point)
 if(kind==='legend'){const o={...createLegend(point,entries),font:theme?.font??defaultFont(map.mapType,'legend',preset.id),elementPreset:preset.id,background:preset.paper,outline:preset.ink,padding:22,spacing:8};const layout=legendLayout(o);return center({...o,width:layout.width,height:layout.height},point)}
 const base={id:crypto.randomUUID(),name:kind==='scaleBar'?'Scale bar':kind==='title'?'Map title':'Map notes',x:point.x,y:point.y,width:240,height:56,rotation:0,scaleX:1,scaleY:1,opacity:1,elementVersion:1 as const,elementPreset:preset.id,color:preset.ink,background:preset.paper}
 if(kind==='scaleBar'){
  const unit=isLandMap(map)?map.geography?.unit??'km':map.grid.physicalScale?.unit??'m'
  const scale=metersPerPixel(map)
  if(scale){const max=240*scale/unitMeters(unit),magnitude=10**Math.floor(Math.log10(max));const distance=([5,2,1].find(n=>n*magnitude<=max)??1)*magnitude;return center({...base,kind,font:theme?.font??defaultFont(map.mapType,'scaleBar'),unit,showLabels:true,width:distance*unitMeters(unit)/scale},point)}
  return center({...base,kind,font:theme?.font??defaultFont(map.mapType,'scaleBar'),unit,showLabels:true},point)
 }
 const o:TextPanelObject={...base,kind,title:kind==='title'?'Untitled lands':'Map notes',body:kind==='title'?'':'Write your notes here.',contentMode:'note',style:{...DEFAULT_TEXT,font:defaultFont(map.mapType,kind,preset.id),size:kind==='title'?32:16,maxWidth:kind==='title'?420:280,backgroundOpacity:0,bold:kind==='title',color:preset.ink,align:kind==='title'?'center':'left',...(theme?themeText(theme,kind==='title'?'title':'legend'):{})},frame:preset.frame!=='none'}
 const layout=panelLayout(o)
 return center({...o,width:layout.width,height:layout.height},point)
}
function center<T extends AnnotationBase>(o:T,p:Point):T{return {...o,x:p.x-o.width/2,y:p.y-o.height/2}}
export function validateDecoration(o:DecorationObject):DecorationObject {
 const common=['id','name','kind','x','y','width','height','rotation','scaleX','scaleY','opacity','visible','locked','elementVersion','elementPreset','color','background']
 const extra=o.kind==='scaleBar'?['font','unit','showLabels']:['title','body','contentMode','style','frame']
 const plain=(v:unknown,max:number,multi=false):v is string=>typeof v==='string'&&v.length<=max&&![...v].some(c=>(c.charCodeAt(0)<32&&!(multi&&c==='\n'))||c.charCodeAt(0)===127)
 const color=(v:unknown)=>typeof v==='string'&&/^#[a-f0-9]{6}$/i.test(v)
 if(Object.keys(o).some(k=>![...common,...extra].includes(k))||!validTransform(o)||!Number.isFinite(o.opacity)||o.opacity<0||o.opacity>1||o.rotation<0||o.rotation>=360||typeof o.id!=='string'||!/^[-\w]{1,80}$/.test(o.id)||!plain(o.name,120)||!o.name.trim()||o.elementVersion!==1||!plain(o.elementPreset,80)||!color(o.color)||!color(o.background)||[o.visible,o.locked].some(v=>v!==undefined&&typeof v!=='boolean'))throw Error('Invalid cartographic element.')
 if(o.kind==='scaleBar'){
  if((o.font!==undefined&&!validFont(o.font))||!SCALE_UNITS.includes(o.unit)||typeof o.showLabels!=='boolean')throw Error('Invalid scale bar.')
 }else{
  if(!plain(o.title,120)||!plain(o.body,2048,true)||!['note','list'].includes(o.contentMode)||typeof o.frame!=='boolean'||!o.style)throw Error('Invalid text panel.')
  validateTextStyle(o.style)
 }
 return {...o,elementPreset:elementPreset(o.kind,o.elementPreset).id}
}
