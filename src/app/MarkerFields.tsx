import { acquireAssetImage } from '../images/imageCache'
import { useEffect, useRef, useState } from 'react'
import { MARKER_STYLES, PROMINENCE, markerIcons, prioritizedMarkerTypes } from '../domain/markerRegistry'
import type { MarkerConfig, MarkerType, Prominence } from '../domain/markerRegistry'
import type { MapType, } from '../domain/geography'
import type { Annotation } from '../domain/annotations'
import { paintAnnotation } from '../canvas/drawAnnotation'
import { loadAnnotationFonts } from '../canvas/annotationFonts'
import styles from './Markers.module.css'
export function MarkerFields({type,marker,mapType,onChange,compact=false,illustrated=false}:{compact?:boolean;illustrated?:boolean;type:string;marker:MarkerConfig;mapType?:MapType;onChange:(type:string,marker:MarkerConfig)=>void}){
 const [open,setOpen]=useState(false)
 const icons=markerIcons(type)
 return <><label>What are you marking?<select aria-label="Marker type" value={type} onChange={e=>{const type=e.target.value,icons=markerIcons(type);onChange(type,{...marker,iconId:icons.some(i=>i.id===marker.iconId)?marker.iconId:icons[0].id})}}>{prioritizedMarkerTypes(mapType).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
 {!illustrated&&<><label>Style family<select aria-label="Marker style" value={marker.style} onChange={e=>{const p=MARKER_STYLES.find(p=>p.id===e.target.value)!;onChange(type,{...marker,style:p.id as MarkerConfig['style'],ink:p.ink,outline:p.paper})}}>{MARKER_STYLES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 {compact&&<button type="button" onClick={()=>setOpen(!open)}>Change marker icon…</button>}
 {(!compact||open)&&<fieldset><legend>Marker icon</legend><div className={styles.icons}>{icons.map(i=><button key={i.id} type="button" aria-label={i.name} aria-pressed={marker.iconId===i.id} onClick={()=>onChange(type,{...marker,iconId:i.id})}><svg viewBox="0 0 64 64" aria-hidden="true" style={{color:marker.ink,background:marker.outline}}>{i.paths.map((d,n)=><path key={n} d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>)}</svg><span>{i.name}</span></button>)}</div></fieldset>}</>}</>
}
export function ProminenceField({value,onChange}:{value:Prominence;onChange:(value:Prominence)=>void}){return <label>Prominence<select aria-label="Marker prominence" value={value} onChange={e=>onChange(e.target.value as Prominence)}>{Object.entries(PROMINENCE).map(([id,p])=><option key={id} value={id}>{p.name}</option>)}</select></label>}
export function MarkerPreview({objects}:{objects:Annotation[]}){
 const ref=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{let active=true;const leases=objects.flatMap(o=>o.assetId?[{id:o.assetId,lease:acquireAssetImage(o.assetId,'stamp')}]:[]);void Promise.all([loadAnnotationFonts(),...leases.map(l=>l.lease.promise)]).then(async()=>{const canvas=ref.current;if(!active||!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return
  const images=new Map(await Promise.all(leases.map(async l=>[l.id,await l.lease.promise] as const)))
  if(!active)return
  ctx.clearRect(0,0,canvas.width,canvas.height)
  const minX=Math.min(...objects.map(o=>o.x)),minY=Math.min(...objects.map(o=>o.y)),width=Math.max(...objects.map(o=>o.x+o.width))-minX,height=Math.max(...objects.map(o=>o.y+o.height))-minY,scale=Math.min(1.5,280/width,130/height)
  ctx.save();ctx.translate((canvas.width-width*scale)/2,(canvas.height-height*scale)/2);ctx.scale(scale,scale);ctx.translate(-minX,-minY)
  for(const o of objects){ctx.save();ctx.translate(o.x,o.y);paintAnnotation(ctx,o,images);ctx.restore()}ctx.restore()
 }).catch(()=>{});return()=>{active=false;leases.forEach(l=>l.lease.release())}},[objects])
 return <canvas className={styles.preview} ref={ref} width={320} height={150} role="img" aria-label="Marker and label preview"/>
}
export type { MarkerType }
