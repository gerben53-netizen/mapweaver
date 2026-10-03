import { illustrateMarker } from './illustratedMarkers'
import { worldTheme, themeText } from './worldThemes'
import { createPlace, createLabel, restyleLabel, labelOffset, labelTextStyle } from './annotations'
import type { PlaceObject, LabelObject, Annotation } from './annotations'
import type { MapDocument } from './models'
import type { Point } from '../canvas/viewport'
import { markerWidth, PROMINENCE } from './markerRegistry'
import type { MarkerChoice } from './markerRegistry'
export function createMarkerBundle(point:Point,choice:MarkerChoice,map:MapDocument):Annotation[]{
 const width=markerWidth(map.mapType,choice.marker.prominence)
 let place:PlaceObject={...createPlace(point,choice.name.trim(),choice.type,map),width,height:width,x:point.x-width/2,y:point.y-width/2,marker:{...choice.marker,labelEnabled:choice.label},importance:PROMINENCE[choice.marker.prominence].importance}
 if(choice.illustration)place=illustrateMarker(place,choice.illustration,map)
 return choice.label?[place,markerLabel(place,choice.position,map)]:[place]
}
export function markerLabel(place:PlaceObject,position:MarkerChoice['position'],map:MapDocument):LabelObject{
 const created=createLabel({x:place.x,y:place.y},place.name,place,position,map.mapType,map.theme?.id)
 const theme=worldTheme(map.theme?.id)
 const style={...labelTextStyle(map.mapType,map.theme?.id),...(theme?.mapTypes.includes(map.mapType??'battlemap')?themeText(theme,'marker'):{})},factor=place.marker?PROMINENCE[place.marker.prominence].scale:1
 const label=restyleLabel(created,{...style,size:Math.max(6,Math.min(200,style.size*factor))})
 return positionMarkerLabel({...label,markerName:true},place,position)
}
export function positionMarkerLabel(label:LabelObject,place:PlaceObject,position:LabelObject['preset']):LabelObject{
 const offset=labelOffset(place,label,position)
 return {...label,preset:position,offset,x:place.x+place.width/2+offset.x-label.width*label.anchor.x,y:place.y+place.height/2+offset.y-label.height*label.anchor.y}
}
