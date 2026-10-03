import type { MapObject } from '../domain/models'
import { useProjectStore } from '../store/projectStore'
import { worldDimension } from '../domain/mapScale'
import { editObject } from '../store/objectEdits'
import { normalizeRotation, proportionalSize, flipTransform } from '../domain/transforms'
import { NumericProperty } from './ObjectProperties'
import { inspectorEdit } from './inspectorEdit'
import styles from './Inspector.module.css'
export function InspectorTransform({object}:{object:MapObject}){
  const map=useProjectStore(s=>s.map),physical=worldDimension(1,map),ratio=physical?.value||1,unit=physical?.unit
  const label=(name:string)=>unit?`${name} (${unit})`:name
  const wall=object.kind==='path'&&object.pathKind==='wall'
  const geometry=['path','area','scatter'].includes(object.kind)
  const update=(field:'x'|'y'|'width'|'height'|'rotation',n:number)=>{
    const current=useProjectStore.getState().objects.find(o=>o.id===object.id);if(!current)return
    if(geometry){useProjectStore.getState().transformSelected(field==='width'||field==='height'?{scale:n/ratio/current[field]}:field==='rotation'?{rotation:n}:{[field==='x'?'dx':'dy']:n/ratio-current[field]});return}
    if(field==='width'||field==='height'){const size=proportionalSize(current.width,current.height,n/ratio/current[field]);editObject(current.id,{...current,...size,x:current.x+(current.width-size.width)/2,y:current.y+(current.height-size.height)/2})}
    else editObject(current.id,{...current,[field]:field==='rotation'?normalizeRotation(n):n/ratio})
  }
  const flip=(horizontal:boolean)=>inspectorEdit(()=>geometry?useProjectStore.getState().transformSelected(horizontal?{flipX:true}:{flipY:true}):editObject(object.id,flipTransform(object,horizontal?'horizontal':'vertical')))
  return <><div className={styles.pair}>{!wall&&<><NumericProperty label={label('Width')} value={object.width*ratio} onCommit={n=>update('width',n)}/><NumericProperty label={label('Height')} value={object.height*ratio} onCommit={n=>update('height',n)}/></>}<NumericProperty label={label('X')} value={object.x*ratio} onCommit={n=>update('x',n)}/><NumericProperty label={label('Y')} value={object.y*ratio} onCommit={n=>update('y',n)}/><NumericProperty label={geometry?'Rotate by (degrees)':'Rotation (degrees)'} value={geometry?0:normalizeRotation(object.rotation)} onCommit={n=>update('rotation',n)}/>{geometry&&<NumericProperty label="Selection scale (%)" value={100} onCommit={n=>useProjectStore.getState().transformSelected({scale:n/100})}/>}</div><div className={styles.actions}><button title="Flip horizontally" aria-label="Flip horizontal" aria-pressed={object.scaleX<0} onClick={()=>flip(true)}>↔ Flip H</button><button title="Flip vertically" aria-label="Flip vertical" aria-pressed={object.scaleY<0} onClick={()=>flip(false)}>↕ Flip V</button></div></>
}
