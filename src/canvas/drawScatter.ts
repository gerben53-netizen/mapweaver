import type { ScatterObject } from '../domain/scatter'
export function paintScatter(ctx:CanvasRenderingContext2D,o:ScatterObject,images:Map<string,CanvasImageSource>){
  ctx.save();ctx.translate(-o.x,-o.y);ctx.transform(...o.matrix)
  for(const i of o.instances){ctx.save();ctx.translate(i.x,i.y);ctx.rotate(i.rotation*Math.PI/180);ctx.scale(i.scaleX,i.scaleY);ctx.globalAlpha*=o.opacity*i.opacity
    const image=images.get(i.assetId)
    if(image)ctx.drawImage(image,-i.width/2,-i.height/2,i.width,i.height)
    else {ctx.fillStyle='#d95691';ctx.fillRect(-i.width/2,-i.height/2,i.width,i.height);ctx.strokeStyle='#401e33';ctx.beginPath();ctx.moveTo(-i.width/2,-i.height/2);ctx.lineTo(i.width/2,i.height/2);ctx.moveTo(i.width/2,-i.height/2);ctx.lineTo(-i.width/2,i.height/2);ctx.stroke()}
    ctx.restore()
  }ctx.restore()
}
