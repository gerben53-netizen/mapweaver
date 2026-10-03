import { terrainAppearance } from '../domain/terrainStyles'
import { createArea } from '../domain/areas'
import { defaultLandArea } from '../domain/landAreas'
import { createRoute, routePreset } from '../domain/routes'
import { createLabel, restyleLabel } from '../domain/annotations'
import { createMapElement } from '../domain/decorations'
import { createMarkerBundle } from '../domain/markers'
import { markerDefaults } from '../domain/markerRegistry'
import { applyWorldTheme } from '../domain/applyWorldTheme'
import { themeText, worldTheme } from '../domain/worldThemes'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
import { flatLayerTree } from '../domain/grouping'
import type { MapDocument, MapObject, StampObject } from '../domain/models'
import type { ProjectSnapshot } from '../store/history'

export const THEME_PREVIEW_VERSION = 1
export type PreviewImages = Partial<Record<'mountain'|'forest'|'city', {id:string;width:number;height:number}>>
/** One authored geography. Theme application only changes real document presentation. */
export function themePreviewScene(themeId:string, images:PreviewImages={}):ProjectSnapshot {
 const theme=worldTheme(themeId);if(!theme)throw Error('Unknown preview theme.')
 const map:MapDocument={width:800,height:500,...defaultMapStyle(),grid:{...defaultMapStyle().grid,visible:false},background:null,mapType:'world-map',geography:defaultGeography('world-map')}
 const area=(id:string,points:number[][],terrain?:'forest'|'mountains'|'grassland')=>{
  // Cut the authored corners twice: a small native polygon, not a preview-only drawing.
  let ring=points.map(([x,y])=>({x,y}))
  for(let pass=0;pass<2;pass++)ring=ring.flatMap((p,i)=>{const q=ring[(i+1)%ring.length];return [{x:p.x*.75+q.x*.25,y:p.y*.75+q.y*.25},{x:p.x*.25+q.x*.75,y:p.y*.25+q.y*.75}]})
  const a=createArea({polygons:[{outer:ring,holes:[]}]});a.id=id;a.name=id;a.strokeOpacity=0
  a.land={...defaultLandArea(terrain?'terrain-region':'landmass'),...(terrain?{terrain:terrain==='grassland'?'custom':terrain,appearance:terrainAppearance(terrain==='mountains'?'rocky':terrain,map.width)}:{})};return a
 }
 const objects:MapObject[]=[
  area('preview-land',[[30,85],[92,60],[132,73],[178,51],[212,74],[250,61],[298,88],[324,76],[358,110],[414,100],[449,121],[492,111],[526,151],[501,183],[518,210],[480,228],[501,267],[471,292],[514,331],[552,339],[573,375],[541,403],[505,393],[474,417],[414,400],[389,428],[344,410],[316,444],[278,420],[251,431],[218,393],[164,410],[137,374],[100,387],[70,352],[89,317],[57,288],[68,251],[34,223],[52,184],[29,146],[45,122]]),
  area('preview-island',[[622,316],[650,298],[665,313],[701,318],[717,346],[695,376],[660,363],[639,378],[617,349]]),
  area('preview-woods',[[98,176],[151,157],[203,179],[246,212],[260,251],[235,287],[201,302],[147,280],[112,242]],'forest'),
  area('preview-highlands',[[163,110],[223,94],[287,118],[345,166],[345,206],[291,209],[237,170],[186,155]],'mountains'),
  area('preview-meadows',[[271,252],[331,223],[405,248],[466,302],[431,354],[355,386],[301,350]],'grassland'),
 ]
 const riverStyle=routePreset('river');if(riverStyle.route.kind==='river'){riverStyle.route.startWidth=2;riverStyle.route.endWidth=7;riverStyle.route.bank.width=.5}
 const river=createRoute([[305,175],[327,219],[303,261],[333,298],[378,319],[402,365],[426,406]].map(([x,y],i)=>({id:'river-node-'+i,x,y,mode:'smooth',in:{x:-10,y:-15},out:{x:10,y:15}})),false,riverStyle);river.id='preview-river';objects.push(river)
 const stamp=(id:string,key:'mountain'|'forest',x:number,y:number,width:number):StampObject|null=>{
  const image=images[key];return image?{kind:'stamp',id,assetId:image.id,x,y,width,height:width*image.height/image.width,rotation:0,scaleX:1,scaleY:1,opacity:theme.sparse?.18:1}:null
 }
 for(const [i,[x,y,w]] of [[161,80,122],[227,101,119],[288,134,102]].entries()){const s=stamp('preview-mountain-'+i,'mountain',x,y,w);if(s)objects.push(s)}
 for(const [i,[x,y,w]] of [[114,161,94],[169,181,88],[112,213,85],[193,223,75],[150,251,82]].entries()){const s=stamp('preview-forest-'+i,'forest',x,y,w);if(s)objects.push(s)}
 const choice=markerDefaults('world-map'),bundle=createMarkerBundle({x:400,y:272},{...choice,name:'Aster',type:'city',label:false},map)
 const city=bundle[0];city.id='preview-city'
 if(city.kind==='place'&&images.city&&!theme.sparse){city.assetId=images.city.id;city.visualMode='illustrated';city.width=58;city.height=58*images.city.height/images.city.width;city.x=400-city.width/2;city.y=272-city.height/2}
 objects.push(city)
 const label=(id:string,text:string,x:number,y:number,size:number)=>{const l=createLabel({x,y},text,undefined,'center','world-map');l.id=id;return restyleLabel(l,{...l.style,size,maxWidth:330,letterSpacing:1,strokeWidth:0})}
 objects.push(label('preview-region','THE GREEN REACH',293,365,23),label('preview-sea','The Sapphire Sea',623,229,24),label('preview-city-label','Aster',408,311,20))
 const compass=createMapElement('compass',{x:678,y:106},map);compass.id='preview-compass';compass.width=90;compass.height=90;compass.x=633;compass.y=61;objects.push(compass)
 const layers=[{id:'preview',name:'Preview',visible:true,locked:false,objectIds:objects.map(o=>o.id)}]
 const styled=applyWorldTheme({map,objects,layers,layerTree:flatLayerTree(layers),objectGroups:[]},themeId,{reset:true,elements:true,assets:false}).snapshot
 styled.objects=styled.objects.map(o=>o.kind==='label'&&o.id==='preview-sea'?restyleLabel(o,{...o.style,...themeText(theme,'water')}):o)
 return styled
}
