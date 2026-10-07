import { Shape } from 'react-konva/lib/ReactKonvaCore'
import type { MapDocument } from '../domain/models'
import { useEnvironmentalDetailStore } from '../store/environmentalDetailStore'
import { drawEnvironmentalDetail } from './drawEnvironmentalDetail'
import { useEffect,useState } from 'react'
import { loadEnvironmentalImages } from './environmentalImages'
import { useEditorStore } from '../store/editorStore'
export function EnvironmentalDetailNode({map,tier}:{map:MapDocument;tier:'floor'|'edge'}){const preview=useEnvironmentalDetailStore(s=>s.preview);const data=preview||map.environmentalDetail;const [ready,setReady]=useState<typeof data>();useEffect(()=>{let cancelled=false;loadEnvironmentalImages(data).then(()=>{if(!cancelled)setReady(data)}).catch(e=>{if(!cancelled)useEditorStore.setState({message:(e as Error).message})});return()=>{cancelled=true}},[data]);if(!data||ready!==data)return null;return <Shape listening={false} perfectDrawEnabled={false} sceneFunc={c=>drawEnvironmentalDetail(c._context,data,map.width,map.height,tier)}/>}
