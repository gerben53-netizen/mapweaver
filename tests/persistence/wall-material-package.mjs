import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import assert from 'node:assert/strict'
const name='Mapweaver-Sprint17-1',pkg=path.resolve('distribution.local',name),root=path.resolve('.sprint17-1.local','package-'+Date.now()),base='http://127.0.0.1:47996',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const poll=async fn=>{for(let i=0;i<500;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Package lifecycle timeout')}
const lines=(await fs.readFile(`distribution.local/${name}-SHA256SUMS.txt`,'utf8')).trim().split('\n')
for(const line of lines){const [hash,file]=line.split('  ');assert.equal(createHash('sha256').update(await fs.readFile(path.resolve('distribution.local',file))).digest('hex'),hash)}
let child,health
const headers=()=>({'X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token})
const start=async()=>{child=spawn(path.join(pkg,'runtime/node.exe'),[path.join(pkg,'dist-service/main.js')],{cwd:pkg,env:{...process.env,MAPWEAVER_PORT:'47996',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token},windowsHide:true,stdio:'pipe'});await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===child.pid}catch{return false}})}
const stop=async()=>{if(child?.exitCode===null){const response=await fetch(base+'/api/v1/lifecycle/control',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:'{"action":"stop"}'});assert(response.ok,await response.text());await poll(()=>child.exitCode!==null)}}
try{
 await start();assert.equal((await fetch(base+'/api/v1/storage').then(r=>r.json())).location,path.join(root,'data'))
 const demo=await fs.readFile(path.join(pkg,'dist/examples/wall-materials.mapweaver'))
 const imported=await fetch(base+'/api/v1/projects/import',{method:'POST',headers:{...headers(),'Content-Type':'application/zip'},body:demo});assert(imported.ok,await imported.clone().text());const project=await imported.json();assert.equal(project.document.formatVersion,8);assert(project.document.objects.some(o=>o.wall?.material))
 assert((await fetch(base).then(r=>r.text())).includes('Mapweaver'));assert((await fetch(base+'/wall-sets/template.zip')).ok)
 const old=project.document.objects;await stop();await start();const reopened=await fetch(base+'/api/v1/projects/'+project.id).then(r=>r.json());assert.deepEqual(reopened.document.objects,old)
 const report={verifiedFiles:lines.length,packagedRuntime:true,productionClient:true,examplePackages:true,portableV8Import:true,materialObjects:old.filter(o=>o.wall?.material).length,gracefulStopRestart:true,nativeLauncherGUI:'Not exercised; existing Open/Restart/Stop source retained and recompiled.'}
 await fs.writeFile(path.join(root,'results.json'),JSON.stringify(report,null,2));console.log('PASS '+root+'; '+lines.length+' checksums verified')
}finally{await stop()}
