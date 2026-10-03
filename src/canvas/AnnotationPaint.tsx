import { useProjectStore } from '../store/projectStore'
import { memo,useEffect,useState } from 'react'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import type { Annotation } from '../domain/annotations'
import { objectAssetIds } from '../domain/areas'
import { useAssetContext } from '../projects/assets'
import { acquireAssetImage } from '../images/imageCache'
import { loadAnnotationFonts } from './annotationFonts'
import { paintAnnotation } from './drawAnnotation'
export const AnnotationPaint=memo(function AnnotationPaint({object}:{object:Annotation}){
  const map=useProjectStore(s=>object.kind==='scaleBar'?s.map:undefined)
  const generation=useAssetContext(s=>s.generation),key=objectAssetIds(object).join(','),[loaded,setLoaded]=useState<{key:string;images:Map<string,CanvasImageSource>;error?:string}>({key:'',images:new Map()})
  useEffect(()=>{let active=true;const ids=key?key.split(','):[],leases=ids.map(id=>acquireAssetImage(id,'stamp'));Promise.all([loadAnnotationFonts(),Promise.all(leases.map(l=>l.promise.catch(()=>null)))]).then(([,images])=>{if(active)setLoaded({key,images:new Map(images.flatMap((image,i)=>image?[[ids[i],image]]:[]))})}).catch(e=>{if(active)setLoaded({key,images:new Map(),error:e.message})});return()=>{active=false;leases.forEach(l=>l.release())}},[key,generation])
  return <Shape width={object.width} height={object.height} perfectDrawEnabled={false} fill="#000" sceneFunc={ctx=>{if(loaded.error){ctx._context.fillStyle='#ad3737';ctx._context.fillRect(0,0,object.width,object.height)}else if(loaded.key===key)paintAnnotation(ctx._context,object,loaded.images,map)}} hitFunc={(ctx,shape)=>{ctx.beginPath();ctx.rect(0,0,object.width,object.height);ctx.fillStrokeShape(shape)}}/>
})
