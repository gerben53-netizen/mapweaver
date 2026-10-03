import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve('.qa.local/new-map-themes'), out = path.resolve('deliverables.local/New-Map-Themes')
await fs.mkdir(out,{recursive:true})
const data = root + '/data-' + Date.now()
const web = 'http://127.0.0.1:5202', base = 'http://127.0.0.1:48061', token = crypto.randomUUID()
const service = spawn(process.execPath, ['dist-service/main.js'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48061', MAPWEAVER_DATA_DIR: data, MAPWEAVER_CONTROL_TOKEN: token, MAPWEAVER_DEV_ORIGIN: web } })
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5202', '--strictPort'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48061' } })
const pause = ms => new Promise(r => setTimeout(r, ms))
let h, browser
const api = async (u, method = 'GET', body) => {
  const r = await fetch(base + '/api/v1' + u, { method, headers: { 'Content-Type': Buffer.isBuffer(body) ? 'application/zip' : 'application/json', 'X-Mapweaver': '1', 'X-Mapweaver-Instance': h.instanceId, 'X-Mapweaver-Generation': h.generation, 'X-Mapweaver-Control': token }, ...(body === undefined ? {} : { body: Buffer.isBuffer(body) ? body : JSON.stringify(body) }) })
  if (!r.ok) throw Error(await r.text()); return r.json()
}

try {
 for(let i=0;i<100;i++){try{h=await fetch(base+'/api/v1/health').then(r=>r.json());if(h.pid===service.pid&&(await fetch(web)).ok)break}catch{/* Local helpers may still be starting. */}await pause(300)}
 if(h?.pid!==service.pid)throw Error('Isolated service did not start')
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)})
 await page.goto(web);await page.getByRole('button',{name:'New campaign',exact:true}).waitFor();page.once('dialog',d=>d.accept('Theme wizard validation'));await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.getByRole('button',{name:'+ Map',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'New map',exact:true});await dialog.getByLabel('Map type',{exact:true}).selectOption('world-map')
 if(await dialog.getByRole('radio',{name:/Painterly Fantasy/}).getAttribute('aria-checked')!=='true')throw Error('Wrong World default')
 const themes=await page.evaluate(async()=>Object.values((await import('/src/domain/worldThemes.ts')).WORLD_MAP_THEMES).map(t=>({id:t.id,name:t.name})))
 const performance=[]
 for(const t of themes){const card=dialog.getByRole('radio',{name:new RegExp(t.name.split(' / ')[0])});await card.scrollIntoViewIfNeeded();await card.click();await card.getByRole('img').waitFor({timeout:30000});await card.evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:out+'/'+t.id+'-selected-1280.png'});await card.screenshot({path:out+'/'+t.id+'-card.png'});const result=await page.evaluate(async id=>{const {themePreview}=await import('/src/world/themePreview.ts');const a=performance.now(),p=themePreview(id),q=themePreview(id),v=await p;return {...v,cachedMs:performance.now()-a,samePromise:p===q}},t.id);await fs.writeFile(out+'/'+t.id+'.png',Buffer.from(result.url.split(',')[1],'base64'));performance.push({id:t.id,renderMs:result.milliseconds,cachedMs:result.cachedMs,samePromise:result.samePromise,warning:result.warning})}
 const painterly=dialog.getByRole('radio',{name:/Painterly Fantasy/});await painterly.focus();await page.keyboard.press('ArrowRight');if(await dialog.getByRole('radio',{name:/Classic Parchment/}).getAttribute('aria-checked')!=='true')throw Error('Arrow selection failed');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Space')
 await dialog.getByLabel('Name',{exact:true}).fill('Themed blank');await dialog.getByLabel('Width (px)').fill('800');await dialog.getByLabel('Height (px)').fill('600');await dialog.evaluate(d=>d.scrollTop=0);await page.screenshot({path:out+'/new-map-world-1280.png'})
 await dialog.getByRole('button',{name:'Create map',exact:true}).click();await dialog.waitFor({state:'hidden'})
 const blank=await page.evaluate(async()=>{const {useProjectStore}=await import('/src/store/projectStore.ts'),{useProjectSession}=await import('/src/projects/session.ts');return {map:useProjectStore.getState().map,objects:useProjectStore.getState().objects,id:useProjectSession.getState().info.id}})
 if(blank.map.theme?.id!=='world.painterlyFantasy'||blank.objects.length||blank.map.grid.visible)throw Error('Blank initialization failed')
 await page.evaluate(async id=>{await(await import('/src/projects/localSession.ts')).loadLocalProject(id,()=>true)},blank.id)
 const persisted=await page.evaluate(async()=> (await import('/src/store/projectStore.ts')).useProjectStore.getState().map)
 if(JSON.stringify(persisted)!==JSON.stringify(blank.map))throw Error('Reload changed theme')
 // Open the real existing theme dialog through the Map inspector.
 await page.evaluate(async()=>{const {useEditorStore}=await import('/src/store/editorStore.ts');useEditorStore.setState({inspectorCollapsed:false,inspector:'map'})})
 const choose=page.getByRole('button',{name:'Choose visual theme',exact:true});await choose.click();const change=page.getByRole('dialog',{name:'Visual theme',exact:true});await change.getByRole('img',{name:'Painterly Fantasy miniature map'}).waitFor();await page.screenshot({path:out+'/existing-theme-dialog-1280.png'});await change.getByRole('button',{name:'Cancel',exact:true}).click()
 await page.evaluate(async()=>{(await import('/src/campaigns/session.ts')).useCampaignStore.setState({newMap:true})});await dialog.waitFor();await dialog.getByLabel('Name',{exact:true}).fill('Generated themed map');await dialog.getByRole('radio',{name:'Generate world',exact:true}).click();await dialog.getByRole('button',{name:'Continue to world preview'}).click()
 const generator=page.getByRole('dialog',{name:'Generate world map',exact:true});if(await generator.getByLabel('Visual style').inputValue()!=='world.painterlyFantasy')throw Error('Theme not passed into generator')
 await generator.getByRole('button',{name:'Generate preview',exact:true}).click();await generator.getByRole('button',{name:'Create generated map',exact:true}).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('dialog button')].some(b=>b.textContent==='Create generated map'&&!b.disabled),{timeout:30000});await page.screenshot({path:out+'/generated-preview-1280.png'});await generator.getByRole('button',{name:'Create generated map',exact:true}).click();await generator.waitFor({state:'hidden'})
 const generated=await page.evaluate(async()=>{const {useProjectStore}=await import('/src/store/projectStore.ts');return {id:useProjectStore.getState().map.theme?.id,objects:useProjectStore.getState().objects.length}})
 if(generated.id!=='world.painterlyFantasy'||!generated.objects)throw Error('Generated theme not persisted')
 // All missing illustration sources retain native terrain, text and symbols.
 const fallback=await browser.newPage();await fallback.route('**/assets/*.png',r=>r.abort());await fallback.goto(web);const degraded=await fallback.evaluate(async()=> (await import('/src/world/themePreview.ts')).themePreview('world.painterlyFantasy'));if(!degraded.warning)throw Error('Missing image fallback not reported');await fs.writeFile(out+'/missing-assets-fallback.png',Buffer.from(degraded.url.split(',')[1],'base64'));await fallback.close()
 await fs.writeFile(out+'/validation.json',JSON.stringify({viewport:[1280,720],blank:{theme:blank.map.theme.id,reloadIdentical:true},generated,keyboard:true,performance,fallbackWarning:degraded.warning,errors},null,2));console.log(JSON.stringify({generated,performance,errors}));if(errors.length)throw Error(errors.join('; '))
}catch(e){const p=browser?.contexts()[0]?.pages()[0];if(p){await p.screenshot({path:out+'/failure.png'});console.log(await p.locator('body').innerText())}throw e}finally{if(h?.pid===service.pid)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});await browser?.close();vite.kill();service.kill()}
