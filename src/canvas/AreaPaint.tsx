import { materialFill, useMaterialPreview } from '../store/materialApplication'
import { useProjectStore } from '../store/projectStore'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import 'konva/lib/Shape'
import type { AreaObject } from '../domain/models'
import { areaPath, paintArea } from './drawArea'
export function AreaPaint({
  object,
  image,
}: {
  object: AreaObject
  image?: HTMLImageElement
}) {
  const preview = useMaterialPreview(s => s.targets.includes(object) ? s : null)
  const showing = preview?.asset
  const painted = showing ? { ...object, fill: materialFill(object, preview!.asset!.id) } : object
  const finish=useProjectStore(s=>s.map.geographyFinish)
  return (
    <Shape
      width={object.width}
      height={object.height}
      fill="#000"
      perfectDrawEnabled={false}
      sceneFunc={(c) => paintArea(c._context, painted, showing ? preview!.image : image, finish)}
      hitFunc={(c, s) => {
        areaPath(c._context, object)
        c.fillStrokeShape(s)
      }}
    />
  )
}
