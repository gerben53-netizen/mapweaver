import { useEffect, useState } from 'react'
import { api } from '../storage/api'
import { toAsset } from '../storage/remoteLibrary'
import type { PublicLibraryAsset } from '../../service/library'
import type { LibrarySnapshot } from '../storage/libraryRepository'
export function useLibrary(kind='stamp',search='',category='',page=0,mapType='') {
  const [snapshot,setSnapshot]=useState<LibrarySnapshot>({assets:[],categories:[]}),[error,setError]=useState(''),[loading,setLoading]=useState(true),[total,setTotal]=useState(0),[attempt,retry]=useState(0)
  useEffect(()=>{let active=true;const timer=setTimeout(()=>{setLoading(true);const q=new URLSearchParams({type:kind==='fillPattern'?'fill-pattern':'stamp',search,category,mapType,offset:String(page*60),limit:'60'});void api<{assets:PublicLibraryAsset[];categories:LibrarySnapshot['categories'];total:number}>(`/library?${q}`).then(r=>{if(active){setSnapshot({assets:r.assets.map(toAsset),categories:r.categories});setTotal(r.total);setError('')}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})},180);return()=>{active=false;clearTimeout(timer)}},[kind,search,category,page,mapType,attempt])
  return {...snapshot,error,loading,total,retry:()=>retry(n=>n+1)}
}
