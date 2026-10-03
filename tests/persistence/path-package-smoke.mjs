import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {spawn} from 'node:child_process'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve('.sprint15.local','package-'+Date.now()),pkg=path.resolve('distribution.local/Mapweaver-Sprint15'),base='http://127.0.0.1:47953'
await fs.mkdir(root,{recursive:true})
const lines=(await fs.readFile('distribution.local/Mapweaver-Sprint15-SHA256SUMS.txt','utf8')).trim().split('\n')
for(const line of lines){const [hash,file]=line.split('  ');assert.equal(createHash('sha256').update(await fs.readFile(path.resolve('distribution.local',file))).digest('hex'),hash)}
const child=spawn(path.join(pkg,'runtime/node.exe'),[path.join(pkg,'dist-service/main.js')],{cwd:pkg,env:{...process.env,MAPWEAVER_PORT:'47953',MAPWEAVER_DATA_DIR:path.join(root,'data')},windowsHide:true,stdio:'pipe'})
try{
 let health
 for(let i=0;i<100;i++){try{health=await fetch(base+'/api/v1/health').then(r=>r.json());if(health.application==='Mapweaver')break}catch{/* Waiting for the owned service. */}await new Promise(r=>setTimeout(r,100))}
 assert(health?.generation);const storage=await fetch(base+'/api/v1/storage').then(r=>r.json());assert.equal(path.resolve(storage.location),path.join(root,'data'))
 const pad=4*Math.SQRT2,now=new Date().toISOString(),object={kind:'path',pathKind:'generic',id:'path',name:'Packaged path',nodes:[{id:'a',x:50,y:50,mode:'corner'},{id:'b',x:150,y:50,mode:'corner'}],closed:false,strokeWidth:8,opacity:1,stroke:{kind:'solid',color:'#112233'},cap:'round',join:'round',x:50-pad,y:50-pad,width:100+2*pad,height:2*pad,rotation:0,scaleX:1,scaleY:1}
 const document={formatVersion:4,id:'smoke',name:'Packaged paths',createdAt:now,modifiedAt:now,map:{width:600,height:400,backgroundColor:'#ffffff',background:null},objects:[object],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:['path']}],assets:[]}
 const r=await fetch(base+'/api/v1/projects',{method:'POST',headers:{'content-type':'application/json','X-Mapweaver':'1','X-Mapweaver-Generation':health.generation},body:JSON.stringify(document)});assert(r.ok,await r.text());assert((await fetch(base).then(r=>r.text())).includes('Mapweaver'))
 await fs.writeFile(path.join(root,'results.json'),JSON.stringify({verifiedFiles:lines.length,packagedNode:true,productionClient:true,format4Write:true},null,2));console.log('PASS '+root+'; '+lines.length+' checksums verified')
}finally{if(child.exitCode===null){const exit=new Promise(r=>child.once('exit',r));child.kill();await exit}}
