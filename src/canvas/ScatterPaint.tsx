import { memo,useEffect,useState } from 'react'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import type { ScatterObject } from '../domain/scatter'
import { useAssetContext } from '../projects/assets'
import { acquireAssetImage } from '../images/imageCache'
import { paintScatter } from './drawScatter'
export const ScatterPaint=memo(function ScatterPaint({object,preview=false}:{object:ScatterObject;preview?:boolean}){
  const generation=useAssetContext(s=>s.generation),key=object.sources.map(a=>a.assetId).join(','),[loaded,setLoaded]=useState<{key:string;images:Map<string,CanvasImageSource>}>({key:'',images:new Map()})
  useEffect(()=>{let active=true;const ids=key.split(','),leases=ids.map(id=>acquireAssetImage(id,'stamp'));Promise.all(leases.map(l=>l.promise.catch(()=>null))).then(results=>{if(active)setLoaded({key,images:new Map(results.flatMap((image,i)=>image?[[ids[i],image]]:[]))})});return()=>{active=false;leases.forEach(l=>l.release())}},[key,generation])
  const images=loaded.key===key?loaded.images:new Map<string,CanvasImageSource>()
  return <Shape width={object.width} height={object.height} listening={!preview} perfectDrawEnabled={false} sceneFunc={ctx=>paintScatter(ctx._context,object,images)} hitFunc={(ctx,shape)=>{ctx.beginPath();ctx.rect(0,0,object.width,object.height);ctx.fillStrokeShape(shape)}} fill="#000"/>
})
