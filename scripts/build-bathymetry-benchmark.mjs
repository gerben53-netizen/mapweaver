import fs from 'node:fs/promises'
import {build} from 'vite'
import {pathToFileURL} from 'node:url'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate'
const out='deliverables.local/Bathymetry-Study',work='.qa.local/bathymetry'
await fs.mkdir(work,{recursive:true});await fs.mkdir(out,{recursive:true})
await fs.writeFile(work+'/entry.ts',"export {waterDepthPreset,waterStroke,defaultWaterDepthBrush} from '../../src/domain/waterDepth'; export {waterGeometry,waterContains} from '../../src/domain/waterGeometry'; export {parseProject} from '../../src/projects/format'")
await build({configFile:false,logLevel:'error',build:{ssr:work+'/entry.ts',outDir:work+'/bundle',rolldownOptions:{output:{entryFileNames:'entry.mjs'}}}})
const {waterDepthPreset,waterStroke,defaultWaterDepthBrush,waterGeometry,waterContains,parseProject}=await import(pathToFileURL(path.resolve(work+'/bundle/entry.mjs')).href)
const source='deliverables.local/WaterDepth-Study/WaterDepth-Study.mapweaver',bytes=await fs.readFile(source),zip=unzipSync(bytes),doc=JSON.parse(strFromU8(zip['project.json']))
await fs.writeFile(out+'/original.mapweaver',bytes)
const wet=waterContains(waterGeometry(doc.map,doc.objects)),stroke=waterStroke(doc.map.waterDepth.paint,{...defaultWaterDepthBrush,mode:'deep',size:160,strength:.8},doc.map,wet)
stroke.add({x:820,y:580});stroke.add({x:930,y:615});doc.map.waterDepth.paint=stroke.finish()
for(const after of [false,true]){
 const copy=structuredClone(doc);copy.id='bathymetry-'+(after?'after':'before');copy.name='Bathymetry '+(after?'after':'before')
 if(after)copy.map.waterDepth={...waterDepthPreset(copy.map.water.style),paint:copy.map.waterDepth.paint}
 parseProject(copy);await fs.writeFile(out+'/'+(after?'after':'before')+'.mapweaver',zipSync({'project.json':strToU8(JSON.stringify(copy))}))
}
const hash=b=>createHash('sha256').update(b).digest('hex')
if(hash(await fs.readFile(source))!==hash(bytes))throw Error('Original changed')
await fs.writeFile(out+'/sources.json',JSON.stringify({source,sha256:hash(bytes),changes:'Both copies add the identical manual Deep stroke to the original painted study. After explicitly applies the new depth preset; geography and all manual masks remain identical.'},null,2))
console.log(out)
const heavySource='deliverables.local/WaterDepth-Study/Velanth-WaterDepth.mapweaver',heavyBytes=await fs.readFile(heavySource),heavyZip=unzipSync(heavyBytes),heavyDoc=JSON.parse(strFromU8(heavyZip['project.json']))
for(const after of [false,true]){
 const copy=structuredClone(heavyDoc);copy.id='bathymetry-velanth-'+(after?'after':'before');copy.name='Velanth bathymetry '+(after?'after':'before')
 if(after)copy.map.waterDepth={...waterDepthPreset(copy.map.water.style),shelf:copy.map.waterDepth.shelf,paint:copy.map.waterDepth.paint}
 parseProject(copy);const output={...heavyZip,'project.json':strToU8(JSON.stringify(copy))};delete output['preview.png']
 await fs.writeFile(out+'/velanth-'+(after?'after':'before')+'.mapweaver',zipSync(output,{level:6}))
}
if(hash(await fs.readFile(heavySource))!==hash(heavyBytes))throw Error('Original heavy benchmark changed')
await fs.writeFile(out+'/heavy-source.json',JSON.stringify({source:heavySource,sha256:hash(heavyBytes),objects:heavyDoc.objects.length},null,2))
