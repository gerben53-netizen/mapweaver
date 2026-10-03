import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {zipSync,strToU8} from 'fflate'
import AxeBuilder from '@axe-core/playwright'
const root=path.resolve('.visual-hierarchy.local',String(Date.now())),base='http://127.0.0.1:48017',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const poll=async(fn,label='condition')=>{for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout: '+label)}
let service,health,browser,page
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api/v1'+url,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),'X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
const checks=[],errors=[],check=text=>{checks.push(text);console.log('PASS '+text)}
try{
 service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48017',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token}});service.stdout.resume();service.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===service.pid}catch{return false}},'service')
 browser=await chromium.launch({channel:'chrome',headless:true});page=await (await browser.newContext({viewport:{width:1280,height:720}})).newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto(base)
 await expect(page.getByRole('dialog',{name:'Create your first campaign'})).toBeVisible();page.once('dialog',d=>d.accept('Cartography acceptance'));await page.getByRole('button',{name:'New campaign',exact:true}).click()
 await page.getByRole('button',{name:'+ Map',exact:true}).click();const d=page.getByRole('dialog',{name:'New map',exact:true});await d.getByLabel('Name',{exact:true}).fill('The Amber Coast');await d.getByLabel('Map type',{exact:true}).selectOption('regional-map');await d.getByLabel('Width (px)').fill('1200');await d.getByLabel('Height (px)').fill('800');await d.getByLabel('Background color').fill('#dfdbc6');await d.getByRole('button',{name:'Create map',exact:true}).click();await expect(d).toHaveCount(0);await expect(page.locator('canvas').first()).toBeVisible()

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

 const theme = await page.evaluate(() => {
   return Object.fromEntries(['selected','selected-hover','hover','focus','active-text','danger','muted'].map(name=>{
     const probe=document.createElement('span');probe.style.color=`var(--color-${name})`;document.body.append(probe);const rgb=getComputedStyle(probe).color;probe.remove();return [name,rgb]
   }))
 })
 const bg=locator=>locator.evaluate(el=>getComputedStyle(el).backgroundColor)
 const screenshot=async name=>page.screenshot({path:path.join(root,name+'.png')})
 const contrastResults=[]
 const contrastCheck=async name=>{
   const result=await new AxeBuilder({page}).withRules(['color-contrast']).analyze()
   contrastResults.push({name,violations:result.violations,incomplete:result.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))})
   await fs.writeFile(path.join(root,'contrast.json'),JSON.stringify(contrastResults,null,2))
   assert.equal(result.violations.length,0,`${name}: ${result.violations.map(v=>v.nodes.map(n=>n.target).join(',')).join(';')}`)
 }
 const nav=workspace('Map editor'),rail=page.getByRole('navigation',{name:'Map tools'}),select=rail.getByRole('button',{name:'Select',exact:true})
 await expect(nav).toHaveAttribute('aria-selected','true');assert.equal(await bg(nav),theme.selected)
 assert.equal(await bg(select),theme.selected);await select.hover();assert.equal(await bg(select),theme['selected-hover'])
 const area=rail.getByRole('button',{name:'Area',exact:true});await area.hover();assert.equal(await bg(area),theme.hover)
 await area.click();await expect(area).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(area).toBeFocused()
 assert.equal(await area.evaluate(el=>getComputedStyle(el).outlineColor),theme.focus);assert.equal(await area.evaluate(el=>getComputedStyle(el).outlineStyle),'solid')
 await screenshot('active-tool-keyboard-focus');await select.click();await page.mouse.move(600,600);await screenshot('editor-1280');const activeLayer=page.getByRole('tree',{name:'Layer tree'}).getByRole('treeitem',{selected:true});await expect(activeLayer).toHaveCount(1);assert.equal(await bg(activeLayer),theme.selected);await contrastCheck('Editor');check('Primary navigation, active rail, hover and keyboard focus have distinct computed styles')
 const tree=page.getByRole('treeitem',{name:/The Amber Coast/});await expect(tree).toHaveAttribute('aria-current','page');await tree.getByRole('button',{name:'The Amber Coast',exact:true}).click();await expect(tree).toHaveAttribute('aria-selected','true');await page.mouse.move(600,600);assert.equal(await bg(tree),theme.selected);await tree.hover();assert.equal(await bg(tree),theme['selected-hover']);assert.notEqual(await tree.evaluate(el=>getComputedStyle(el).boxShadow),'none');check('Campaign selection retains its tint on hover and open-map edge remains separate')
 page.once('dialog',d=>d.accept('Reference maps'));await page.getByRole('button',{name:'+ Folder',exact:true}).click();const folder=page.getByRole('treeitem',{name:/Reference maps/});await folder.getByRole('button',{name:'Reference maps',exact:true}).click();await expect(folder).toHaveAttribute('aria-selected','true');await expect(tree).toHaveAttribute('aria-selected','false');await expect(tree).toHaveAttribute('aria-current','page');await page.mouse.move(600,600);assert.equal(await bg(folder),theme.selected);assert.notEqual(await bg(tree),theme.selected);await screenshot('campaign-folder-1280');await contrastCheck('Campaign folder');await page.getByRole('button',{name:'Return to map',exact:true}).click();check('Selected folder and current open map remain independently identifiable')
 await importPack();const card=page.getByRole('button',{name:/^Recovery tree/});await card.click();await expect(card).toHaveAttribute('aria-pressed','true');await page.mouse.move(600,650);assert.equal(await bg(card),theme.selected);await card.hover();assert.equal(await bg(card),theme['selected-hover']);await screenshot('library-1280');await contrastCheck('Asset library')
 const bulk=page.locator('summary').filter({hasText:'Actions for 1 selected assets'});await bulk.click();const remove=page.getByRole('button',{name:'Remove assets…',exact:true});await expect(remove).toHaveClass(/destructive/);assert.equal(await remove.evaluate(el=>getComputedStyle(el).color),theme.danger)
 await remove.click();await screenshot('destructive-dialog');await contrastCheck('Remove assets dialog');await page.getByRole('dialog',{name:'Remove 1 assets'}).getByRole('button',{name:'Cancel'}).click();check('Library selected card, bulk actions and destructive confirmation share the theme')
 await workspace('Map editor').click();await page.getByRole('button',{name:'Place asset',exact:true}).click();const picker=page.getByRole('dialog',{name:'Choose a stamp'});await picker.getByRole('button',{name:'Choose Recovery tree',exact:true}).click();await picker.getByRole('button',{name:'Choose asset',exact:true}).click()
 const canvas=page.getByRole('region',{name:'Map canvas'});await canvas.click({position:{x:300,y:250}});await select.click();await canvas.click({position:{x:300,y:250}})
 const properties=page.getByRole('tab',{name:'Properties',exact:true});await properties.click();await page.mouse.move(600,650);assert.equal(await bg(properties),theme.selected);await expect(page.getByRole('region',{name:'Object properties'})).toBeVisible();await screenshot('properties-1280');await contrastCheck('Properties')
 await page.getByRole('tab',{name:'Objects',exact:true}).click();const object=page.getByRole('listbox',{name:'Map objects'}).getByRole('option',{selected:true});await expect(object).toHaveCount(1);assert.equal(await bg(object),theme.selected);await object.hover();assert.equal(await bg(object),theme['selected-hover']);await screenshot('objects-1280');await contrastCheck('Objects');check('Properties and Objects preserve selection and current inspector state')
 await page.getByRole('button',{name:'Save',exact:true}).click();const saved=page.locator('[data-save-state=saved]');await expect(saved).toHaveText('Saved');assert.equal(await saved.evaluate(el=>getComputedStyle(el).color),theme.muted)
 await page.getByRole('button',{name:'Projects',exact:true}).click();await expect(page.getByRole('button',{name:'Open campaign Cartography acceptance',exact:true})).toBeVisible();await screenshot('projects-dialog');await contrastCheck('Projects');check('Saved status stays neutral and Projects dialog contrast passes')
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'results.json'),JSON.stringify({checks,errors,contrastScreens:contrastResults.map(r=>r.name)},null,2));console.log('EVIDENCE '+root)
} catch(error){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Evidence '+root);throw error}
finally{if(health){await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});await poll(()=>service.exitCode!==null,'stop').catch(()=>{})}await browser?.close();if(service?.exitCode===null)service.kill()}
