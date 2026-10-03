import { useState } from 'react'
import type { AreaObject,PathObject } from '../domain/models'
import { allRings } from '../domain/areas'
import { createRoute,routePreset } from '../domain/routes'
import { useProjectStore } from '../store/projectStore'
import { Modal } from './Modal'
import { RoutePreview } from './RoutePreview'
export function BorderFromArea({object}:{object:AreaObject}){
  const [ring,setRing]=useState(0),[preview,setPreview]=useState<PathObject|null>(null),[error,setError]=useState(''),rings=allRings(object.geometry)
  return <details><summary>Follow Area edge with Border</summary><label>Contour<select aria-label="Border contour" value={ring} onChange={e=>setRing(Number(e.target.value))}>{rings.map((r,i)=><option key={i} value={i}>Contour {i+1} · {r.length} nodes</option>)}</select></label><button onClick={()=>{try{const nodes=rings[ring];if(nodes.length>256)throw Error('Contour exceeds 256 path nodes. Simplify the Area explicitly first.');setPreview({...createRoute(nodes.map(p=>({...p,id:crypto.randomUUID(),mode:'corner'})),true,routePreset('border')),name:`${object.name.slice(0,105)} border`});setError('')}catch(e){setError((e as Error).message)}}}>Preview border</button>{error&&<p role="alert">{error}</p>}{preview&&<Modal title="Border edge preview" onClose={()=>setPreview(null)}><RoutePreview path={preview}/><p>Copies this contour into an independent closed Border on the active layer. The Area and its political meaning stay unchanged. Future Area edits will not move the border.</p><button onClick={()=>{if(useProjectStore.getState().objects.find(o=>o.id===object.id)!==object){setError('Area changed. Preview again.');setPreview(null);return}if(useProjectStore.getState().addPath(preview))setPreview(null);else setError('Choose an unlocked active layer or reduce the document size.')}}>Create border</button><button onClick={()=>setPreview(null)}>Cancel</button></Modal>}</details>
}
