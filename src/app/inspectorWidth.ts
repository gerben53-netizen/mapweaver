import { useState } from 'react'
export const INSPECTOR_WIDTH = {min:280,max:520,default:320}
export const clampInspectorWidth=(n:number)=>Number.isFinite(n)?Math.max(280,Math.min(520,n)):320
const key='mapweaver.inspector-width'
export function useInspectorWidth(){
  const [width,setWidth]=useState(()=>{try{const raw=localStorage.getItem(key);return raw===null?320:clampInspectorWidth(Number(raw))}catch{return 320}})
  return [width,(n:number)=>{const value=clampInspectorWidth(n);setWidth(value);try{localStorage.setItem(key,String(value))}catch{/* Local preferences are optional. */}}] as const
}
