import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { chromium, expect } from '@playwright/test'

const name=process.argv[2]||'Mapweaver-StartupUX-20260924',pkg=path.resolve('distribution.local',name)
const root=path.resolve('.startup-ux.local','package-'+Date.now()),data=path.join(root,'data'),base='http://127.0.0.1:48011'
await fs.mkdir(root,{recursive:true})
const lines=(await fs.readFile(`distribution.local/${name}-SHA256SUMS.txt`,'utf8')).trim().split('\n')
for(const line of lines){const [hash,file]=line.trim().split('  ');assert.equal(createHash('sha256').update(await fs.readFile(path.resolve('distribution.local',file))).digest('hex'),hash)}
assert.equal((await fs.readFile(path.join(pkg,'Mapweaver.exe'))).subarray(0,2).toString(),'MZ')
const poll=async(fn,label)=>{for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout: '+label)}
const env={...process.env,MAPWEAVER_DATA_DIR:data,MAPWEAVER_PORT:'48011'}
const launch=(args=[])=>{const p=spawn(path.join(pkg,'Mapweaver.exe'),['--test','--no-browser',...args],{env,cwd:pkg,windowsHide:true,stdio:'pipe'});p.stdout.resume();p.stderr.on('data',b=>process.stderr.write(b));return p}
let owner,health,browser,page
const headers=()=>({'Content-Type':'application/json','X-Mapweaver':'1','X-Mapweaver-Generation':health.generation,'X-Mapweaver-Instance':health.instanceId})
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api/v1'+url,{method,headers:headers(),...(body===undefined?{}:{body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
async function start(){owner=launch();await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return !!health.supervisorId}catch{return false}},'native startup');assert.notEqual(health.pid,owner.pid);console.log('Native launch '+health.instanceId)}
async function stop(){if(owner&&owner.exitCode===null&&owner.signalCode===null){const command=launch(['--stop','--wait']);await poll(()=>owner.exitCode!==null||owner.signalCode!==null,'graceful native stop');await poll(()=>command.exitCode!==null||command.signalCode!==null,'stop command');assert.equal(owner.exitCode,0)}}
async function browse(){browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1280,height:720}});await page.addInitScript(()=>{window.projectsSeen=false;new MutationObserver(()=>{if(document.querySelector('dialog[aria-label="Projects"]'))window.projectsSeen=true}).observe(document,{childList:true,subtree:true})});await page.goto(base)}
async function restart(){await stop();await browser?.close();browser=null;await start();await browse()}
const picker=()=>page.getByRole('dialog',{name:'Projects',exact:true})
async function projects(){await page.getByRole('button',{name:'Projects',exact:true}).click();await expect(picker()).toBeVisible()}
async function editor(){await expect(page.getByRole('button',{name:'Save',exact:true})).toBeEnabled();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Fit to map',exact:true})).toBeEnabled();await expect(page.locator('canvas').first()).toBeVisible();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
async function action(project,button){const menu=picker().locator('details').filter({has:page.getByLabel(`Actions for ${project}`,{exact:true})});await menu.locator('summary').click();await menu.getByRole('button',{name:button,exact:true}).click()}
function setReference(id,corrupt=false){const db=new Database(path.join(data,'mapweaver.sqlite3'));try{db.prepare("INSERT INTO settings(key,value) VALUES('lastOpenedProject',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(id);if(corrupt)db.prepare('UPDATE projects SET document=? WHERE id=?').run('{broken',id)}finally{db.close()}}
try{
 await start();await browse()
 let dialog=page.getByRole('dialog',{name:'Create your first map project'});await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'New project',exact:true})).toBeFocused();await expect(dialog.getByRole('button',{name:'Import project file'})).toBeVisible();await expect(dialog.getByRole('button',{name:'Trash',exact:true})).toBeHidden();await page.screenshot({path:path.join(root,'first-use.png')})
 await page.keyboard.press('Enter');dialog=page.getByRole('dialog',{name:'New project',exact:true});await dialog.getByLabel('Name',{exact:true}).fill('Startup A');await dialog.getByRole('button',{name:'Create project',exact:true}).click();await editor();const a=(await api('/startup-project')).id;assert(a)
 await restart();await editor();assert.equal(await page.evaluate(()=>window.projectsSeen),false);assert.equal((await api('/startup-project')).id,a);await page.screenshot({path:path.join(root,'automatic-editor.png')})
 await projects();await expect(picker().getByRole('button',{name:'Rename',exact:true})).toBeHidden();await picker().getByLabel('Actions for Startup A',{exact:true}).focus();await page.keyboard.press('Enter');await expect(picker().getByRole('button',{name:'Rename',exact:true})).toBeVisible();page.once('dialog',d=>d.accept('Renamed A'));await picker().getByRole('button',{name:'Rename',exact:true}).click();await expect(picker().getByRole('button',{name:'Open Renamed A',exact:true})).toBeVisible();assert.equal((await api('/startup-project')).id,a)
 await picker().getByRole('button',{name:'Duplicate',exact:true}).click();await expect(picker().getByRole('button',{name:/Open Renamed A copy/})).toBeVisible();assert.equal((await api('/startup-project')).id,a);await page.screenshot({path:path.join(root,'projects.png')});const rows=await api('/projects'),copy=rows.find(r=>r.id!==a);await picker().getByRole('button',{name:`Open ${copy.name}`,exact:true}).click();await editor();assert.equal((await api('/startup-project')).id,copy.id)
 await projects();page.once('dialog',d=>d.accept());await action(copy.name,'Move to Trash');await expect(picker().getByRole('button',{name:`Open ${copy.name}`,exact:true})).toHaveCount(0);assert.equal((await api('/startup-project')).id,null)
 await restart();await expect(picker()).toBeVisible();await picker().getByRole('button',{name:'Open Renamed A',exact:true}).click();await editor()
 await projects();await page.getByLabel('Mapweaver project file').setInputFiles(path.join(pkg,'dist/examples/prefabs/house.mapweaver'));await editor();const imported=(await api('/startup-project')).id;assert.notEqual(imported,a);const house=await api('/projects/'+imported);assert(house.document.objects.length>0);assert(house.document.assets.length>0)
 await page.getByRole('button',{name:'Add layer',exact:true}).click();await poll(async()=>(await api('/projects/'+imported)).document.layers.length===house.document.layers.length+1,'autosaved layer')
 const saved=(await api('/projects/'+imported)).revision;await page.getByRole('button',{name:'Save',exact:true}).click();await poll(async()=>(await api('/projects/'+imported)).revision>saved,'save revision')
 await page.getByRole('button',{name:'Export PNG',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download PNG',exact:true}).click();await (await download).saveAs(path.join(root,'map.png'));await page.getByRole('dialog',{name:'Export PNG',exact:true}).getByRole('button',{name:'Close',exact:true}).click();assert((await fs.stat(path.join(root,'map.png'))).size>1000)
 await page.getByRole('tab',{name:'Asset library',exact:true}).click();await restart();await editor();assert.equal(await page.evaluate(()=>window.projectsSeen),false);assert.equal((await api('/startup-project')).id,imported);await page.screenshot({path:path.join(root,'reopened-house.png')})
 // Only modify the isolated database while its native supervisor is stopped.
 await stop();await browser.close();browser=null;setReference(crypto.randomUUID());await start();await browse();await expect(picker()).toBeVisible();await expect(picker().getByRole('alert')).toContainText('missing or in Trash');assert.equal((await api('/startup-project')).id,null)
 await restart();await expect(picker()).toBeVisible();await expect(picker().getByRole('alert')).toHaveCount(0)
 await stop();await browser.close();browser=null;setReference(a,true);await start();await browse();await expect(picker()).toBeVisible();await expect(picker().getByRole('alert')).toContainText('could not be reopened');assert.equal((await api('/startup-project')).id,null)
 await picker().getByRole('button',{name:`Open ${house.name}`,exact:true}).click();await editor();await projects();await picker().getByRole('button',{name:'Open Renamed A',exact:true}).click();await expect(picker().getByRole('alert')).toBeVisible();assert.equal((await api('/startup-project')).id,imported);await picker().getByRole('button',{name:'Back to editor',exact:true}).click();await editor()
 // A corrupt manual switch preserves the previous working map, which can still export.
 await page.getByRole('button',{name:'Export PNG',exact:true}).click();await expect(page.getByRole('dialog',{name:'Export PNG',exact:true})).toContainText('Prefab house demonstration');await page.getByRole('button',{name:'Close',exact:true}).click()
 await stop();await browser.close();browser=null;setReference(copy.id);await start();await browse();await expect(picker()).toBeVisible();await expect(picker().getByRole('alert')).toContainText('missing or in Trash');assert.equal((await api('/startup-project')).id,null)
 await page.screenshot({path:path.join(root,'fallback.png')})
 await fs.writeFile(path.join(root,'results.json'),JSON.stringify({verifiedFiles:lines.length,nativeLauncher:true,isolatedData:data,firstUseKeyboard:true,createAndImport:true,noModalFlash:true,renameDuplicateSwitchTrash:true,saveAndPng:true,assetLibrary:true,gracefulRelaunch:true,missingCorruptTrashedFallback:true,failedManualSwitchPreserved:true,nativeTrayAndDefaultBrowser:'not manually exercised'},null,2));console.log('PASS '+root+'; '+lines.length+' checksums verified')
}catch(error){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});throw error}
finally{await stop();await browser?.close()}
