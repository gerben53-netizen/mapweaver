import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
const root=path.resolve('.title-banners.local',String(Date.now())),base='http://127.0.0.1:48018',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const poll=async(fn,label='condition')=>{for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout: '+label)}
let service,health,browser,page,mapId
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api/v1'+url,{method,headers:{'Content-Type':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
const checks=[],errors=[],check=text=>{checks.push(text);console.log('PASS '+text)}
try{
 service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48018',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token}});service.stdout.resume();service.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===service.pid}catch{return false}},'service')
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto(base)
 await expect(page.getByRole('dialog',{name:'Create your first campaign'})).toBeVisible();page.once('dialog',d=>d.accept('Cartography acceptance'));await page.getByRole('button',{name:'New campaign',exact:true}).click()
 await page.getByRole('button',{name:'+ Map',exact:true}).click();const d=page.getByRole('dialog',{name:'New map',exact:true});await d.getByLabel('Name',{exact:true}).fill('The Amber Coast');await d.getByLabel('Map type',{exact:true}).selectOption('regional-map');await d.getByLabel('Width (px)').fill('1200');await d.getByLabel('Height (px)').fill('800');await d.getByLabel('Background color').fill('#dfdbc6');await d.getByRole('button',{name:'Create map',exact:true}).click();await expect(d).toHaveCount(0);await expect(page.locator('canvas').first()).toBeVisible();mapId=(await api('/startup-project')).id

 const doc=async()=>(await api('/projects/'+mapId)).document,canvas=page.getByRole('region',{name:'Map canvas'}),props=page.getByRole('region',{name:'Object properties'})
 const numeric=async(name,value)=>{await props.getByRole('spinbutton',{name,exact:true}).fill(String(value));await props.getByRole('spinbutton',{name,exact:true}).press('Tab')}
 const names=['Ribbon Banner','Parchment Banner','Ornate Fantasy Cartouche','Region Nameplate'],ids=['ribbon','scroll','fantasy','plaque']
 for(let i=0;i<4;i++){
  await page.getByRole('button',{name:'Map Elements',exact:true}).click();await page.getByRole('button',{name:'Title / Cartouche',exact:true}).click();await page.getByRole('region',{name:'Map workspace',exact:true}).getByRole('button',{name:'Preview title styles…'}).click()
  const dialog=page.getByRole('dialog',{name:'Title styles'});await expect(dialog.getByRole('button',{name:names[i],exact:true})).toBeVisible()
  await expect(dialog.locator('canvas[data-ready=true]')).toHaveCount(9);if(i===0){await dialog.getByRole('button',{name:'Ribbon Banner',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(dialog.getByRole('button',{name:'Parchment Banner',exact:true})).toBeFocused();await page.screenshot({path:path.join(root,'preset-picker.png')})}
  await dialog.getByRole('button',{name:names[i],exact:true}).click();await page.getByRole('button',{name:'Fit to map',exact:true}).click();const b=await canvas.boundingBox(),zoom=parseFloat(await page.getByLabel('Zoom level').innerText())/100
  await page.mouse.click(b.x+b.width/2+((i%2?900:300)-600)*zoom,b.y+b.height/2+((i<2?230:560)-400)*zoom)
  await props.getByLabel('Element title').fill(['The Amber Coast','Beyond the Northern Sea','The Elder Kingdoms','Westhaven'][i]);await props.getByLabel('Subtitle',{exact:true}).fill('A traveller’s atlas')
  if(i===0){await props.getByLabel('Element title').fill('W'.repeat(120));await expect(props.getByText(/Text does not fit/)).toBeVisible();await props.getByLabel('Element title').fill('The Amber Coast');await props.getByLabel('Element style preset').selectOption('scroll');await expect(props.getByLabel('Element title')).toHaveValue('The Amber Coast');await props.getByLabel('Element style preset').selectOption('ribbon')}
  await numeric('Element width',500);if(i===3){await props.locator('summary').filter({hasText:'Frame and placement'}).click();await numeric('Opacity',.5)}await props.getByRole('button',{name:'Apply properties',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();await poll(async()=>(await doc()).objects.length===i+1,'saved title')
 }
 check('Four vector carriers placed through existing Title flow; preview keyboard navigation and text-preserving style changes work')
 const saved=await doc();assert.deepEqual(saved.objects.map(o=>o.elementPreset),ids);assert(saved.objects.every(o=>o.kind==='title'&&o.body==='A traveller’s atlas'&&o.width===500));assert.equal((await api('/library?type=stamp')).assets.length,0)
 await page.screenshot({path:path.join(root,'titles-editor.png')})
 const download=async filename=>{await page.getByRole('button',{name:'Export PNG',exact:true}).click();const d=page.getByRole('dialog',{name:'Export PNG',exact:true});await d.getByLabel('Include grid',{exact:true}).uncheck();await d.getByLabel('Include corner scale bar',{exact:true}).uncheck();await d.getByLabel('Transparent canvas background').check();const pending=page.waitForEvent('download');await d.getByRole('button',{name:'Download PNG',exact:true}).click();await(await pending).saveAs(path.join(root,filename));await d.getByRole('button',{name:'Close',exact:true}).click()}
 await download('selected.png');await canvas.focus();await page.keyboard.press('Escape');await download('unselected.png');const a=await sharp(path.join(root,'selected.png')).ensureAlpha().raw().toBuffer(),b=await sharp(path.join(root,'unselected.png')).ensureAlpha().raw().toBuffer();assert(a.equals(b));assert.equal(a[3],0);const last=saved.objects[3],alpha=a[(Math.floor(last.y+last.height*.3)*1200+Math.floor(last.x+last.width*.16))*4+3];assert(Math.abs(alpha-128)<=1,'50% carrier paper opacity');for(const o of saved.objects){const x=Math.floor(o.x),y=Math.floor(o.y);assert.equal(a[(y*1200+x)*4+3],0,'carrier corner stays transparent')}assert(a.some((v,i)=>i%4===3&&v>0));check('PNG paints frame and editable text, preserves transparent canvas, and is pixel-identical with selection off')
 await page.reload();await expect(canvas).toBeVisible();assert.deepEqual((await doc()).objects,saved.objects);check('Title content, carrier IDs, proportional size and typography survive save/reload with no library assets')
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'results.json'),JSON.stringify({checks,errors},null,2));console.log('EVIDENCE '+root)
} catch(error){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Evidence '+root);throw error}
finally{if(health){await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});await poll(()=>service.exitCode!==null,'stop').catch(()=>{})}await browser?.close();if(service?.exitCode===null)service.kill()}
