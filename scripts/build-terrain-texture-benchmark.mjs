import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate'
import { createServer } from 'vite'

const root='deliverables.local/Velanth-BrushTextureQuality'
const original='deliverables.local/Velanth/Velanth.mapweaver'
const source='deliverables.local/Velanth-AssetQuality/Velanth-AssetQuality.mapweaver'
const hash=b=>createHash('sha256').update(b).digest('hex')
const originalHash=hash(await fs.readFile(original)),bytes=await fs.readFile(source),sourceHash=hash(bytes)
const zip=unzipSync(bytes),before=JSON.parse(strFromU8(zip['project.json'])),after=structuredClone(before)
const recipes=[
  {zone:'mountain-foothills',material:'foothill',size:170,strength:.6,points:[[735,710],[795,735],[870,775],[965,830],[1080,890]]},
  {zone:'mountain-foothills',material:'rock-light',size:100,strength:.45,points:[[795,700],[860,740],[920,765]]},
  {zone:'forest-terrain',material:'forest-temperate',size:180,strength:.5,points:[[1510,520],[1600,540],[1710,580],[1800,620]]},
  {zone:'forest-terrain',material:'forest-moss',size:100,strength:.4,points:[[1470,580],[1530,620],[1650,650]]},
  {zone:'coast-transition',material:'shore',size:65,strength:.4,points:[[400,860],[435,935],[490,995],[565,1020],[640,995]]},
  {zone:'rocky-alpine',material:'alpine',size:150,strength:.6,points:[[1720,960],[1820,1000],[1890,1055]]},
  {zone:'rocky-alpine',material:'rock-dark',size:95,strength:.35,points:[[1700,1030],[1780,1080],[1850,1120]]},
  {zone:'swamp-wet-ground',material:'swamp-wet',size:150,strength:.55,points:[[1420,1170],[1500,1200],[1555,1225]]},
]
const crops=[
  {name:'mountain-foothills',x:680,y:560,width:620,height:440},
  {name:'forest-terrain',x:1410,y:435,width:500,height:360},
  {name:'coast-transition',x:350,y:800,width:430,height:340},
  {name:'rocky-alpine',x:1620,y:900,width:430,height:300},
  {name:'swamp-wet-ground',x:1340,y:1110,width:360,height:240},
]
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
  const {TerrainStroke,defaultTerrainBrush}=await server.ssrLoadModule('/src/domain/terrainBrush.ts'),{premiumBrushPreset}=await server.ssrLoadModule('/src/domain/premiumTerrain.ts'),{parseProject}=await server.ssrLoadModule('/src/projects/format.ts')
  for(const r of recipes){const brush={...defaultTerrainBrush,...premiumBrushPreset('painterly.v1.'+r.material),size:r.size,strength:r.strength};const stroke=new TerrainStroke(after.map.terrainPaint,brush,after.map);r.points.forEach(([x,y])=>stroke.add({x,y}));after.map.terrainPaint=stroke.finish()}
  after.id='velanth-brush-texture-quality-v1';after.name='Velanth-BrushTextureQuality'
  if(!isDeepStrictEqual(before.objects,after.objects)||!isDeepStrictEqual(before.assets,after.assets))throw Error('Benchmark changed artwork or object geometry')
  for(const key of Object.keys(before.map))if(key!=='terrainPaint'&&!isDeepStrictEqual(before.map[key],after.map[key]))throw Error('Benchmark changed map '+key)
  parseProject(after)
  await fs.mkdir(root,{recursive:true})
  await fs.writeFile(root+'/Velanth-BrushTextureQuality-before.mapweaver',bytes)
  zip['project.json']=strToU8(JSON.stringify(after));delete zip['preview.png']
  await fs.writeFile(root+'/Velanth-BrushTextureQuality.mapweaver',zipSync(zip,{level:6}))
  await fs.writeFile(root+'/recipe.json',JSON.stringify({source,sourceHash,originalHash,recipes,crops,objects:after.objects.length,changed:['document identity','map.terrainPaint'],paintBytes:JSON.stringify(after.map.terrainPaint).length},null,2))
  if(hash(await fs.readFile(original))!==originalHash||hash(await fs.readFile(source))!==sourceHash)throw Error('Source benchmark changed')
  console.log(root+'; '+after.objects.length+' unchanged objects; '+JSON.stringify(after.map.terrainPaint).length+' paint bytes')
}finally{await server.close()}
