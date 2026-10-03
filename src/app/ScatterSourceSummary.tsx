import {useEffect,useState} from 'react'
import {assetMetadataName} from '../projects/assets'
import {useImage} from '../images/useImage'
import type {ScatterSource} from '../domain/scatter'
export function ScatterSourceSummary({source,onReplace}:{source:ScatterSource;onReplace:()=>void}){
  const [name,setName]=useState('Stamp'),{image,error}=useImage(source.assetId,'thumbnail')
  useEffect(()=>{let active=true;assetMetadataName(source.assetId).then(n=>{if(active)setName(n||'Missing stamp')}).catch(()=>{if(active)setName('Missing stamp')});return()=>{active=false}},[source.assetId])
  return <div>{image&&<img src={image.src} alt="" width={28} height={28} style={{objectFit:'contain',verticalAlign:'middle'}}/>} {name} · {source.width.toFixed(1)} × {source.height.toFixed(1)} px{error&&<span role="alert"> — Image missing; replace it before export.</span>} <button onClick={onReplace}>Replace asset</button></div>
}
