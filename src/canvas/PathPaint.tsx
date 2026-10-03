import { useGeneratedWallImages } from './useGeneratedWallImages'
import { outsideWall } from '../domain/wallAlignment'
import { clipOutsideWall } from './drawWall'
import { paintRoute } from './drawRoute'
import { paintWallMaterial } from './drawWallMaterial'
import { useLayoutEffect, useRef } from 'react'
import type { Shape as KonvaShape } from 'konva/lib/Shape'
import { cacheMaterial, clearMaterialCache, materialVisible } from './materialCache'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import type { OpeningObject, PathObject } from '../domain/models'
import { clipWallOpenings } from './drawOpening'
import { useEditorStore } from '../store/editorStore'
import { paintPath, pathTrace } from './drawPath'
const NO_OPENINGS:OpeningObject[]=[]
export function PathPaint({
  object,
  image, connections, openings = NO_OPENINGS, viewportSize,
}: {
  object: PathObject
  viewportSize?: {width:number;height:number}
  openings?: OpeningObject[]
  connections?: {x:number;y:number}[]
  image?: HTMLImageElement
}) {
  useGeneratedWallImages(object.wall?.generated)
  const viewport = useEditorStore((s) => s.viewport),zoom=viewport.zoom,ref=useRef<KonvaShape>(null)
  const preview=useEditorStore(s=>s.activeTool==='editPath'&&s.selectedObjectIds.includes(object.id))
  const selected=useEditorStore(s=>s.selectedObjectIds.includes(object.id))
  const visible=!object.wall?.material||selected||!viewportSize||materialVisible(object,viewport,viewportSize)
  const bucket=Math.min(2,Math.max(.0625,2**Math.ceil(Math.log2(zoom))))
  useLayoutEffect(()=>{
    const node=ref.current;if(!node)return
    if(object.wall?.material&&image&&visible)cacheMaterial(node,object.width,object.height,bucket)
    return ()=>clearMaterialCache(node)
  },[object,image,visible,bucket,connections,openings,preview])
  return (
    <Shape
      ref={ref}
      visible={visible}
      width={object.width}
      height={object.height}
      stroke="#000"
      strokeWidth={Math.max(object.strokeWidth + (object.wall?.outline.enabled ? 2*object.wall.outline.width : 0), 10 / zoom)}
      lineCap={object.cap}
      lineJoin={object.join}
      perfectDrawEnabled={false}
      sceneFunc={(c) => paintPath(c._context, object, image, connections,openings,preview)}
      hitFunc={(c, s) => {
        c._context.save()
        clipWallOpenings(c._context,object,openings,10/zoom)
        c._context.miterLimit=2
        if(outsideWall(object)){clipOutsideWall(c._context,object,false);pathTrace(c._context,object,object.x,object.y);c._context.strokeStyle=s.colorKey;c._context.lineWidth=object.strokeWidth*2;c._context.lineJoin=object.join;c._context.stroke()} else if(object.route){paintRoute(c._context,object,undefined,s.colorKey);pathTrace(c._context,object,object.x,object.y);c._context.lineWidth=10/zoom;c._context.strokeStyle=s.colorKey;c._context.stroke()}
        else if(object.wall?.material && image)paintWallMaterial(c._context,object,image,connections,s.colorKey)
        else {pathTrace(c._context, object, object.x, object.y);c.strokeShape(s)}
        c._context.restore()
      }}
    />
  )
}



