import { useEffect,useRef } from 'react'
import type { PathObject } from '../domain/models'
import { paintPath } from '../canvas/drawPath'
import { useImage } from '../images/useImage'
export function RoutePreview({path}:{path:PathObject}){
  const ref=useRef<HTMLCanvasElement>(null),{image}=useImage(path.stroke.kind==='texture'?path.stroke.assetId:'','asset','fillPattern')
  useEffect(()=>{const c=ref.current!.getContext('2d')!;c.clearRect(0,0,480,220);c.save();const scale=Math.min(460/path.width,200/path.height);c.translate((480-path.width*scale)/2,(220-path.height*scale)/2);c.scale(scale,scale);paintPath(c,path,image);c.restore()},[path,image])
  return <canvas ref={ref} width={480} height={220} aria-label="Proposed route preview" style={{width:'100%',background:'#293840'}}/>
}
