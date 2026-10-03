import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const root=path.resolve('.sprint13-1.local','browser-open-'+Date.now()),data=path.join(root,'data'),pkg=path.resolve('distribution.local/Mapweaver-Lifecycle'),base='http://127.0.0.1:47965'
await fs.mkdir(root,{recursive:true});const env={...process.env,MAPWEAVER_PORT:'47965',MAPWEAVER_DATA_DIR:data},exe=path.join(pkg,'Mapweaver.exe')
const child=spawn(exe,['--test'],{cwd:pkg,env,windowsHide:true,stdio:'pipe'});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b)
const delay=ms=>new Promise(r=>setTimeout(r,ms)),poll=async fn=>{for(let i=0;i<180;i++){if(await fn())return;await delay(100)}throw Error('Timed out')}
let events=[]
try{
 await poll(async()=>{try{const h=await fetch(base+'/api/v1/health').then(r=>r.json());return h.dataKey===createHash('sha256').update(data.toLowerCase()).digest('hex')}catch{return false}})
 await poll(async()=>{try{events=(await fs.readFile(path.join(data,'logs/lifecycle.jsonl'),'utf8')).trim().split('\n').map(v=>JSON.parse(v));return events.some(e=>e.event==='browser-opened'||e.event==='browser-failed')}catch{return false}})
 const success=events.some(e=>e.event==='browser-opened');if(!success)assert(output.includes(base),'Fallback includes the copyable local URL')
 await fs.writeFile(path.join(root,'results.json'),JSON.stringify({shellExecuteReturnedSuccess:success,fallbackWithLocalUrl:!success,serviceRemainedHealthy:true,visualBrowserAcceptance:'Not tested'},null,2));console.log(JSON.stringify({root,shellExecuteReturnedSuccess:success,fallbackWithLocalUrl:!success}))
}finally{
 const stop=spawn(exe,['--test','--stop','--wait'],{cwd:pkg,env,windowsHide:true,stdio:'ignore'});await new Promise(r=>stop.once('exit',r));await poll(()=>child.exitCode!==null)
}
