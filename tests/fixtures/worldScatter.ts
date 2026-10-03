import { WORLD_DEFAULTS } from '../../src/world/model'
import { generateWorld,terrainField } from '../../src/world/generate'
import { createArea } from '../../src/domain/areas'
import { defaultLandArea } from '../../src/domain/landAreas'
export function fixture(){
 const p={...WORLD_DEFAULTS,width:2400,height:1500,widthKm:30000,rivers:0,seed:'Semantic ranges'},r=generateWorld(p),f=terrainField(p)
 const area=createArea({polygons:[{outer:[{x:20,y:20},{x:2380,y:20},{x:2380,y:1480},{x:20,y:1480}],holes:[]}]},{kind:'solid',color:'#bbcc99'});area.id='world-v1-land';area.land=defaultLandArea('landmass')
 r.objects=[area];r.layers=r.layers.map((l,i)=>({...l,objectIds:i===5?[area.id]:[]}));r.map.generation!.objectIds=[area.id]
 for(let y=0;y<f.rows;y++)for(let x=0;x<f.cols;x++){const i=y*f.cols+x,ridgeX=35+Math.sin(y/9)*5,d=Math.abs(x-ridgeX),edge=x<3||x>140||y<3||y>93
 f.height[i]=edge?.1:.52+.36*Math.exp(-d*d/18);f.biomes[i]=edge?'ocean':d<4?(y<30?'alpine':y>68?'volcanic':'mountains'):x>75&&x<130&&y>15&&y<65?'forest':x>80&&x<125&&y>72?'wetland':d<9?'hills':'upland';f.temperature[i]=y<30?.2:.6;f.moisture[i]=.6}
 return {r,f}
}