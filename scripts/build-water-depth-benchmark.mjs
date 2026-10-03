import fs from 'node:fs/promises'
import { build } from 'vite'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { zipSync,strToU8,unzipSync,strFromU8 } from 'fflate'
const out='deliverables.local/WaterDepth-Study'
await fs.mkdir('.qa.local/water-depth',{recursive:true})
await fs.writeFile('.qa.local/water-depth/entry.ts',"export {waterDepthStudy} from '../../tests/fixtures/waterDepthStudy'; export {parseProject} from '../../src/projects/format'; export {flatLayerTree} from '../../src/domain/grouping'; export {waterDepthPreset} from '../../src/domain/waterDepth'")
await build({configFile:false,logLevel:'error',build:{ssr:'.qa.local/water-depth/entry.ts',outDir:'.qa.local/water-depth/bundle',rolldownOptions:{output:{entryFileNames:'entry.mjs'}}}})
try {
 const {waterDepthStudy,parseProject,flatLayerTree,waterDepthPreset}=await import(pathToFileURL(path.resolve('.qa.local/water-depth/bundle/entry.mjs')).href)
 await fs.mkdir(out,{recursive:true})
 for(const painted of [false,true]){const snapshot=waterDepthStudy(painted),name=painted?'WaterDepth-Study':'WaterDepth-Study-before',doc={formatVersion:12,id:name.toLowerCase(),name,createdAt:'2026-09-26T00:00:00.000Z',modifiedAt:'2026-09-26T00:00:00.000Z',...snapshot,assets:[]};doc.layerTree=flatLayerTree(doc.layers);parseProject(doc);await fs.writeFile(out+'/'+name+'.mapweaver',zipSync({'project.json':strToU8(JSON.stringify(doc))}))}
 const source='deliverables.local/Velanth-BrushTextureQuality/Velanth-BrushTextureQuality.mapweaver',bytes=await fs.readFile(source),zip=unzipSync(bytes),doc=JSON.parse(strFromU8(zip['project.json']))
 doc.map.waterDepth={...waterDepthPreset(doc.map.water?.style),shelf:100};doc.id='velanth-water-depth';doc.name='Velanth-WaterDepth';parseProject(doc)
 zip['project.json']=strToU8(JSON.stringify(doc));delete zip['preview.png'];await fs.writeFile(out+'/Velanth-WaterDepth.mapweaver',zipSync(zip,{level:6}))
 const hash=data=>createHash('sha256').update(data).digest('hex')
 if(hash(await fs.readFile(source))!==hash(bytes))throw Error('Benchmark source changed')
 await fs.writeFile(out+'/sources.json',JSON.stringify({source,sha256:hash(bytes),originalVelanthSha256:hash(await fs.readFile('deliverables.local/Velanth/Velanth.mapweaver')),changes:['new document identity','map.waterDepth'],study:'New native fixture; identical geometry in both copies'},null,2))
 console.log(out)
}finally{/* Bundled benchmark has no live server. */}
