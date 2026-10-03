import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const name = 'Mapweaver-Sprint23B', pkg = path.resolve('distribution.local', name)
const root = path.resolve('.sprint23b.local', 'package-' + Date.now()), base = 'http://127.0.0.1:48006', token = crypto.randomUUID()
await fs.mkdir(root, { recursive: true })
const poll = async fn => { for (let i=0;i<300;i++) { if(await fn())return;await new Promise(r=>setTimeout(r,100)) } throw Error('Packaged service timeout') }
const lines = (await fs.readFile(`distribution.local/${name}-SHA256SUMS.txt`, 'utf8')).trim().split('\n')
for(const line of lines){const [hash,file]=line.split('  ');assert.equal(createHash('sha256').update(await fs.readFile(path.resolve('distribution.local',file))).digest('hex'),hash)}
assert.equal((await fs.readFile(path.join(pkg,'Mapweaver.exe'))).subarray(0,2).toString(),'MZ')
let child,health,browser
const headers=()=>({'Content-Type':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token})
const api=async(url,options={})=>{const r=await fetch(base+'/api/v1'+url,{...options,headers:{...headers(),...options.headers}});assert(r.ok,await r.clone().text());return r.json()}
const launch=()=>spawn(path.join(pkg,'runtime/node.exe'),[path.join(pkg,'dist-service/main.js')],{cwd:pkg,windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48006',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token}})
const start=async()=>{child=launch();child.stdout.resume();child.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===child.pid}catch{return false}})}
const stop=async()=>{if(child?.exitCode===null&&child.signalCode===null){await api('/lifecycle/control',{method:'POST',body:'{"action":"stop"}'});await poll(()=>child.exitCode!==null||child.signalCode!==null)}}
try{
 await start();assert.equal((await api('/storage')).location,path.join(root,'data'))
 assert((await fetch(base).then(r=>r.text())).includes('Mapweaver'))
 assert((await fetch(base+'/asset-templates/prefab-v1.schema.json')).ok)
 const duplicate=launch();duplicate.stdout.resume();duplicate.stderr.resume();await poll(()=>duplicate.exitCode!==null||duplicate.signalCode!==null);assert.notEqual(duplicate.exitCode,0);assert.equal((await api('/health')).pid,child.pid)
 for(const mode of ['editable','flattened']){
  const bytes=await fetch(base+`/examples/prefabs/house-${mode}.zip`);assert(bytes.ok)
  const p=await api('/library/preview',{method:'POST',headers:{'Content-Type':'application/zip'},body:await bytes.arrayBuffer()});assert.deepEqual(p.errors,[])
  const options={token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true}
  const before=(await api('/library?type=prefab')).total;await api('/library/review',{method:'POST',body:JSON.stringify(options)});assert.equal((await api('/library?type=prefab')).total,before)
  await api('/library/commit',{method:'POST',body:JSON.stringify(options)})
 }
 const project=await api('/projects/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:await fs.readFile(path.join(pkg,'dist/examples/prefabs/house.mapweaver'))})
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}});await page.goto(base);await page.getByRole('button',{name:'Open Prefab house demonstration',exact:true}).click()
 // Create a new composition using the packaged client and service, rather than just importing fixtures.
 await page.getByRole('button',{name:'Save as reusable prefab',exact:true}).click();let dialog=page.getByRole('dialog',{name:'Save as reusable prefab',exact:true});await dialog.getByLabel('Source',{exact:true}).selectOption('layerGroup');await dialog.getByLabel('Source entry',{exact:true}).selectOption('assembly');await dialog.getByLabel('Title',{exact:true}).fill('Packaged house '+ 'long composition title '.repeat(5).slice(0,105));await dialog.getByRole('button',{name:'Preview composition',exact:true}).click();await poll(()=>dialog.getByRole('button',{name:'Confirm save prefab',exact:true}).isEnabled());await dialog.getByRole('button',{name:'Confirm save prefab',exact:true}).click();await poll(async()=>!(await dialog.count()))
 await page.getByRole('tab',{name:'Asset library',exact:true}).click();await page.getByRole('tab',{name:'Prefabs',exact:true}).click();await page.getByRole('button',{name:/Packaged house.*Editable prefab/}).click();await page.screenshot({path:path.join(root,'long-title-1280.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('button',{name:/^Place prefab/}).click();dialog=page.getByRole('dialog',{name:/^Place prefab/});await dialog.getByRole('button',{name:'Choose placement',exact:true}).click();await page.getByRole('button',{name:'Place at preview anchor',exact:true}).click();await poll(async()=>(await api('/projects/'+project.id)).document.objects.length===14)
 await page.screenshot({path:path.join(root,'packaged-client.png')})
 const before=(await api('/projects/'+project.id)).document,library=await api('/library?type=prefab');assert.equal(library.total,3)
 for(const a of library.assets)assert.equal((await api('/prefabs/'+a.id)).formatVersion,1)
 await stop();await browser.close();browser=null;await start();assert.deepEqual((await api('/projects/'+project.id)).document,before);assert.deepEqual((await api('/library?type=prefab')).assets,library.assets);await stop()
 const report={verifiedFiles:lines.length,packagedRuntime:true,productionBrowser:true,secondServiceRejected:true,prefabImportCreatePlace:true,saveReload:true,gracefulServiceStopRestart:true,nativeLauncherGUI:'Not manually exercised: tray buttons, default-browser opening, URL copy and second launcher activation remain separate native acceptance.'}
 await fs.writeFile(path.join(root,'results.json'),JSON.stringify(report,null,2));console.log('PASS '+root+'; '+lines.length+' checksums verified')
}finally{await browser?.close();try{await stop()}catch { /* Expected during startup/shutdown; the owned-process check handles failure. */ }finally{if(child?.exitCode===null&&child.signalCode===null)child.kill()}}
