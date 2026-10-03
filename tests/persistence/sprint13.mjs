import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { strict as assert } from 'node:assert'
import { unzipSync } from 'fflate'
const root=path.resolve('.sprint13.local',String(Date.now())), packaged=path.join(root,'Mapweaver café package'), data=path.join(root,'browser-data'), base='http://127.0.0.1:47931'
await mkdir(root,{recursive:true});await cp('distribution.local/Mapweaver',packaged,{recursive:true})
const environment={...process.env,MAPWEAVER_DATA_DIR:data,MAPWEAVER_PORT:'47931'}
const launch=(args=[])=>new Promise((resolve,reject)=>{const p=spawn(path.join(packaged,'Mapweaver.exe'),['--test',...args],{env:environment,windowsHide:true,stdio:'ignore'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error('Launcher exit '+code)))})
const poll=async(fn,predicate)=>{for(let i=0;i<150;i++){const value=await fn();if(predicate(value))return value;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out')}
let browser,edge,context
try {
 await launch(['--no-browser']);const health=await fetch(base+'/api/v1/health').then(r=>r.json());await Promise.all([launch(['--no-browser']),launch(['--no-browser'])]);assert.equal((await fetch(base+'/api/v1/health').then(r=>r.json())).generation,health.generation)
 const api=async(url,method='GET',body)=>{const current=await fetch(base+'/api/v1/health').then(r=>r.json());const r=await fetch(base+'/api/v1'+url,{method,headers:{'X-Mapweaver':'1','X-Mapweaver-Generation':current.generation,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});assert(r.ok,await r.clone().text());return r.json()}
 assert.equal(path.resolve((await api('/storage')).location),data)
 browser=await chromium.launch({channel:'chrome',headless:true});context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true})
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept())
 // Force native download-manager branch so Playwright can verify the resulting chosen file.
 await page.addInitScript(()=>{Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true})})
 await page.goto(base);await page.getByRole('dialog',{name:'Projects',exact:true}).getByRole('button',{name:'New project',exact:true}).click()
 await page.getByLabel('Name',{exact:true}).fill('Sprint 13 acceptance');await page.getByRole('button',{name:'Create project',exact:true}).click()
 await page.getByRole('tab',{name:'Asset library',exact:true}).click();await page.getByLabel('Import library assets').setInputFiles(['.audit.local/fixtures/stamp.png']);await poll(()=>api('/assets?type=stamp'),a=>a.length>0)
 await page.getByRole('tab',{name:'Fill patterns',exact:true}).click();await page.getByLabel('Import library assets').setInputFiles(['.audit.local/fixtures/fill.png']);await poll(()=>api('/assets?type=fill-pattern'),a=>a.length>0)
 await page.getByRole('tab',{name:'Map editor',exact:true}).click();await page.getByRole('tab',{name:'Map',exact:true}).click();await page.getByLabel('Background image file').setInputFiles('.audit.local/fixtures/background.png');await page.getByRole('button',{name:'Remove background'}).waitFor();await poll(()=>page.locator('small[role=status]').textContent(),s=>s.startsWith('Saved locally'))
 const projects=await api('/projects'),before=await api(`/projects/${projects[0].id}`),assets=await api('/assets'),oldGeneration=(await api('/health')).generation
 const openStorage=async()=>{await page.locator('summary').filter({hasText:/^Project$/}).click();await page.getByRole('button',{name:'Storage',exact:true}).click();await page.getByRole('button',{name:'Back up all data',exact:true}).waitFor()}
 await openStorage();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Back up all data',exact:true}).click();const download=await downloading,backup=path.join(root,'chosen-backup.zip');await download.saveAs(backup);assert.equal(await download.failure(),null)
 await api(`/projects/${before.id}`,'PATCH',{revision:before.revision,name:'Later change must disappear'})
 await page.getByLabel('Full Mapweaver backup').setInputFiles(backup);await page.getByRole('button',{name:'Replace all local data',exact:true}).waitFor();await page.getByRole('button',{name:'Replace all local data',exact:true}).click();await page.getByRole('button',{name:'Reload restored data',exact:true}).waitFor({timeout:30000});await page.screenshot({path:path.join(root,'restore-complete.png')})
 const restored=await api(`/projects/${before.id}`);assert.deepEqual(restored.document,before.document);assert.equal(restored.revision,before.revision);assert.deepEqual(await api('/assets'),assets)
 const stale=await fetch(base+`/api/v1/projects/${before.id}`,{method:'PUT',headers:{'Content-Type':'application/json','X-Mapweaver':'1','X-Mapweaver-Generation':oldGeneration},body:JSON.stringify({document:before.document,revision:before.revision})});assert.equal(stale.status,409)
 await page.getByRole('button',{name:'Reload restored data',exact:true}).click();await page.getByRole('button',{name:'Open Sprint 13 acceptance',exact:true}).first().click();await openStorage()
 const corrupt=path.join(root,'broken-backup.zip');await writeFile(corrupt,'broken backup');await page.getByLabel('Full Mapweaver backup').setInputFiles(corrupt);await page.getByText(/Storage operation failed validation/).waitFor();assert.deepEqual((await api(`/projects/${before.id}`)).document,before.document)
 await page.getByRole('button',{name:'Check data integrity',exact:true}).click();await page.getByText(/"status": "healthy"/).waitFor()
 const diagnosticDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Create diagnostics package'}).click();const diag=await diagnosticDownload,file=path.join(root,'diagnostics.zip');await diag.saveAs(file);const text=new TextDecoder().decode(unzipSync(await readFile(file))['diagnostics.json']);assert(!text.includes('Sprint 13 acceptance'));assert(!text.includes(data));assert(!text.includes('document'))
 edge=await chromium.launch({channel:'msedge',headless:true});const edgePage=await edge.newPage();await edgePage.goto(base);await edgePage.getByRole('button',{name:'Open Sprint 13 acceptance',exact:true}).first().click();await edgePage.getByRole('tab',{name:'Map',exact:true}).click();await edgePage.getByRole('button',{name:'Remove background'}).waitFor()
 await launch(['--stop']);await poll(()=>fetch(base+'/api/v1/health').then(()=>false).catch(()=>true),Boolean);await launch(['--no-browser']);assert.deepEqual((await api(`/projects/${before.id}`)).document,before.document)
 assert.deepEqual(errors,[]);await writeFile(path.join(root,'acceptance.json'),JSON.stringify({chrome:browser.version(),edge:edge.version(),projects:projects.length,assets:assets.length,checksums:assets.map(a=>a.sha256),roundtrip:true,staleClientBlocked:true,corruptRejected:true,processRestart:true,doubleLaunch:true,unicodePackagePath:true,diagnosticsPrivate:true},null,2))
 console.log('PASS package launch, two browsers, UI backup/restore, corrupt backup, stale client, process restart and diagnostics')
} finally {await context?.close();await browser?.close();await edge?.close();await launch(['--stop']).catch(()=>{})}
