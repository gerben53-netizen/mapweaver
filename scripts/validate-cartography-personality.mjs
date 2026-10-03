import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import AxeBuilder from '@axe-core/playwright'
const phase=process.argv[2]||'before',out=path.resolve('deliverables.local/Cartography-Personality',phase),root=path.resolve('.qa.local/cartography-personality',String(Date.now()))
await fs.mkdir(out,{recursive:true});await fs.mkdir(root,{recursive:true})
const base='http://127.0.0.1:48058',web='http://127.0.0.1:5198',token=crypto.randomUUID(),pause=ms=>new Promise(r=>setTimeout(r,ms))
let health,browser,page
const service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'ignore',env:{...process.env,MAPWEAVER_PORT:'48058',MAPWEAVER_DATA_DIR:root+'/data',MAPWEAVER_CONTROL_TOKEN:token,MAPWEAVER_DEV_ORIGIN:web}})
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5198','--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,MAPWEAVER_PORT:'48058'}})
const api=async(u,method='GET',body)=>{const r=await fetch(base+'/api/v1'+u,{method,headers:{'Content-Type':Buffer.isBuffer(body)?'application/zip':'application/json','X-Mapweaver':'1','X-Mapweaver-Control':token,'X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});if(!r.ok)throw Error(await r.text());return r.json()}
const results={phase,checks:[],contrast:[],layout:[],errors:[]}
try{
 for(let i=0;i<150;i++){try{health=await fetch(base+'/api/v1/health').then(r=>r.json());if(health.pid===service.pid&&(await fetch(web)).ok)break}catch{/* Wait for the isolated service. */}await pause(200)}
 assert.equal(health?.pid,service.pid)
 browser=await chromium.launch({channel:'chrome',headless:true});page=await (await browser.newContext({viewport:{width:1280,height:720}})).newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>results.errors.push(e.message))
 await page.goto(web);await page.getByRole('dialog',{name:'Create your first campaign'}).waitFor();page.once('dialog',d=>d.accept('Cartography studio'));await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.getByRole('button',{name:'+ Map',exact:true}).waitFor()
 const row=await api('/projects/import','POST',await fs.readFile('deliverables.local/Bathymetry-Study/velanth-after.mapweaver'))
 await page.evaluate(async id=>{await(await import('/src/projects/localSession.ts')).loadLocalProject(id,()=>true)},row.id)
 await page.getByRole('region',{name:'Map canvas'}).waitFor();await page.evaluate(async()=>{await document.fonts.ready});await pause(2500)
 const snapshot=await page.evaluate(async()=>JSON.stringify((await import('/src/projects/session.ts')).currentSnapshot()))
 const rail=page.getByRole('navigation',{name:'Map tools'}),tab=n=>page.getByRole('tab',{name:n,exact:true})
 const shot=async(name,width)=>{await page.mouse.move(10,10);await pause(250);await page.screenshot({path:out+'/'+name+'-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width===1280){const r=await new AxeBuilder({page}).withRules(['color-contrast']).analyze();results.contrast.push({name,violations:r.violations,incomplete:r.incomplete.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))})}}
 // Use the existing production pack for representative creative thumbnails.
 await tab('Asset library').click();await page.getByRole('button',{name:'Import assets',exact:true}).click();const modal=page.getByRole('dialog',{name:'Import assets — review before saving'})
 await modal.getByLabel('Import library files').setInputFiles('public/world-assets/mapweaver-world-engraved.zip');await modal.getByText(/validated entries\. No assets/).waitFor()
 await modal.getByLabel('Create missing previewed categories').check();await modal.getByLabel('Explicitly map matching category paths to existing categories').check();await modal.getByRole('button',{name:'Review resolved changes',exact:true}).click();await modal.getByRole('button',{name:'Confirm import',exact:true}).click();await expect(modal).toHaveCount(0)
 await expect(page.locator('[class*="results"][aria-busy]')).toHaveAttribute('aria-busy','false');await pause(300)
 const card=page.getByRole('button',{name:/^Active volcano 640/});await card.waitFor();await card.click();await expect(card).toHaveAttribute('aria-pressed','true')
 for(const width of [1280,1600]){
  await page.setViewportSize({width,height:width===1280?720:1000})
  await tab('Asset library').click();await shot('asset-library',width)
  await tab('Map editor').click();await tab('Layers').click();await rail.getByRole('button',{name:'Land / Water',exact:true}).click();await page.getByRole('button',{name:'Fit to map',exact:true}).click();await shot('active-tool',width)
  const rect=await page.getByRole('region',{name:'Map canvas'}).boundingBox();assert(rect.width>450&&rect.height>220,'Canvas lost usable space');results.layout.push({width,canvas:rect})
  await rail.getByRole('button',{name:'Water Depth',exact:true}).click();await page.getByRole('button',{name:'Fit to map',exact:true}).click();await shot('brush-context',width)
  await rail.getByRole('button',{name:'Select',exact:true}).click()
  await page.evaluate(async()=>{const {useProjectStore}=await import('/src/store/projectStore.ts'),{useEditorStore}=await import('/src/store/editorStore.ts');const s=useProjectStore.getState();const o=s.objects.find(o=>o.kind==='place')||s.objects.find(o=>o.kind==='stamp');useEditorStore.setState({selectedObjectIds:[o.id],activeLayerId:o.layerId,inspector:'properties',inspectorCollapsed:false})})
  await tab('Properties').click();await shot('properties',width)
  await rail.getByRole('button',{name:'Place marker',exact:true}).click();const wizard=page.getByRole('dialog',{name:'Create map marker'});await wizard.waitFor();await expect(wizard.getByLabel('Marker name')).toBeFocused();await shot('marker-wizard',width);await page.keyboard.press('Escape');await expect(wizard).toHaveCount(0);await expect(rail.getByRole('button',{name:'Place marker',exact:true})).toBeFocused()
  await page.evaluate(async()=>{(await import('/src/store/editorStore.ts')).useEditorStore.setState({selectedObjectIds:[],inspector:'layers'})})
  if(width===1280){page.once('dialog',d=>d.accept('Expedition maps'));await page.getByRole('button',{name:'+ Folder',exact:true}).click()}
  const folder=page.getByRole('treeitem',{name:/Expedition maps/});await folder.getByRole('button',{name:'Expedition maps',exact:true}).click();await expect(folder).toHaveAttribute('aria-selected','true');await shot('campaign-explorer',width);await page.getByRole('button',{name:'Return to map',exact:true}).click()
 }
 await page.setViewportSize({width:1280,height:720});const active=rail.getByRole('button',{name:'Water Depth',exact:true});await active.click();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(active).toBeFocused()
 await page.mouse.move(10,10);await pause(250)
 const focus=await active.evaluate(el=>({outline:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth,shadow:getComputedStyle(el).boxShadow}));assert.equal(focus.outline,'solid');assert.equal(focus.width,'2px');await page.screenshot({path:out+'/keyboard-focus.png'})
 if(phase==='after'){
   const states=await page.evaluate(()=>{const token=name=>{const e=document.createElement('span');e.style.color='var(--color-'+name+')';document.body.append(e);const c=getComputedStyle(e).color;e.remove();return c};const active=document.querySelector('[aria-label="Map tools"] [aria-pressed=true]'),slider=document.querySelector('[aria-label="Water softness"]');return{brass:token('brass'),focus:token('focus'),accent:token('accent'),selected:token('selected'),hover:token('hover'),activeBg:getComputedStyle(active).backgroundColor,activeEdge:getComputedStyle(active).boxShadow,outline:getComputedStyle(active).outlineColor,slider:getComputedStyle(slider).accentColor}})
   assert.equal(states.activeBg,states.selected);assert(states.activeEdge.includes(states.brass));assert.equal(states.outline,states.focus);assert.notEqual(states.focus,states.brass);assert.equal(states.slider,states.accent)
   const neutral=rail.getByRole('button',{name:'Select',exact:true});await neutral.hover();await pause(250);assert.equal(await neutral.evaluate(e=>getComputedStyle(e).backgroundColor),states.hover);results.visualStates=states
  }
 await page.emulateMedia({reducedMotion:'reduce'});const motion=await active.evaluate(el=>getComputedStyle(el).transitionDuration);if(phase==='after')assert(motion==='0s'||motion==='0.01s');results.reducedMotion=motion
 const current=await page.evaluate(async()=>JSON.stringify((await import('/src/projects/session.ts')).currentSnapshot()));assert.equal(current,snapshot,'Visual workflows changed map content')
 results.checks.push('Representative library import and selection','Tool activation, wizard focus and Escape','Independent campaign folder selection/current map','1280×720 and 1600×1000 no horizontal overflow; usable canvas','Keyboard focus distinct on active tool','Map content unchanged')
 assert.deepEqual(results.errors,[]);await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));if(phase==='after')assert.equal(results.contrast.reduce((n,r)=>n+r.violations.length,0),0,'Contrast violations; inspect results.json')
 console.log(out);console.log(JSON.stringify({checks:results.checks,contrast:results.contrast.map(r=>({name:r.name,violations:r.violations.length})),layout:results.layout}))
}catch(e){await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));throw e}
finally{if(health?.pid===service.pid)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});await browser?.close();vite.kill();service.kill()}
