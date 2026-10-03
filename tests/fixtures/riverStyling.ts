import { createRoute } from '../../src/domain/routes'
import { riverPreset } from '../../src/domain/riverPresets'
import { withPathGeometry } from '../../src/domain/paths'
import { createArea } from '../../src/domain/areas'
import { defaultLandArea } from '../../src/domain/landAreas'
import { terrainAppearance } from '../../src/domain/terrainStyles'
export function riverFixture(){
 const terrain=createArea({polygons:[{outer:[{x:0,y:0},{x:1200,y:0},{x:1200,y:800},{x:0,y:800}],holes:[]}]},{kind:'solid',color:'#bac29a'});terrain.id='terrain';terrain.name='Textured valley';terrain.land={...defaultLandArea('landmass'),appearance:terrainAppearance('grassland',1200)}
 const forest=createArea({polygons:[{outer:[{x:500,y:110},{x:1000,y:180},{x:1080,y:480},{x:600,y:460}],holes:[]}]},{kind:'solid',color:'#75966a'});forest.id='forest';forest.name='Forest terrain';forest.land={...defaultLandArea('terrain-region'),terrain:'forest',appearance:terrainAppearance('forest',1200)}
 const make=(id:string,points:number[][],end:number)=>{const p=createRoute(points.map(([x,y],i)=>({id:id+'-'+i,x,y,mode:'corner'})),false,riverPreset('fantasyRiver',end));p.id=id;p.name=id;return p}
 const main=make('main',[[100,90],[220,145],[330,100],[440,245],[530,340],[480,420],[640,525],[760,575],[860,690],[1100,735]],16);main.id='main';main.name='Main river'
 const left=make('left',[[100,420],[210,350],[320,395],[480,420]],6);left.name='West tributary';left.nodes.at(-1)!.junction=main.id
 const right=make('right',[[1060,220],[940,270],[870,390],[740,420],[640,525]],8);right.name='East tributary';right.nodes.at(-1)!.junction=main.id
 // createRoute validates identifiers before assigning a user-facing name.
 return [terrain,forest,...[main,left,right].map(p=>withPathGeometry(p))]
}
