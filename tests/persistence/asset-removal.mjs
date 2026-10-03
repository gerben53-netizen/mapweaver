import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {zipSync,strToU8} from 'fflate'
const root=path.resolve('.asset-removal.local',String(Date.now())),base='http://127.0.0.1:48014',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const poll=async(fn,label='condition')=>{for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout: '+label)}
let service,health,browser,page,mapId
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api/v1'+url,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),'X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
const checks=[],errors=[],check=text=>{checks.push(text);console.log('PASS '+text)}
try{
 service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48014',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token}});service.stdout.resume();service.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===service.pid}catch{return false}},'service')
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto(base)
 await expect(page.getByRole('dialog',{name:'Create your first campaign'})).toBeVisible();page.once('dialog',d=>d.accept('Cartography acceptance'));await page.getByRole('button',{name:'New campaign',exact:true}).click()
 await page.getByRole('button',{name:'+ Map',exact:true}).click();const d=page.getByRole('dialog',{name:'New map',exact:true});await d.getByLabel('Name',{exact:true}).fill('The Amber Coast');await d.getByLabel('Map type',{exact:true}).selectOption('regional-map');await d.getByLabel('Width (px)').fill('1200');await d.getByLabel('Height (px)').fill('800');await d.getByLabel('Background color').fill('#dfdbc6');await d.getByRole('button',{name:'Create map',exact:true}).click();await expect(d).toHaveCount(0);await expect(page.locator('canvas').first()).toBeVisible();mapId=(await api('/startup-project')).id

 const img=await sharp({create:{width:40,height:40,channels:4,background:'#4c7549'}}).png().toBuffer()
 const manifest={schemaVersion:1,assets:[{file:'tree.png',type:'stamp',title:'Recovery tree',categoryPath:['Recovery pack','Trees'],tags:['Nature']}],collection:{title:'Recovery collection',description:'Acceptance'}}
 const zip=Buffer.from(zipSync({'tree.png':img,'mapweaver-assets.json':strToU8(JSON.stringify(manifest))}));const zipPath=path.join(root,'pack.zip');await fs.writeFile(zipPath,zip)
 const workspace=name=>page.getByRole('tab',{name,exact:true})
 const importPack=async()=>{
  await workspace('Asset library').click();await page.getByRole('button',{name:'Import assets',exact:true}).click()
  const modal=page.getByRole('dialog',{name:'Import assets — review before saving'})
  await modal.getByLabel('Import library files').setInputFiles(zipPath)
  await expect(modal.getByText('1 validated entries. No assets have been saved yet.')).toBeVisible()
  await modal.getByLabel('Create missing previewed categories').check();await modal.getByLabel('Explicitly map matching category paths to existing categories').check()
  await modal.getByRole('button',{name:'Review resolved changes',exact:true}).click();await modal.getByRole('button',{name:'Confirm import',exact:true}).click();await expect(modal).toHaveCount(0)
  await expect(page.getByText('0 selected / 1 results',{exact:true})).toBeVisible()
 }
 await importPack();const initial=await api('/library?type=stamp'),assetId=initial.assets[0].id,categoryId=initial.assets[0].categoryId,collectionId=initial.collections[0].id
 await workspace('Map editor').click();await page.getByRole('button',{name:'Place asset',exact:true}).click();const picker=page.getByRole('dialog',{name:'Choose a stamp'});await picker.getByRole('button',{name:'Choose Recovery tree',exact:true}).click();await picker.getByRole('button',{name:'Choose asset',exact:true}).click()
 const canvas=page.getByRole('region',{name:'Map canvas'});await canvas.click({position:{x:400,y:300}});await canvas.press('Escape');await page.getByRole('button',{name:'Save',exact:true}).click()
 await poll(async()=>(await api('/projects/'+mapId)).document.objects.length===1,'placed stamp')
 const selectAll=async()=>{await page.getByRole('button',{name:'Select all results',exact:true}).click();const summary=page.locator('summary').filter({hasText:'Actions for 1 selected assets'});if((await summary.locator('..').getAttribute('open'))===null)await summary.click();await page.getByRole('button',{name:'Remove assets…',exact:true}).click()}
 await workspace('Asset library').click();await expect(page.getByText('0 selected / 1 results',{exact:true})).toBeVisible();await selectAll();let modal=page.getByRole('dialog',{name:'Remove 1 assets'})
 await expect(modal.getByText(/Removal is blocked/)).toBeVisible();await expect(modal.getByText(/The Amber Coast/)).toBeVisible();await expect(modal.getByRole('button',{name:'Remove assets',exact:true})).toHaveCount(0);await modal.getByRole('button',{name:'Cancel'}).click();check('Saved/current map usage is named and blocks the entire batch')
 await workspace('Map editor').click();await canvas.focus();await canvas.press('Control+a');
 // Selection through the canvas, independent of browser select-all behavior.
 await canvas.click({position:{x:400,y:300}});await canvas.press('Control+c');await canvas.press('Delete');await page.getByRole('button',{name:'Save',exact:true}).click();await poll(async()=>(await api('/projects/'+mapId)).document.objects.length===0,'remove placement')
 await expect(page.getByRole('button',{name:/^Undo:/})).toBeEnabled()
 await workspace('Asset library').click();await selectAll();modal=page.getByRole('dialog',{name:'Remove 1 assets'});await expect(modal.getByText(/Related clipboard items/)).toBeVisible();await modal.getByRole('button',{name:'Remove assets',exact:true}).click();await expect(modal).toHaveCount(0)
 await expect(page.getByText('0 selected / 0 results',{exact:true})).toBeVisible();await expect(page.getByLabel('Search library')).toBeFocused();await expect(page.getByRole('status').filter({hasText:/1 assets removed/})).toBeVisible();await page.screenshot({path:path.join(root,'removed-1280.png')});check('Clipboard/history-only deletion succeeds, selection/results reset and focus returns to search')
 await workspace('Map editor').click();await canvas.focus();await canvas.press('Control+v');await canvas.press('Control+z');await page.getByRole('button',{name:'Save',exact:true}).click();assert.equal((await api('/projects/'+mapId)).document.objects.length,0);check('Paste and undo cannot resurrect deleted placements')
 await importPack();const final=await api('/library?type=stamp');assert.equal(final.assets.length,1);assert.equal(final.assets[0].id,assetId);assert.equal(final.assets[0].categoryId,categoryId);assert.deepEqual(final.assets[0].tags,['Nature']);assert.equal(final.collections.length,1);assert.equal(final.collections[0].id,collectionId);assert.equal((await api('/library?collection='+collectionId)).total,1);assert.deepEqual(await api('/library/usage','POST',{ids:[assetId]}),[]);await page.screenshot({path:path.join(root,'reimported-1280.png')});check('Same ZIP reimports exactly once, with original category/collection and no stale usage')
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'results.json'),JSON.stringify({checks,errors},null,2));console.log('EVIDENCE '+root)
} catch(error){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Evidence '+root);throw error}
finally{if(health){await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});await poll(()=>service.exitCode!==null,'stop').catch(()=>{})}await browser?.close();if(service?.exitCode===null)service.kill()}
