import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate'
import { createServer } from 'vite'

const root='deliverables.local/Additional-Terrain'
const original='deliverables.local/Velanth/Velanth.mapweaver'
const source='deliverables.local/Velanth-AssetQuality/Velanth-AssetQuality.mapweaver'
const hash=b=>createHash('sha256').update(b).digest('hex')
const originalHash=hash(await fs.readFile(original)),bytes=await fs.readFile(source),sourceHash=hash(bytes)
const zip=unzipSync(bytes),before=JSON.parse(strFromU8(zip['project.json'])),after=structuredClone(before)
const recipes=[
 {zone:'desert',material:'sand-soft',size:260,strength:.75,points:[[750,1250],[950,1280],[1130,1320]]},
 {zone:'desert',material:'dunes',size:170,strength:.65,points:[[820,1240],[920,1280]]},
 {zone:'desert',material:'desert-stone',size:130,strength:.5,points:[[1080,1200],[1130,1290]]},
 {zone:'damp-cavern-study',material:'cave-damp',size:270,strength:.9,points:[[1420,580],[1600,590]]},
 {zone:'damp-cavern-study',material:'cave-moss',size:150,strength:.7,points:[[1470,590],[1570,650]]},
 {zone:'damp-cavern-study',material:'cave-mud',size:120,strength:.6,points:[[1450,650],[1500,670]]},
 {zone:'rough-cavern-study',material:'cave-broken',size:270,strength:.85,points:[[1700,1050],[1830,1080]]},
 {zone:'rough-cavern-study',material:'cave-rubble',size:160,strength:.7,points:[[1730,1030],[1840,1060]]},
 {zone:'rough-cavern-study',material:'cave-jagged',size:110,strength:.5,points:[[1780,1100],[1890,1090]]},
 {zone:'complements',material:'leaf-litter',size:190,strength:.55,points:[[740,780],[890,820]]},
 {zone:'complements',material:'rooty-floor',size:120,strength:.5,points:[[770,790],[840,830]]},
 {zone:'complements',material:'salt-flats',size:120,strength:.5,points:[[560,950],[630,950]]},
 {zone:'complements',material:'gravel-ground',size:100,strength:.45,points:[[1000,650],[1070,700]]},
]
const crops=[{name:'desert',x:650,y:1110,width:600,height:350},{name:'damp-cavern-study',x:1300,y:440,width:470,height:390},{name:'rough-cavern-study',x:1570,y:900,width:470,height:370},{name:'complements',x:630,y:680,width:490,height:350}]
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
  const {TerrainStroke,defaultTerrainBrush}=await server.ssrLoadModule('/src/domain/terrainBrush.ts'),{premiumBrushPreset}=await server.ssrLoadModule('/src/domain/premiumTerrain.ts'),{parseProject}=await server.ssrLoadModule('/src/projects/format.ts')
  for(const r of recipes){const brush={...defaultTerrainBrush,...premiumBrushPreset('painterly.v1.'+r.material),size:r.size,strength:r.strength};const stroke=new TerrainStroke(after.map.terrainPaint,brush,after.map);r.points.forEach(([x,y])=>stroke.add({x,y}));after.map.terrainPaint=stroke.finish()}
  after.id='velanth-additional-terrain-v1';after.name='Velanth-AdditionalTerrain'
  if(!isDeepStrictEqual(before.objects,after.objects)||!isDeepStrictEqual(before.assets,after.assets))throw Error('Benchmark changed artwork or object geometry')
  for(const key of Object.keys(before.map))if(key!=='terrainPaint'&&!isDeepStrictEqual(before.map[key],after.map[key]))throw Error('Benchmark changed map '+key)
  parseProject(after)
  await fs.mkdir(root,{recursive:true})
  await fs.writeFile(root+'/Velanth-AdditionalTerrain-before.mapweaver',bytes)
  zip['project.json']=strToU8(JSON.stringify(after));delete zip['preview.png']
  await fs.writeFile(root+'/Velanth-AdditionalTerrain.mapweaver',zipSync(zip,{level:6}))
  await fs.writeFile(root+'/recipe.json',JSON.stringify({source,sourceHash,originalHash,recipes,crops,objects:after.objects.length,changed:['document identity','map.terrainPaint'],paintBytes:JSON.stringify(after.map.terrainPaint).length},null,2))
  if(hash(await fs.readFile(original))!==originalHash||hash(await fs.readFile(source))!==sourceHash)throw Error('Source benchmark changed')
  const {additionalTerrainStudy}=await server.ssrLoadModule('/tests/fixtures/additionalTerrainStudy.ts')
  await fs.writeFile(root+'/Additional-Terrain-Showcase.mapweaver',zipSync({'project.json':strToU8(JSON.stringify(additionalTerrainStudy()))},{level:6}))
  console.log(root+'; '+after.objects.length+' unchanged objects; '+JSON.stringify(after.map.terrainPaint).length+' paint bytes')
}finally{await server.close()}
