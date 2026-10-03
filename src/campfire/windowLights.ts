import { validateMapContract } from './generated/index'
import type { MapWindowV2 } from './generated/index'
import type { WindowObject, PathObject } from '../domain/models'
import { openingPlacement } from '../domain/openings'
export type WindowLightInputs=Pick<MapWindowV2,'transmitsExteriorLight'|'exteriorLightTransmission'>
/** Delegate shape/value validation to the actual contract, with a minimal valid reference context. */
export function validateWindowLight(value:unknown):WindowLightInputs {
 const geometry={start:{x:0,y:0},end:{x:10,y:0}}
 const result=validateMapContract({format:'CAMPFIRE_MAPWEAVER',version:2,mapId:'validation',revision:1,name:'Validation',dimensions:{pixelWidth:10,pixelHeight:10},grid:{type:'NONE',sizePx:50,feetPerCell:5},image:{path:'map.png',mimeType:'image/png'},walls:[{id:'wall',...geometry,blocksVision:true}],doors:[],windows:[{id:'window',wallId:'wall',geometry,...(value as object)}]})
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['transmitsExteriorLight','exteriorLightTransmission'].includes(k))||!result.valid)throw Error('Invalid Window Light inputs.'+(result.valid?'':result.errors.join('; ')))
 return structuredClone(value as WindowLightInputs)
}
/** Two-sided schematic guide: Campfire decides exterior side, environment, color and reach. */
export function windowLightPreview(window:WindowObject,wall:PathObject) {
 const {point,tangent}=openingPlacement(window,wall)
 const transmission=window.exteriorLight?.exteriorLightTransmission??1
 return {point,angle:Math.atan2(tangent.y,tangent.x),width:window.openingWidth,guideDepth:window.openingWidth*1.5,transmission,enabled:window.exteriorLight?.transmitsExteriorLight===true}
}
