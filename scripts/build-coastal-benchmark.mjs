import fs from 'node:fs/promises'
import {build} from 'vite'
import {pathToFileURL} from 'node:url'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate'
const out='deliverables.local/Coastal-Contours',work='.qa.local/coastal-contours'
await fs.mkdir(work,{recursive:true});await fs.mkdir(out,{recursive:true})
await fs.writeFile(work+'/entry.ts',"export {contourPreset} from '../../src/domain/coastalContours'; export {createArea} from '../../src/domain/areas'; export {defaultLandArea} from '../../src/domain/landAreas'; export {parseProject} from '../../src/projects/format'")
await build({configFile:false,logLevel:'error',build:{ssr:work+'/entry.ts',outDir:work+'/bundle',rolldownOptions:{output:{entryFileNames:'entry.mjs'}}}})
const {contourPreset,createArea,defaultLandArea,parseProject}=await import(pathToFileURL(path.resolve(work+'/bundle/entry.mjs')).href)
const source='deliverables.local/Bathymetry-Study/after.mapweaver',bytes=await fs.readFile(source),doc=JSON.parse(strFromU8(unzipSync(bytes)['project.json']))
// Two close islands make a narrow water strait. A tiny island exercises suppression.
for(const [id,points] of [['strait-west',[[1080,520],[1120,500],[1150,580],[1130,650],[1090,640]]],['strait-east',[[1160,515],[1210,510],[1240,600],[1200,645],[1160,600]]],['tiny-island',[[1400,400],[1412,399],[1418,409],[1404,416]]]]){
 const o={...createArea({polygons:[{outer:points.map(([x,y])=>({x,y})),holes:[]}]}),id,land:defaultLandArea('landmass')};doc.objects.push(o);doc.layers[0].objectIds.push(id)
}
for(const after of [false,true]){const copy=structuredClone(doc);copy.id='contours-'+(after?'after':'before');copy.name='Coastal contours '+(after?'after':'before');if(after)copy.map.coastalContours=contourPreset();parseProject(copy);await fs.writeFile(out+'/'+(after?'after':'before')+'.mapweaver',zipSync({'project.json':strToU8(JSON.stringify(copy))}))}
const hash=b=>createHash('sha256').update(b).digest('hex');if(hash(await fs.readFile(source))!==hash(bytes))throw Error('Source changed')
await fs.writeFile(out+'/source.json',JSON.stringify({source,sha256:hash(bytes),changes:'Copies add identical strait and tiny-island geometry; only after enables contours.'},null,2))

const heavySource='deliverables.local/Bathymetry-Study/velanth-after.mapweaver',heavyBytes=await fs.readFile(heavySource),heavyZip=unzipSync(heavyBytes),heavy=JSON.parse(strFromU8(heavyZip['project.json']))
for(const after of [false,true]){const copy=structuredClone(heavy);copy.id='contours-velanth-'+(after?'after':'before');copy.name='Velanth contours '+(after?'after':'before');if(after)copy.map.coastalContours=contourPreset('world.painterlyFantasy',Math.max(copy.map.width,copy.map.height));parseProject(copy);const files={...heavyZip,'project.json':strToU8(JSON.stringify(copy))};delete files['preview.png'];await fs.writeFile(out+'/velanth-'+(after?'after':'before')+'.mapweaver',zipSync(files))}
if(hash(await fs.readFile(heavySource))!==hash(heavyBytes))throw Error('Heavy source changed')
await fs.writeFile(out+'/heavy-source.json',JSON.stringify({source:heavySource,sha256:hash(heavyBytes),objects:heavy.objects.length},null,2))
