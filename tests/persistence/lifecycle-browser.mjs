import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve('.sprint13-1.local','browser-'+Date.now()),data=path.join(root,'data'),base='http://127.0.0.1:47963',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const delay=ms=>new Promise(r=>setTimeout(r,ms)),poll=async(fn)=>{for(let i=0;i<150;i++){if(await fn())return;await delay(100)}throw Error('Timeout')}
let child,browser,page,health
const start=async()=>{child=spawn(process.execPath,['dist-service/main.js'],{env:{...process.env,MAPWEAVER_PORT:'47963',MAPWEAVER_DATA_DIR:data,MAPWEAVER_CONTROL_TOKEN:token},windowsHide:true,stdio:'pipe'});child.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return !!health.instanceId && health.pid===child.pid}catch{return false}})}
const headers=()=>({'Content-Type':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token})
try {
 await start();const now=new Date().toISOString(),document={formatVersion:4,id:'fixture',name:'Browser lifecycle',createdAt:now,modifiedAt:now,map:{width:600,height:400,backgroundColor:'#dddddd',background:null},objects:[],layers:[{id:'layer',name:'Objects',visible:true,locked:false,objectIds:[]}],assets:[]}
 const r=await fetch(base+'/api/v1/projects',{method:'POST',headers:headers(),body:JSON.stringify(document)});assert(r.ok,await r.clone().text());const row=await r.json()
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(base);await page.getByRole('button',{name:'Open Browser lifecycle',exact:true}).click();await page.getByRole('tab',{name:'Map',exact:true}).click();await page.getByLabel('Width (px)',{exact:true}).fill('640');
 await page.getByRole('button',{name:'Apply map settings',exact:true}).click()
 // Stop immediately, before the 700 ms autosave debounce.
 const stop=await fetch(base+'/api/v1/lifecycle/control',{method:'POST',headers:headers(),body:'{"action":"stop"}'});assert(stop.ok,await stop.clone().text())
 await page.getByRole('alertdialog',{name:'Mapweaver lifecycle'}).getByText('Mapweaver has stopped.',{exact:false}).waitFor()
 await poll(()=>child.exitCode!==null);assert.equal(child.exitCode,0);await page.screenshot({path:path.join(root,'stopped.png')})
 const old=health.instanceId;await start();assert.notEqual(health.instanceId,old)
 const saved=await fetch(base+'/api/v1/projects/'+row.id).then(r=>r.json());assert.equal(saved.document.map.width,640)
 // Old tab stays frozen and cannot reconnect silently.
 await delay(800);assert.match(await page.getByRole('alertdialog').innerText(),/stopped/)
 await page.reload();await page.getByRole('button',{name:'Open Browser lifecycle',exact:true}).click();
 await page.getByRole('button',{name:'Project',exact:true}).count().catch(()=>0)
 await page.getByText('Project',{exact:true}).last().click();await page.getByRole('button',{name:'Storage',exact:true}).click();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Stop Mapweaver',exact:true}).click()
 await poll(()=>child.exitCode!==null);assert.equal(child.exitCode,0);assert.deepEqual(errors,[])
 await fs.writeFile(path.join(root,'results.json'),JSON.stringify({dirtyAutosaveFlushed:true,widthPersisted:640,oldTabFrozen:true,storageUiStop:true,errors},null,2));console.log('PASS '+root)
}finally{
 if(browser){for(const context of browser.contexts())for(const tab of context.pages())await tab.goto('about:blank').catch(()=>{});await browser.close()}
 if(child&&child.exitCode===null){try{await fetch(base+'/api/v1/lifecycle/control',{method:'POST',headers:headers(),body:'{"action":"stop"}'})}catch { /* Expected during startup/shutdown; the owned-process check handles failure. */ };await delay(2000);if(child.exitCode===null)console.error('Owned service still running: '+child.pid+' '+root)}
}
