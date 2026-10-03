import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { unzipSync,zipSync,strFromU8,strToU8 } from 'fflate'
import { createServer } from 'vite'
const input='deliverables.local/Velanth/Velanth.mapweaver',out='deliverables.local/Velanth-GeographyFinish',hash=b=>createHash('sha256').update(b).digest('hex')
const bytes=await fs.readFile(input),originalHash=hash(bytes),archive=unzipSync(bytes),original=JSON.parse(strFromU8(archive['project.json'])),doc=structuredClone(original)
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try {
 const {terrainField,drainage}=await server.ssrLoadModule('/src/world/generate.ts'),{extractRidges,drainageNetwork}=await server.ssrLoadModule('/src/world/geographyNetwork.ts'),{finishPreset}=await server.ssrLoadModule('/src/domain/geographyFinish.ts'),{withPathGeometry}=await server.ssrLoadModule('/src/domain/paths.ts'),{parseProject}=await server.ssrLoadModule('/src/projects/format.ts')
 const p=doc.map.generation.parameters,f=terrainField(p),flow=drainage(f.height,f.cols,f.rows,p.water)
 const rivers=doc.objects.filter(o=>o.kind==='path'&&/^world-v1-river-/.test(o.id)),toCell=n=>Math.round(n.y/p.height*(f.rows-1))*f.cols+Math.round(n.x/p.width*(f.cols-1)),chains=rivers.map(o=>o.nodes.map(toCell))
 const network=drainageNetwork(chains,f,flow.filled,flow.lake,p.water,p.width,p.height),usedIds=new Set(),remap=new Map()
 let extra=40
 for(let i=0;i<network.paths.length;i++){
  const path=network.paths[i],r=network.reaches[i],source=rivers.find(o=>toCell(o.nodes[0])===r.from)??rivers.find(o=>o.nodes.some(n=>toCell(n)===r.from)&&o.nodes.some(n=>toCell(n)===r.to))
  if(!source)throw Error('No original river source for '+r.id)
  const id=!usedIds.has(source.id)?source.id:'world-v1-river-'+extra++;usedIds.add(id);remap.set(r.id,id)
  const next={...source,id,nodes:path.nodes,route:{...source.route,startWidth:r.startWidth,endWidth:r.endWidth,startFactor:1,endFactor:1}}
  network.paths[i]=withPathGeometry(next)
 }
 for(const r of network.reaches){r.id=remap.get(r.id);r.downstream=r.downstream?remap.get(r.downstream):null;r.tributaries=r.tributaries.map(id=>remap.get(id))}
 const oldIds=new Set(rivers.map(o=>o.id));doc.objects=doc.objects.filter(o=>!oldIds.has(o.id)).concat(network.paths)
 for(const layer of doc.layers)if(layer.objectIds.some(id=>oldIds.has(id)))layer.objectIds=layer.objectIds.filter(id=>!oldIds.has(id)).concat(network.paths.map(o=>o.id))
 doc.id='velanth-geography-finish-v1';doc.name='Velanth-GeographyFinish';doc.map.geographyFinish=finishPreset('world.painterlyFantasy')
 doc.map.generation.geography={version:1,cols:f.cols,rows:f.rows,ridges:extractRidges(f,p.water,p.width,p.height),drainage:network.reaches}
 doc.map.generation.objectIds=[...new Set([...doc.map.generation.objectIds,...network.paths.map(o=>o.id)])]
 for(const o of original.objects)if(!oldIds.has(o.id)&&!isDeepStrictEqual(doc.objects.find(v=>v.id===o.id),o))throw Error('Composition changed: '+o.id)
 for(const key of Object.keys(original.map))if(!['generation','geographyFinish'].includes(key)&&!isDeepStrictEqual(original.map[key],doc.map[key]))throw Error('Map field changed: '+key)
 parseProject(doc)
 archive['project.json']=strToU8(JSON.stringify(doc));delete archive['preview.png'];await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/Velanth-GeographyFinish.mapweaver',zipSync(archive,{level:6}))
 const audit={originalHash,objects:doc.objects.length,originalObjects:original.objects.length,originalRiverPaths:rivers.length,newRiverReaches:network.paths.length,majorRidges:doc.map.generation.geography.ridges.filter(r=>r.level==='major').length,secondaryRidges:doc.map.generation.geography.ridges.filter(r=>r.level==='secondary').length,images:doc.assets.length,unchanged:['land and biome geometry','manual paint','stamps and image assets','labels','markers','cartographic objects','effects and border','non-river layer order']}
 await fs.writeFile(out+'/geography-audit.json',JSON.stringify(audit,null,2));if(hash(await fs.readFile(input))!==originalHash)throw Error('Original modified');console.log(audit)
} finally {await server.close()}
