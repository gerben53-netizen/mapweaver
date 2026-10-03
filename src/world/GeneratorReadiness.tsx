import { useState } from 'react'
import { api } from '../storage/api'
export function GeneratorReadiness() {
  const [data,set]=useState<{families:{semanticType:string;count:number}[]}|null>(null),[error,setError]=useState('')
  const load=async()=>{try{set(await api('/library/generator-readiness'));setError('')}catch(e){setError((e as Error).message)}}
  return <details onToggle={e=>{if(e.currentTarget.open&&!data)void load()}}><summary>World generator asset readiness</summary>
    <p>Installed terrain symbols for generator-aware scatter. Choose a matching visual theme when generating a world.</p>
    {data?.families.map(v=><p key={v.semanticType}>{v.semanticType}: {v.count?`${v.count} available`:'Not installed'}</p>)}
    <p><a href="/world-assets-painterly/mapweaver-world-painterly.zip" download>Download Painterly World assets</a></p>
    <p><a href="/world-assets/mapweaver-world-engraved.zip" download>Download Engraved World assets</a></p>
    <p>Import a ZIP through Asset library → Import assets. Painterly World matches the Painterly Fantasy theme. Its 46 assets include rare hero features, primary shapes, support and detail. Choose Overwrite when upgrading installed metadata; existing maps keep their placed artwork.</p>
    <button type="button" onClick={()=>void load()}>Refresh asset readiness</button>{error&&<p role="alert">{error}</p>}
  </details>
}
