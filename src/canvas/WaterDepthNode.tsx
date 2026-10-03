import { Shape } from 'react-konva/lib/ReactKonvaCore'
import type { MapDocument, MapObject } from '../domain/models'
import { useWaterDepthStore } from '../store/waterDepthStore'
import { paintWaterDepth, paintWaterMouth } from './drawWaterDepth'
export function WaterDepthNode({map,objects}:{map:MapDocument;objects:MapObject[]}){
 const preview=useWaterDepthStore(s=>s.preview)
 const current=preview&&map.waterDepth?{...map,waterDepth:{...map.waterDepth,paint:preview}}:map
 return <Shape listening={false} perfectDrawEnabled={false} sceneFunc={c=>paintWaterDepth(c._context,current,objects)}/>
}

export function WaterMouthNode({map,objects,id}:{map:MapDocument;objects:MapObject[];id:string}){
 const preview=useWaterDepthStore(s=>s.preview)
 const current=preview&&map.waterDepth?{...map,waterDepth:{...map.waterDepth,paint:preview}}:map
 return <Shape listening={false} perfectDrawEnabled={false} sceneFunc={c=>paintWaterMouth(c._context,current,objects,id)}/>
}
