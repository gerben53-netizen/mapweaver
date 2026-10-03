import { Shape } from 'react-konva/lib/ReactKonvaCore'
import { paintOpening } from './drawOpening'
import type { OpeningPlacementPreview } from './useOpeningPlacement'
export function OpeningPreview({preview}:{preview:OpeningPlacementPreview|null}) {
  if(!preview)return null
  const {opening:o,wall,error}=preview
  return <Shape x={o.x} y={o.y} listening={false} sceneFunc={c=>{const ctx=c._context;ctx.save();ctx.globalAlpha=.8;if(!error)paintOpening(ctx,o,wall);ctx.strokeStyle=error?'#ef6170':'#8cd6aa';ctx.lineWidth=2;ctx.strokeRect(o.width/2-o.openingWidth/2,o.height/2-wall.strokeWidth/2,o.openingWidth,wall.strokeWidth);ctx.restore()}}/>
}
