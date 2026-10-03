import { themeFixture } from './worldThemes'
import { createArea, rectangleGeometry } from '../../src/domain/areas'
import { defaultLandArea } from '../../src/domain/landAreas'
import { createMarkerBundle } from '../../src/domain/markers'
import { markerDefaults } from '../../src/domain/markerRegistry'
import { createRoute, routePreset } from '../../src/domain/routes'
import { terrainAppearance } from '../../src/domain/terrainStyles'
import { applyWorldTheme } from '../../src/domain/applyWorldTheme'
import type { MapDocument, MapObject } from '../../src/domain/models'
export async function automaticLabelFixture(map:MapDocument){
 map={...map,width:1200,height:800}
 const f=await themeFixture(map),objects:MapObject[]=[...f.objects],ids:string[]=[]
 const add=(o:MapObject)=>{objects.push(o);ids.push(o.id)}
 for(const [i,name] of ['Amber Reach','Mistwood','Red Vale','Sable Coast'].entries()){
  const o=createArea(rectangleGeometry({x:i%2?450:120,y:i<2?180:455,width:265,height:210}),{kind:'none'});o.id='region-'+i;o.name=name;o.land={...defaultLandArea(),labelKind:'region'};add(o)
 }
 const lake=createArea(rectangleGeometry({x:730,y:210,width:220,height:110}),{kind:'solid',color:'#729fb0'});lake.id='mirror';lake.name='Mirror Mere';lake.land={...defaultLandArea(),labelKind:'waterMinor',appearance:terrainAppearance('shallow',1200)};add(lake)
 const sea=createArea(rectangleGeometry({x:560,y:28,width:370,height:90}),{kind:'none'});sea.id='sea';sea.name='Sea of Dawn';sea.land={...defaultLandArea(),labelKind:'waterMajor'};add(sea)
 const peaks=createArea(rectangleGeometry({x:830,y:355,width:230,height:150}),{kind:'none'});peaks.id='range';peaks.name='Ironspine';peaks.land={...defaultLandArea(),labelKind:'mountainRange'};add(peaks)
 for(let i=0;i<3;i++){const y=365+i*125,p=createRoute([{id:'a',x:150,y,mode:'corner'},{id:'b',x:420,y:y+30,mode:'corner'},{id:'c',x:730,y:y+5,mode:'corner'}],false,routePreset('river'));p.id='river-'+i;p.name=['Silverwater','The Arlen','Mournflow'][i];add(p)}
 for(const [i,[name,type,x,y]] of ([['Aster','capital',300,250],['Northwatch','city',580,240],['Wickerford','town',220,550],['Merehaven','city',825,180],['Brook','village',575,550],['Oakhollow','village',610,670],['Sunken Shrine','temple',930,430],['Old Keep','fort',1030,550]] as const).entries()){
  const choice=markerDefaults('world-map',type);choice.name=name;choice.label=false;const bundle=createMarkerBundle({x,y},choice,map),p=bundle[0];if(p.kind==='place'){p.id='marker-'+i;p.width=p.height=32;p.x=x-16;p.y=y-16;if(p.marker)delete p.marker.labelEnabled;add(p)}
 }
 const layers=[f.layers[0],{id:'label-sources',name:'Named features',visible:true,locked:false,objectIds:ids},...f.layers.slice(1)],layerTree={...f.layerTree,roots:layers.map(l=>l.id)}
 return applyWorldTheme({...f,map,objects,layers,layerTree},'world.painterlyFantasy',{elements:true,assets:false,reset:false}).snapshot
}
