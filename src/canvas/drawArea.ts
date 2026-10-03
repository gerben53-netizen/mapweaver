import { distanceField, transitionAlpha } from '../domain/geographyFinish'
import type { GeographyFinish } from '../domain/geographyFinish'
import { COAST_STYLES, TERRAIN_STYLES } from '../domain/terrainStyles'
import { terrainTexture } from './terrainTexture'
import { coastlineGeometry } from '../domain/landAreas'
import type { AreaObject } from '../domain/models'
export function areaPath(context: CanvasRenderingContext2D, o: AreaObject) {
  context.beginPath()
  for (const polygon of o.geometry.polygons)
    for (const ring of [polygon.outer, ...polygon.holes]) {
      context.moveTo(ring[0].x - o.x, ring[0].y - o.y)
      for (const p of ring.slice(1)) context.lineTo(p.x - o.x, p.y - o.y)
      context.closePath()
    }
}
function paintAreaBase(
  context: CanvasRenderingContext2D,
  o: AreaObject,
  image?: CanvasImageSource & { width: number; height: number },
) {
  context.save()
  areaPath(context, o)
  if (o.fill.kind !== 'none') {
    context.save()
    context.clip()
    context.globalAlpha *= o.opacity
    if (o.fill.kind === 'solid') {
      context.fillStyle = o.fill.color
      context.fillRect(0, 0, o.width, o.height)
    } else if (image) {
      const f = o.fill,
        frame = o.patternFrame,
        repeat = f.mode === 'repeat'
      const pattern = context.createPattern(
        image,
        repeat ? 'repeat' : 'no-repeat',
      )
      if (pattern) {
        const transform = new DOMMatrix().translate(-o.x, -o.y).multiply(new DOMMatrix(o.patternTransform))
          .translate(
            frame.x + (repeat ? f.offsetX : frame.width / 2),
            frame.y + (repeat ? f.offsetY : frame.height / 2),
          )
          .rotate(f.rotation)
          .scale(
            repeat ? f.scale : frame.width / image.width,
            repeat ? f.scale : frame.height / image.height,
          )
          .translate(
            repeat ? 0 : -image.width / 2,
            repeat ? 0 : -image.height / 2,
          )
        pattern.setTransform(transform)
        context.fillStyle = pattern
        context.fillRect(0, 0, o.width, o.height)
      }
    } else {
      context.fillStyle = '#b85f80'
      context.fillRect(0, 0, o.width, o.height)
      context.fillStyle = '#ffffff'
      context.font = '14px sans-serif'
      context.fillText('Pattern unavailable', 8, 22)
    }
    context.restore()
  }
  if (o.strokeWidth > 0) {
    areaPath(context, {...o,geometry:coastlineGeometry(o)})
    context.globalAlpha *= o.strokeOpacity
    context.strokeStyle = o.strokeColor
    context.lineWidth = o.strokeWidth
    context.lineJoin = 'round'
    context.lineCap = o.strokeStyle === 'dotted' ? 'round' : 'butt'
    context.setLineDash(
      o.strokeStyle === 'dashed'
        ? [o.strokeWidth * 4, o.strokeWidth * 2]
        : o.strokeStyle === 'dotted'
          ? [0.01, o.strokeWidth * 2]
          : [],
    )
    context.stroke()
  }
  context.restore()
}

// Bounded LRU: at most 16M scratch pixels (64 MiB), including export reuse.
const surfaces = new Map<AreaObject, { canvas: HTMLCanvasElement; image: CanvasImageSource | undefined; finish: string }>()
let surfacePixels = 0
export function terrainCacheStats() { return { entries: surfaces.size, pixels: surfacePixels } }
export function paintArea(c: CanvasRenderingContext2D, o: AreaObject, image?: CanvasImageSource & {width:number;height:number}, finish?: GeographyFinish) {
  const a = o.land?.appearance
  if (!a) { paintAreaBase(c,o,image); return }
  const coast = COAST_STYLES[a.coast]
  c.save()
  if (o.land?.role === 'landmass' && a.coast !== 'none' && (!finish || finish.coast==='off')) {
    c.save(); c.globalAlpha *= o.opacity
    areaPath(c,{...o,geometry:coastlineGeometry(o)})
    c.lineJoin = 'round'; c.lineCap = 'round'
    // Broad translucent bands underneath the land; no duplicate coastline objects.
    for (let i = 6; i > 0; i--) {
      c.lineWidth = (2 + coast.width*i/6)*a.coastScale
      c.strokeStyle = coast.halo; c.globalAlpha = o.opacity*coast.opacity*.13; c.stroke()
    }
    c.lineWidth = 3*a.coastScale; c.strokeStyle = coast.shore; c.globalAlpha = o.opacity*coast.opacity; c.stroke()
    c.restore()
  }
  const finishKey=JSON.stringify(finish)??'', cached = surfaces.get(o)
  let canvas = cached && cached.image === image && cached.finish === finishKey ? cached.canvas : undefined
  if (canvas) { surfaces.delete(o); surfaces.set(o,cached!) }
  else {
    if (cached) { surfacePixels -= cached.canvas.width*cached.canvas.height; surfaces.delete(o) }
    canvas = document.createElement('canvas')
    const resolution = Math.min(2,2048/Math.max(o.width,o.height),Math.sqrt(2_000_000/(o.width*o.height)))
    canvas.width = Math.max(1,Math.ceil(o.width*resolution)); canvas.height = Math.max(1,Math.ceil(o.height*resolution))
    const ctx = canvas.getContext('2d')!
    ctx.scale(canvas.width/o.width,canvas.height/o.height)
    const style = TERRAIN_STYLES[a.style]
    paintAreaBase(ctx,{...o,opacity:1,strokeWidth:0,fill:{kind:'solid',color:a.color??style.color}})
    ctx.save(); areaPath(ctx,o); ctx.clip()
    const pattern = ctx.createPattern(terrainTexture(style.texture),'repeat')!
    pattern.setTransform(new DOMMatrix().translate(-o.x,-o.y).multiply(new DOMMatrix(o.patternTransform)).translate(o.patternFrame.x,o.patternFrame.y).scale(a.patternScale))
    ctx.fillStyle = pattern; ctx.globalAlpha = a.textureOpacity; ctx.fillRect(0,0,o.width,o.height); ctx.restore()
    // Imported Fill Patterns keep their established frame, offsets, fractional scale and rotation.
    if (o.fill.kind === 'pattern') paintAreaBase(ctx,{...o,opacity:1,strokeWidth:0},image)
    if (finish && finish.transitions !== 'off' && o.land?.role === 'terrain-region' && !['ocean','shallow'].includes(a.style) && o.fill.kind !== 'pattern' && a.blend > 0) {
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height), outside=Uint8Array.from({length:canvas.width*canvas.height},(_,i)=>pixels.data[i*4+3]<128?1:0)
      // Image bounds are also edges; the semantic contour itself is never modified.
      for(let x=0;x<canvas.width;x++){outside[x]=1;outside[(canvas.height-1)*canvas.width+x]=1}
      for(let y=0;y<canvas.height;y++){outside[y*canvas.width]=1;outside[y*canvas.width+canvas.width-1]=1}
      const d=distanceField(outside,canvas.width,canvas.height).distance, scale=canvas.width/o.width, band=Math.max(a.feather,finish.transitions==='wash'?5:12)
      for(let i=0;i<d.length;i++)if(pixels.data[i*4+3]&&d[i]<band*scale*2.5){const alpha=transitionAlpha(d[i]/scale,band,o.x+i%canvas.width/scale,o.y+Math.floor(i/canvas.width)/scale,a.style);pixels.data[i*4+3]*=1-a.blend*(1-alpha)}
      ctx.putImageData(pixels,0,0)
    } else if (a.feather > 0 && a.blend > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'
      areaPath(ctx,o)
      const steps = 24
      for (let i = 0; i < steps; i++) {
        ctx.lineWidth = 2*a.feather*(1-i/steps)
        ctx.globalAlpha = (a.blend/steps)/(1-a.blend*i/steps)
        ctx.stroke()
      }
      ctx.restore()
    }
    const pixels = canvas.width*canvas.height
    while (surfacePixels + pixels > 16_000_000 && surfaces.size) {
      const key = surfaces.keys().next().value!, old = surfaces.get(key)!
      surfacePixels -= old.canvas.width*old.canvas.height; surfaces.delete(key)
    }
    surfaces.set(o,{canvas,image,finish:finishKey}); surfacePixels += pixels
  }
  c.globalAlpha *= o.opacity; c.drawImage(canvas,0,0,o.width,o.height)
  c.restore()
  if (o.land?.role === 'landmass') {
    if (a.coast !== 'none') paintAreaBase(c,{...o,fill:{kind:'none'},strokeColor:coast.line,strokeWidth:a.coastScale,strokeOpacity:o.opacity*coast.opacity,strokeStyle:'solid'})
  } else paintAreaBase(c,{...o,fill:{kind:'none'}})
}
