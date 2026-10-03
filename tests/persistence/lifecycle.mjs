import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createConnection } from 'node:net'
import { cp, mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve('.sprint13-1.local','launcher-'+Date.now()),folder=path.join(root,'Portable package é'),data=path.join(root,'Data é')
await mkdir(root,{recursive:true});await cp(process.argv[2]||'distribution.local/Mapweaver-Lifecycle',folder,{recursive:true})
// Test exactly the supplied package, including its embedded launcher and icon.
const env={...process.env,MAPWEAVER_DATA_DIR:data,MAPWEAVER_PORT:'47961'},base='http://127.0.0.1:47961'
const spawnLauncher=(args=[],override={})=>{const child=spawn(path.join(folder,'Mapweaver.exe'),['--test','--no-browser',...args],{env:{...env,...override},windowsHide:true,stdio:'pipe'});child.stderr.on('data',b=>process.stderr.write(b));return child}
const command=(args,override={})=>new Promise((resolve,reject)=>{const c=spawnLauncher(args,override);let output='';c.stdout.on('data',b=>output+=b);c.once('error',reject);c.once('exit',code=>code===0?resolve(output.trim()):reject(Error('Command failed: '+output)))})
const delay=ms=>new Promise(r=>setTimeout(r,ms))
const poll=async(fn,label)=>{for(let i=0;i<150;i++){if(await fn())return;await delay(100)}throw Error('Timeout: '+label)}
const health=()=>fetch(base+'/api/v1/health').then(r=>r.json()).catch(()=>null)
const headers=h=>({'content-type':'application/json','X-Mapweaver':'1','X-Mapweaver-Generation':h.generation,'X-Mapweaver-Instance':h.instanceId})
let owner
try {
 const foreign=createServer((_q,r)=>r.end('{"application":"Other"}'));await new Promise((r,j)=>{foreign.once('error',j);foreign.listen(47961,'127.0.0.1',r)})
 owner=spawnLauncher();await poll(async()=>{try{return (await command(['--status'])).startsWith('Error')}catch{return false}},'foreign port error');await command(['--stop']);await poll(()=>(owner.exitCode!==null||owner.signalCode!==null),'error supervisor exit');await new Promise(r=>foreign.close(r))
 owner=spawnLauncher();await poll(async()=>!!(await health())?.instanceId,'healthy');const first=await health();assert(first.supervisorId)
 assert.equal(await command([],{MAPWEAVER_PORT:'47964'}),'accepted');
 const reopen=await command([]);assert.equal(reopen,'accepted');assert.equal((await health()).pid,first.pid)
 const sid=execFileSync('powershell',['-NoProfile','-Command','[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'],{encoding:'utf8',windowsHide:true}).trim()
 const pipe='\\\\.\\pipe\\Mapweaver-'+sid+'-'+first.dataKey+'-'+first.supervisorId
 const denied=await new Promise((resolve,reject)=>{const socket=createConnection(pipe);let text='';socket.on('data',b=>{text+=b;if(text.includes('\n')&&!text.includes('denied'))socket.write('wrong-generation stop\n');if(text.includes('denied')){socket.end();resolve(text)}});socket.on('error',reject)})
 assert(denied.includes('denied'));assert.equal((await health()).pid,first.pid)
 const evil=await fetch(base+'/api/v1/lifecycle/control',{method:'POST',headers:{...headers(first),Origin:'https://evil.example'},body:'{"action":"stop"}'});assert.equal(evil.status,403)
 const now=new Date().toISOString(),document={formatVersion:4,id:'fixture',name:'Lifecycle fixture',createdAt:now,modifiedAt:now,map:{width:600,height:400,backgroundColor:'#dddddd',background:null},objects:[],layers:[{id:'layer',name:'Objects',visible:true,locked:false,objectIds:[]}],assets:[]}
 const created=await fetch(base+'/api/v1/projects',{method:'POST',headers:headers(first),body:JSON.stringify(document)});assert(created.ok,await created.clone().text());const row=await created.json()
 await command(['--restart']);await poll(async()=>{const h=await health();return h&&h.instanceId!==first.instanceId},'new instance');const second=await health();assert.notEqual(second.pid,first.pid);assert.equal(second.supervisorId,first.supervisorId)
 const stale=await fetch(base+'/api/v1/projects/'+row.id,{method:'PUT',headers:headers(first),body:JSON.stringify({revision:row.revision,document:row.document})});assert.equal(stale.status,409)
 // Register a browser and prove stop cannot close until its actual pending write is acknowledged.
 const id=crypto.randomUUID(),clientHeaders={...headers(second),'X-Mapweaver-Client':id}
 await fetch(base+'/api/v1/lifecycle/client',{method:'POST',headers:clientHeaders,body:JSON.stringify({id})})
 await command(['--stop']);await poll(async()=> (await health())?.lifecycle.phase==='flushing','browser flush barrier');assert.equal(owner.exitCode,null)
 const update=await fetch(base+'/api/v1/projects/'+row.id,{method:'PUT',headers:clientHeaders,body:JSON.stringify({revision:row.revision,document:{...row.document,name:'Flushed before close'}})});assert(update.ok,await update.clone().text())
 const stopping=await health();await fetch(base+'/api/v1/lifecycle/client',{method:'POST',headers:clientHeaders,body:JSON.stringify({id,ticket:stopping.lifecycle.ticket})})
 await poll(()=>(owner.exitCode!==null||owner.signalCode!==null),'supervisor stops');assert.equal(owner.exitCode,0);assert.equal(await health(),null)
 owner=spawnLauncher(['--debug']);await poll(async()=>!!(await health())?.instanceId,'reopen');const saved=await fetch(base+'/api/v1/projects/'+row.id).then(r=>r.json());assert.equal(saved.name,'Flushed before close')
 const crash=await health();process.kill(crash.pid);await poll(async()=> (await command(['--status'])).includes('service exited'),'visible crash');assert.equal(owner.exitCode,null)
 await command(['--restart']);await poll(async()=>{const h=await health();return h&&h.instanceId!==crash.instanceId},'recover crash')
 const orphan=await health();owner.kill();await poll(()=>(owner.exitCode!==null||owner.signalCode!==null),'owned supervisor crash')
 owner=spawnLauncher();await poll(async()=> (await command(['--status'])).startsWith('Error'),'safe orphan refusal');assert.equal((await health()).pid,orphan.pid)
 const recoveryId=crypto.randomUUID(),recoveryHeaders={...headers(orphan),'X-Mapweaver-Client':recoveryId}
 await fetch(base+'/api/v1/lifecycle/client',{method:'POST',headers:recoveryHeaders,body:JSON.stringify({id:recoveryId})})
 const orphanStop=await fetch(base+'/api/v1/stop',{method:'POST',headers:recoveryHeaders,body:'{}'});assert(orphanStop.ok)
 await fetch(base+'/api/v1/lifecycle/client',{method:'POST',headers:recoveryHeaders,body:JSON.stringify({id:recoveryId,leave:true})})
 await poll(async()=>!(await health()),'orphan graceful browser stop')
 await command(['--restart']);await poll(async()=>!!(await health())?.instanceId,'restart after orphan stopped')
 await command(['--stop']);await poll(()=>(owner.exitCode!==null||owner.signalCode!==null),'final stop');assert.equal(await health(),null)
 const alternate={MAPWEAVER_DATA_DIR:path.join(root,'Other data'),MAPWEAVER_PORT:'47964'}
 owner=spawnLauncher([],alternate);let alternateHealth
 await poll(async()=>{try{alternateHealth=await fetch('http://127.0.0.1:47964/api/v1/health').then(r=>r.json());return !!alternateHealth.instanceId}catch{return false}},'explicit alternate data directory')
 assert.notEqual(alternateHealth.dataKey,first.dataKey);await command(['--stop','--wait'],alternate);await poll(()=>(owner.exitCode!==null||owner.signalCode!==null),'alternate stop')
 const logs=await readFile(path.join(data,'logs/lifecycle.jsonl'),'utf8');assert(logs.includes('database-closed'));assert(logs.includes('existing-instance'));assert(!logs.includes(data))
 const result={supervisorCrashSafeRefusal:true,orphanBrowserStop:true,alternateDirectory:true,sameDirectoryAcrossPorts:true,firstLaunch:true,foreignPort:true,secondLaunchOneService:true,stalePipeGenerationRejected:true,foreignOriginRejected:true,restartNoOverlap:true,staleHttpInstanceRejected:true,flushBeforeClose:true,persistedAfterRestart:true,crashStatus:true,crashRestart:true,unicodeSpaces:true,listenerClosed:true,supervisorExited:true}
 await writeFile(path.join(root,'results.json'),JSON.stringify(result,null,2));console.log('PASS '+root)
}finally{if(owner&&(owner.exitCode===null&&owner.signalCode===null)){try{await command(['--stop'])}catch { /* Expected during startup/shutdown; the owned-process check handles failure. */ };await delay(2000);if((owner.exitCode===null&&owner.signalCode===null))console.error('Owned supervisor remains: '+owner.pid+'; inspect test root '+root)}}
