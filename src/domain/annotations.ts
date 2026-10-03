import { validateAutomaticLabel, type AutomaticLabel } from './automaticLabelMetadata'
import { worldTheme, themeText } from './worldThemes'
import { validateMarker } from './markerRegistry'
import type { MarkerConfig } from './markerRegistry'
import { elementPreset } from './cartographicPresets'
import type { ElementPreset } from './cartographicPresets'
import { validateDecoration } from './decorations'
import type { DecorationObject } from './decorations'
import type { MapType } from './geography'
import type { MapObject, MapLayer, MapDocument, TypedAsset } from './models'
import type { Point } from '../canvas/viewport'
import { validTransform } from './transforms'
import { pixelsPerKm } from './geography'
import { placementSize } from './placement'
import { fontMetrics, validFont, defaultFont } from '../fonts/registry'

export const PLACE_TYPES = ['capital','city','town','village','fort','ruin','landmark','custom'] as const
export type LabelPosition = 'above'|'below'|'left'|'right'|'center'
export interface AnnotationBase { id:string; name:string; x:number; y:number; width:number; height:number; rotation:number; scaleX:number; scaleY:number; opacity:number; visible?:boolean; locked?:boolean; assetId?:string }
export interface PlaceObject extends AnnotationBase { kind:'place'; visualMode?:'symbol'|'illustrated'; marker?:MarkerConfig; placeType:string; sizeMode:'cartographic'|'world'; pixelsPerKm:number; anchor:Point; note:string; tags:string[]; importance:number }
export interface TextStyle { font:string; size:number; bold:boolean; italic:boolean; letterSpacing:number; lineHeight:number; align:'left'|'center'|'right'; color:string; strokeColor:string; strokeWidth:number; background:string; backgroundOpacity:number; padding:number; maxWidth:number }
export interface LabelObject extends AnnotationBase { kind:'label'; automatic?:AutomaticLabel; markerName?:boolean; assetId?:never; text:string; style:TextStyle; ownerId?:string; offset:Point; anchor:Point; preset:LabelPosition; leader:boolean; layoutScale:number }
export interface LegendEntry { id:string; text:string; placeType:string; assetId?:string; color:string }
export interface LegendObject extends AnnotationBase { kind:'legend'; font?:string; elementPreset?:ElementPreset; spacing?:number; assetId?:never; title:string; entries:LegendEntry[]; columns:number; padding:number; background:string; outline:string; layoutScale:number }
export interface CompassObject extends AnnotationBase { kind:'compass'; elementPreset?:ElementPreset; northLabel?:boolean; cardinalLabels?:boolean; ring?:boolean; compassStyle:'arrow'|'rose'|'cross'; color:string }
export type Annotation = PlaceObject|LabelObject|LegendObject|CompassObject|DecorationObject
export const ANNOTATION_LIMITS = { labels:2000, text:2048, entries:64, overlap:100, candidates:25 }
export const DEFAULT_TEXT:TextStyle={font:'liberation-sans',size:18,bold:false,italic:false,letterSpacing:0,lineHeight:1.2,align:'center',color:'#242922',strokeColor:'#ffffff',strokeWidth:0,background:'#f4f0dd',backgroundOpacity:.85,padding:4,maxWidth:180}
/** Explicit creation presets; saved styles and legacy legend metrics stay unchanged. */
export function labelTextStyle(type:MapType='battlemap',themeId?:string):TextStyle {
 const theme=worldTheme(themeId);if(theme&&theme.mapTypes.includes(type))return {...labelTextStyle(type),...themeText(theme,'region')}
 const base={...DEFAULT_TEXT,font:defaultFont(type,'label'),backgroundOpacity:0,padding:3,strokeWidth:1.5}
 if(type==='regional-map')return {...base,size:24,color:'#f7f2e6',strokeColor:'#28342f',strokeWidth:2,bold:true,letterSpacing:.5,maxWidth:260}
 if(type==='world-map')return {...base,size:30,color:'#f7f2e6',strokeColor:'#28342f',strokeWidth:2.5,bold:true,letterSpacing:1.5,maxWidth:360}
 return base
}
export const isAnnotation=(o: {kind:string}):o is Annotation=>['place','label','legend','compass','scaleBar','title','infoPanel'].includes(o.kind)
const base=(name:string,point:Point,width:number,height:number):Omit<AnnotationBase,'assetId'>=>({id:crypto.randomUUID(),name,x:point.x-width/2,y:point.y-height/2,width,height,rotation:0,scaleX:1,scaleY:1,opacity:1})
export function createPlace(point:Point,name:string,type:string,map:MapDocument,asset?:TypedAsset,mode:PlaceObject['sizeMode']='cartographic'):PlaceObject {
  const size=mode==='world'&&asset?placementSize(asset,map):{width:28,height:asset?28*asset.naturalHeight/asset.naturalWidth:28}
  return validateAnnotation({...base(name,point,size.width,size.height),kind:'place',placeType:type,sizeMode:mode,pixelsPerKm:pixelsPerKm(map),anchor:{x:.5,y:.5},note:'',tags:[],importance:0,...(asset?{assetId:asset.id}:{})}) as PlaceObject
}
export const fontVariant=(s:TextStyle)=>s.bold?s.italic?'BoldItalic':'Bold':s.italic?'Italic':'Regular'
export function glyph(char:string,s:TextStyle){const m=fontMetrics(s);return m[String(char.codePointAt(0))]!==undefined?char:'?'}
export function advance(char:string,s:TextStyle){return fontMetrics(s)[String(glyph(char,s).codePointAt(0))]*s.size+s.letterSpacing}
export const textWidth=(text:string,s:TextStyle)=>Math.max(0,[...text].reduce((n,c)=>n+advance(c,s),0)-(text?s.letterSpacing:0))
const layouts=new Map<string,{lines:string[];width:number;height:number}>()
export function textLayout(text:string,s:TextStyle) {
  const key=JSON.stringify([text,s]);const cached=layouts.get(key);if(cached)return cached
  const lines:string[]=[]
  for(const paragraph of text.split('\n')){
    let line=''
    for(const word of paragraph.split(/( +)/)){
      if(line&&textWidth(line+word,s)>s.maxWidth){lines.push(line.trimEnd());line=''}
      for(const c of word){if(line&&textWidth(line+c,s)>s.maxWidth){lines.push(line);line=''};line+=c}
    }
    lines.push(line.trimEnd())
  }
  const result={lines,width:s.maxWidth+2*(s.padding+s.strokeWidth),height:Math.max(1,lines.length)*s.size*s.lineHeight+2*(s.padding+s.strokeWidth)}
  if(layouts.size>=512)layouts.delete(layouts.keys().next().value!)
  layouts.set(key,result);return result
}
export function labelOffset(owner:MapObject,label:Pick<LabelObject,'width'|'height'>,preset:LabelPosition):Point {
  return {x:preset==='left'?-(owner.width+label.width)/2-8:preset==='right'?(owner.width+label.width)/2+8:0,y:preset==='above'?-(owner.height+label.height)/2-8:preset==='below'?(owner.height+label.height)/2+8:0}
}
export function createLabel(point:Point,text:string,owner?:MapObject,preset:LabelPosition='below',mapType:MapType='battlemap',themeId?:string):LabelObject {
  const theme=worldTheme(themeId),style={...labelTextStyle(mapType,themeId),...(theme?.mapTypes.includes(mapType)&&owner?themeText(theme,owner.kind==='path'&&owner.pathKind==='river'?'water':owner.kind==='place'?'city':'region'):{})},layout=textLayout(text,style),label:LabelObject={...base(text.replaceAll('\n',' ').slice(0,120)||'Label',point,layout.width,layout.height),kind:'label',text,style,offset:{x:0,y:0},anchor:{x:.5,y:.5},preset,leader:false,layoutScale:1,...(owner?{ownerId:owner.id}:{})}
  if(owner){label.offset=labelOffset(owner,label,preset);label.x=owner.x+owner.width/2+label.offset.x-label.width/2;label.y=owner.y+owner.height/2+label.offset.y-label.height/2}
  return label
}
export function restyleLabel(label:LabelObject,style:TextStyle,text=label.text):LabelObject {
  const layout=textLayout(text,style),width=layout.width*label.layoutScale,height=layout.height*label.layoutScale
  return validateAnnotation({...label,style,text,name:text.replaceAll('\n',' ').slice(0,120)||'Label',x:label.x+(label.width-width)*label.anchor.x,y:label.y+(label.height-height)*label.anchor.y,width,height}) as LabelObject
}
export function createLegend(point:Point,entries:LegendEntry[]=[]):LegendObject {return {...base('Legend',point,240,Math.max(68,52+entries.length*28)),kind:'legend',title:'Legend',entries,columns:1,padding:12,background:'#f4f0dd',outline:'#343e36',layoutScale:1}}
export function createCompass(point:Point):CompassObject{return {...base('Compass',point,80,80),kind:'compass',compassStyle:'rose',color:'#343e36'}}
export function legendLayout(o:Pick<LegendObject,'title'|'entries'|'columns'|'padding'|'spacing'|'font'>){
  const width=240*o.columns,titleStyle={...DEFAULT_TEXT,font:o.font??DEFAULT_TEXT.font,size:18,bold:true,maxWidth:width-2*o.padding,padding:0},entryStyle={...DEFAULT_TEXT,font:o.font??DEFAULT_TEXT.font,size:14,maxWidth:240-2*o.padding-28,padding:0}
  const title=textLayout(o.title,titleStyle),rows=Math.ceil(o.entries.length/o.columns),tops=Array.from({length:o.columns},()=>o.padding+title.height+12)
  const entries=o.entries.map((entry,i)=>{const column=Math.floor(i/Math.max(1,rows)),layout=textLayout(entry.text,entryStyle),x=o.padding+column*240,y=tops[column];tops[column]+=Math.max(20,layout.height)+(o.spacing??8);return {entry,lines:layout.lines,x,y}})
  return {width,height:Math.max(...tops)+o.padding,title,titleStyle,entryStyle,entries}
}
export function legendEntries(objects:MapObject[]):LegendEntry[]{const result=new Map<string,LegendEntry>();for(const o of objects)if(o.kind==='place'){const key=o.placeType+'|'+(o.assetId||'');if(!result.has(key))result.set(key,{id:crypto.randomUUID(),text:o.placeType,placeType:o.placeType,...(o.assetId?{assetId:o.assetId}:{}),color:'#343e36'})}if(result.size>64)throw Error('Choose at most 64 legend entries.');return [...result.values()]}

const finite=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max
const plain=(v:unknown,max:number,multiline=false):v is string=>typeof v==='string'&&v.length<=max&&![...v].some(c=>(c.charCodeAt(0)<32&&!(multiline&&c==='\n'))||c.charCodeAt(0)===127)
const identifier=(v:unknown)=>typeof v==='string'&&/^[\w-]{1,80}$/.test(v)
const color=(v:unknown)=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v)
const point=(v:Point,max=1e9)=>v&&Object.keys(v).length===2&&finite(v.x,-max,max)&&finite(v.y,-max,max)
export function validateTextStyle(s:TextStyle):void {
  if(!s||Object.keys(s).some(k=>!Object.keys(DEFAULT_TEXT).includes(k))||!validFont(s.font)||!finite(s.size,6,200)||typeof s.bold!=='boolean'||typeof s.italic!=='boolean'||!finite(s.letterSpacing,0,20)||!finite(s.lineHeight,1,3)||!['left','center','right'].includes(s.align)||!color(s.color)||!color(s.strokeColor)||!color(s.background)||!finite(s.strokeWidth,0,12)||!finite(s.backgroundOpacity,0,1)||!finite(s.padding,0,40)||!finite(s.maxWidth,20,2000))throw Error('Invalid text font or style.')
}
export function validateAnnotation(input:Annotation):Annotation {
  const o=input;if(o?.kind==='legend'&&o.font!==undefined&&!validFont(o.font))throw Error('Invalid legend font.');if(!o||!isAnnotation(o))throw Error('Invalid annotation kind.')
  const common=['id','kind','name','x','y','width','height','rotation','scaleX','scaleY','opacity','visible','locked','assetId']
  if(o.kind==='scaleBar'||o.kind==='title'||o.kind==='infoPanel')return validateDecoration(o)
  const extra=o.kind==='place'?['visualMode','marker','placeType','sizeMode','pixelsPerKm','anchor','note','tags','importance']:o.kind==='label'?['automatic','markerName','text','style','ownerId','offset','anchor','preset','leader','layoutScale']:o.kind==='legend'?['font','title','entries','columns','padding','background','outline','layoutScale','elementPreset','spacing']:['compassStyle','color','elementPreset','northLabel','cardinalLabels','ring']
  if(Object.keys(o).some(k=>![...common,...extra].includes(k))||!identifier(o.id)||!plain(o.name,120)||!o.name.trim()||!validTransform(o)||!finite(o.opacity,0,1)||!finite(o.rotation,0,359.999999999)||[o.visible,o.locked].some(v=>v!==undefined&&typeof v!=='boolean')||(o.assetId!==undefined&&(!['place','compass'].includes(o.kind)||!identifier(o.assetId))))throw Error('Invalid annotation fields or transform.')
  if(o.kind==='place'&&(!plain(o.placeType,60)||!o.placeType.trim()||!['cartographic','world'].includes(o.sizeMode)||!finite(o.pixelsPerKm,1e-12,1e12)||!point(o.anchor,1)||o.anchor.x<0||o.anchor.y<0||!plain(o.note,1024,true)||!Array.isArray(o.tags)||o.tags.length>16||o.tags.some(t=>!plain(t,40))||!finite(o.importance,0,5)))throw Error('Invalid place metadata.')
  if(o.kind==='place'&&o.marker!==undefined){if(o.assetId&&o.visualMode!=='illustrated')throw Error('Symbol markers cannot also use an asset.');validateMarker(o.marker,o.placeType)}
  if(o.kind==='place'&&o.visualMode!==undefined&&(!['symbol','illustrated'].includes(o.visualMode)||!o.marker||(o.visualMode==='illustrated'&&!o.assetId)))throw Error('Invalid marker visual mode or missing illustration.');
  if(o.kind==='label'){
    if(o.automatic!==undefined)validateAutomaticLabel(o.automatic)
    if(o.markerName!==undefined&&typeof o.markerName!=='boolean')throw Error('Invalid marker label link.')
    const s=o.style
    validateTextStyle(s)
    if(!plain(o.text,2048,true)||!point(o.offset)||!point(o.anchor,1)||o.anchor.x<0||o.anchor.y<0||!['above','below','left','right','center'].includes(o.preset)||typeof o.leader!=='boolean'||(o.ownerId!==undefined&&!identifier(o.ownerId))||!finite(o.layoutScale,.001,1000))throw Error('Invalid label text, font or layout.')
    const layout=textLayout(o.text,s);if(Math.abs(o.width-layout.width*o.layoutScale)>1e-5||Math.abs(o.height-layout.height*o.layoutScale)>1e-5)throw Error('Label bounds do not match its layout.')
  }
  if(o.kind==='legend'&&(!plain(o.title,120)||!Number.isInteger(o.columns)||!finite(o.columns,1,4)||!finite(o.padding,0,40)||!finite(o.layoutScale,.001,1000)||!color(o.background)||!color(o.outline)||!Array.isArray(o.entries)||o.entries.length>64||new Set(o.entries.map(e=>e.id)).size!==o.entries.length||o.entries.some(e=>!e||Object.keys(e).some(k=>!['id','text','placeType','assetId','color'].includes(k))||!identifier(e.id)||!plain(e.text,120)||!plain(e.placeType,60)||!color(e.color)||(e.assetId!==undefined&&!identifier(e.assetId)))))throw Error('Invalid legend.')
  if(o.kind==='compass'&&(!['arrow','rose','cross'].includes(o.compassStyle)||!color(o.color)))throw Error('Invalid compass.')
  if(o.kind==='compass'&&[o.northLabel,o.cardinalLabels,o.ring].some(v=>v!==undefined&&typeof v!=='boolean'))throw Error('Invalid compass labels or ring.')
  if(o.kind==='legend'&&o.spacing!==undefined&&!finite(o.spacing,0,80))throw Error('Invalid legend spacing.')
  if((o.kind==='compass'||o.kind==='legend')&&o.elementPreset!==undefined){if(typeof o.elementPreset!=='string'||o.elementPreset.length>80)throw Error('Invalid element preset.');return {...o,elementPreset:elementPreset(o.kind,o.elementPreset).id}}
  return o
}
export function annotationBudget(objects:MapObject[]){if(objects.filter(o=>o.kind==='label'||o.kind==='title'||o.kind==='infoPanel').length>2000)throw Error('A project supports at most 2,000 text elements (labels, titles and panels).');objects.filter(isAnnotation).forEach(validateAnnotation)}
/** Owner center + explicit map-axis offset = label anchor. No chains or cycles. */
export function reconcileLabels(objects:MapObject[],layers?:MapLayer[],previous?:MapObject[],strict=false):MapObject[]{
  const byId=new Map(objects.map(o=>[o.id,o])),prior=new Map(previous?.map(o=>[o.id,o])),membership=layers?new Map(layers.flatMap(l=>l.objectIds.map(id=>[id,l.id] as const))):null
  return objects.map(original=>{
    let o=original
    if(o.kind!=='label'||!o.ownerId)return o
    const owner=byId.get(o.ownerId);if(!owner||owner.kind==='label')throw Error('A linked label needs a non-label owner.')
    if(membership&&membership.get(o.id)!==membership.get(owner.id))throw Error('Move a linked label and its owner to the same layer.')
    if(o.markerName&&o.text!==owner.name){
      const resized=restyleLabel(o,o.style,owner.name),before=labelOffset(owner,o,o.preset),after=labelOffset(owner,resized,o.preset),offset={x:o.offset.x+after.x-before.x,y:o.offset.y+after.y-before.y}
      o={...resized,offset,x:owner.x+owner.width/2+offset.x-resized.width*resized.anchor.x,y:owner.y+owner.height/2+offset.y-resized.height*resized.anchor.y}
    }
    const old=prior.get(o.id),cx=owner.x+owner.width/2,cy=owner.y+owner.height/2
    // An explicitly moved label defines a new offset. Untouched labels follow owners.
    const offset=old&&old!==o?{x:o.x+o.width*o.anchor.x-cx,y:o.y+o.height*o.anchor.y-cy}:o.offset
    const x=cx+offset.x-o.width*o.anchor.x,y=cy+offset.y-o.height*o.anchor.y
    if(strict&&(Math.abs(x-o.x)>1e-5||Math.abs(y-o.y)>1e-5))throw Error('Linked label bounds differ from its offset.')
    return x===o.x&&y===o.y&&offset===o.offset?o:{...o,x,y,offset}
  })
}
export function transformAnnotation(o:Annotation,t:Pick<AnnotationBase,'x'|'y'|'width'|'height'|'rotation'|'scaleX'|'scaleY'>):Annotation {
  if(o.kind==='label'){const scale=t.width/o.width;return validateAnnotation({...o,...t,height:o.height*scale,layoutScale:o.layoutScale*scale})}
  return validateAnnotation({...o,...t})
}
export function avoidOverlaps(objects:MapObject[],ids:string[]):LabelObject[]{
  const labels=objects.filter((o):o is LabelObject=>o.kind==='label'&&ids.includes(o.id)).sort((a,b)=>a.id.localeCompare(b.id,'en'))
  if(!labels.length||labels.length>100)throw Error('Select 1–100 labels for an overlap preview.')
  const boxes=objects.filter(o=>!ids.includes(o.id)&&o.visible!==false).map(o=>({x:o.x,y:o.y,width:o.width,height:o.height}))
  return labels.map(o=>{let best=o,score=Infinity;for(let i=0;i<25;i++){const ring=Math.ceil(i/8),angle=(i-1)%8*Math.PI/4;const x=o.x+(i?Math.cos(angle)*ring*32:0),y=o.y+(i?Math.sin(angle)*ring*32:0);const overlap=boxes.reduce((n,b)=>n+Math.max(0,Math.min(x+o.width,b.x+b.width)-Math.max(x,b.x))*Math.max(0,Math.min(y+o.height,b.y+b.height)-Math.max(y,b.y)),0);if(overlap<score){score=overlap;best={...o,x,y,offset:{x:o.offset.x+x-o.x,y:o.offset.y+y-o.y}}}if(!score)break}boxes.push(best);return best})
}
