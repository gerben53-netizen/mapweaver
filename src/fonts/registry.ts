import vertical from './vertical.json'
import library from './library.json'
import bundledMetrics from './metrics.json'
import legacyMetrics from '../domain/fontMetrics.json'
export type FontVariant = 'Regular' | 'Bold' | 'Italic' | 'BoldItalic'
export interface FontEntry { id:string; name:string; category:string; fallback:string; variants:Partial<Record<FontVariant,{file:string;weight:number;style:string}>> }
const legacy:FontEntry={id:'liberation-sans',name:'Liberation Sans',category:'System / Legacy',fallback:'sans-serif',variants:Object.fromEntries(['Regular','Bold','Italic','BoldItalic'].map(v=>[v,{file:`/fonts/LiberationSans-${v}.ttf`,weight:v.includes('Bold')?700:400,style:v.includes('Italic')?'italic':'normal'}]))}
export const FONT_LIBRARY:readonly FontEntry[]=[...library,legacy]
export function fontEntry(id:string):FontEntry|undefined {return FONT_LIBRARY.find(f=>f.id===id||f.name===id)}
export function validFont(id:unknown):id is string {return typeof id==='string'&&(!!fontEntry(id)||['serif','sans-serif','monospace'].includes(id)||/^[\p{L}\p{N} ,"']{1,160}$/u.test(id))}
export function variant(style:{font:string;bold:boolean;italic:boolean}):FontVariant {
 const requested:FontVariant=style.bold?style.italic?'BoldItalic':'Bold':style.italic?'Italic':'Regular'
 const entry=fontEntry(style.font)
 if(!entry)return requested
 return entry.variants[requested]?requested:style.italic&&entry.variants.Italic?'Italic':style.bold&&entry.variants.Bold?'Bold':'Regular'
}
export function fontFamily(id:string){const f=fontEntry(id);return f?`"Mapweaver ${f.name}", ${f.fallback}`:`${id}, "Mapweaver Liberation Sans", sans-serif`}
export function fontCSS(s:{font:string;bold:boolean;italic:boolean;size:number}) {const v=variant(s);return `${v.includes('Italic')?'italic':'normal'} ${v.includes('Bold')?700:400} ${s.size}px ${fontFamily(s.font)}`}
export function fontMetrics(s:{font:string;bold:boolean;italic:boolean}):Record<string,number>{const id=fontEntry(s.font)?.id;return (bundledMetrics as Record<string,Record<string,number>>)[`${id}:${variant(s)}`]||legacyMetrics[variant(s)]}
export function defaultFont(mapType:string|undefined,kind:string,preset?:string){
 if(kind==='scaleBar')return 'robotocondensed'
 if(kind==='legend'||kind==='infoPanel')return preset==='parchment'?'imfellenglish':mapType==='battlemap'?'sourcesans3':'spectral'
 if(mapType==='battlemap')return 'sourcesans3'
 if(kind==='title')return preset==='scroll'?'imfellenglish':mapType==='world-map'?'cinzel':'cormorantgaramond'
 return mapType==='world-map'?'cinzel':'ebgaramond'
}

export function textBaseline(s:{font:string;bold:boolean;italic:boolean;size:number;lineHeight:number}){const m=(vertical as Record<string,{ascent:number;descent:number}>)[`${fontEntry(s.font)?.id}:${variant(s)}`];return m?s.size*((s.lineHeight-m.ascent-m.descent)/2+m.ascent):s.size*.85}
