import { generatedDefinition, generatedWallStyle } from '../../src/domain/generatedWalls'
import { generatedPlacements, generatedVisualBounds, GENERATED_LIMITS } from '../../src/domain/generatedWallGeometry'
import { createWall, SIMPLE_WALL } from '../../src/domain/walls'
import { createOpening } from '../../src/domain/openings'
import type { MapDocument, PathNode } from '../../src/domain/models'
import { GENERATED_CONTACT_SHADOW } from '../../src/canvas/generatedContactShadow'
export const materialIds = ['pale-palace-stone','marble','natural-cave-rock','refined-timber','rustic-heavy-timber']
export function buildPlacements() {
  const map={width:640,height:400,mapType:'battlemap',grid:{cellSize:50,physicalScale:{unit:'ft',distancePerCell:5}}} as MapDocument
  return materialIds.map(id=>({id,revision:'production-1',walls:[10,20].flatMap(width=>{
    const dy=width===10?0:190
    const shapes=[[[35,35+dy],[600,35+dy]],[[35,85+dy],[115,85+dy]],[[170,90+dy],[245,90+dy],[245,160+dy]],[[300,140+dy],[440,140+dy]],[[500,150+dy],[595,150+dy]]]
    return shapes.map((coordinates,index)=>{
      const nodes:PathNode[]=coordinates.map(([x,y],n)=>({x,y,id:`node-${index}-${n}`,mode:'corner'}))
      if(index===3){nodes[0].out={x:35,y:-70};nodes[1].in={x:-35,y:-70}}
      if(index===4){nodes[0].out={x:0,y:-80};nodes[1].in={x:0,y:-80}}
      const wall=createWall(nodes,false,{...generatedWallStyle(SIMPLE_WALL,map,id,'production-1'),strokeWidth:width})
      wall.id=`proof-${id}-${width}-${index}`
      const openings=index===0?[{...createOpening(wall,.45,'door',30),id:wall.id+'-opening'}]:[]
      const placements=generatedPlacements(wall,openings),visual=generatedVisualBounds(placements),padding=GENERATED_CONTACT_SHADOW.padding
      const bounds={x:visual.x-padding,y:visual.y-padding,width:visual.width+padding*2,height:visual.height+padding*2}
      const ratio=Math.min(2,4096/Math.max(bounds.width,bounds.height),Math.sqrt(GENERATED_LIMITS.pixels/(bounds.width*bounds.height)))
      return {shape:['long-opening-endpoints','short-endpoints','corner-90','broad-curve','tight-curve'][index],widthFt:width/10,wall,openings,bounds,ratio,placements:placements.map((p,order)=>({...p,order,componentId:p.component.id,component:undefined}))}
    })
  }),definition:generatedDefinition({id,revision:'production-1'})}))
}
