import { useEffect, useRef, useState } from 'react'
import { useImage } from '../images/useImage'
import { Icon } from './Icon'
/** Library previews only; never fall back to decoding the full project original. */
export function SceneThumbnail({id}:{id:string}) {
  const ref=useRef<HTMLSpanElement>(null),[visible,setVisible]=useState(false)
  useEffect(()=>{const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'80px'});observer.observe(ref.current!);return()=>observer.disconnect()},[])
  return <span ref={ref} className="scene-thumbnail">{visible?<Thumbnail id={id}/>:<Icon name="stamp"/>}</span>
}
function Thumbnail({id}:{id:string}) {
  const {image,error}=useImage(id,'libraryThumbnail')
  return image?<img src={image.src} alt="" draggable={false}/>:<span title={error?'Missing stamp thumbnail':'Loading thumbnail'} aria-label={error?'Missing stamp asset':undefined}><Icon name={error?'hidden':'stamp'}/></span>
}
