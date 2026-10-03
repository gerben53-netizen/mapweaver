import { useEffect } from 'react'
export interface Feedback { message:string; kind:'success'|'warning'|'error' }
export function OperationFeedback({value,onDismiss}:{value:Feedback|null;onDismiss:()=>void}) {
 useEffect(()=>{if(value?.kind!=='success')return;const timer=setTimeout(onDismiss,5000);return()=>clearTimeout(timer)},[value,onDismiss])
 if(!value)return null
 return <p role={value.kind==='success'?'status':'alert'}>{value.message}{value.kind!=='success'&&<button onClick={onDismiss}>Dismiss feedback</button>}</p>
}
