import { Shape } from 'react-konva/lib/ReactKonvaCore'
import type { MapDocument } from '../domain/models'
import { useEnvironmentalDetailStore } from '../store/environmentalDetailStore'
import { drawEnvironmentalDetail } from './drawEnvironmentalDetail'
export function EnvironmentalDetailNode({map,tier}:{map:MapDocument;tier:'floor'|'edge'}){const preview=useEnvironmentalDetailStore(s=>s.preview);const data=preview||map.environmentalDetail;if(!data)return null;return <Shape listening={false} perfectDrawEnabled={false} sceneFunc={c=>drawEnvironmentalDetail(c._context,data,map.width,map.height,tier)}/>}
