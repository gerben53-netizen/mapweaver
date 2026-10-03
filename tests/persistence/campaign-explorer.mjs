import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
const root=path.resolve('.campaign.local','acceptance-'+Date.now()),base='http://127.0.0.1:48012',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const child=spawn(process.execPath,['dist-service/main.js'],{cwd:process.cwd(),windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48012',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token}});child.stdout.resume();child.stderr.on('data',b=>process.stderr.write(b))
const poll=async(fn,label)=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout: '+label)}
let health,browser,page,campaignId
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api/v1'+url,{method,headers:{'Content-Type':'application/json','X-Mapweaver':'1','X-Mapweaver-Generation':health.generation,'X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
const tree=()=>page.getByRole('tree',{name:'Campaign maps'}),library=()=>page.getByRole('region',{name:'Map library'}),explorer=()=>page.getByRole('complementary',{name:'Campaign Explorer'})
const row=name=>tree().getByRole('treeitem',{name:new RegExp('^'+name+',')})
async function folder(name){page.once('dialog',d=>d.accept(name));await explorer().getByRole('button',{name:'+ Folder',exact:true}).click();await expect(row(name)).toBeVisible()}
async function createMap(name){await explorer().getByRole('button',{name:'+ Map',exact:true}).click();const d=page.getByRole('dialog',{name:'New map',exact:true});await d.getByLabel('Name',{exact:true}).fill(name);await d.getByRole('button',{name:'Create map',exact:true}).click();await expect(d).toHaveCount(0);await expect(page.getByRole('button',{name:'Save',exact:true})).toBeEnabled();await expect(page.locator('canvas').first()).toBeVisible()}
async function actions(name){await row(name).getByRole('button',{name:`Actions for ${name}`,exact:true}).click();return page.getByRole('dialog',{name:`Actions — ${name}`,exact:true})}
try{
 await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===child.pid}catch{return false}},'service')
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base)
 await expect(page.getByRole('dialog',{name:'Create your first campaign'})).toBeVisible();page.once('dialog',d=>d.accept('Campaign acceptance'));await page.getByRole('button',{name:'New campaign',exact:true}).click();await expect(explorer()).toBeVisible();await expect(library()).toContainText('No maps or folders here yet.')
 campaignId=(await api('/campaigns'))[0].id
 await folder('North');await row('North').getByRole('button',{name:'North',exact:true}).click();await folder('Town');await row('Town').focus();await page.keyboard.press('Enter');await createMap('Market map');const mapId=(await api('/startup-project')).id
 let snapshot=await api('/campaigns/'+campaignId);assert.equal(snapshot.nodes.find(n=>n.mapId===mapId).parentId,snapshot.nodes.find(n=>n.name==='Town').id)
 await expect(page.getByRole('navigation',{name:'Campaign breadcrumbs'})).toContainText('North');await page.screenshot({path:path.join(root,'editor.png')})
 let d=await actions('Market map');await d.getByRole('button',{name:'Favorite',exact:true}).click();await expect(d).toHaveCount(0);await explorer().getByRole('button',{name:'★ Favorites',exact:true}).click();await library().getByRole('button',{name:'Open map Market map',exact:true}).click();await expect(library()).toBeHidden()
 await explorer().getByRole('button',{name:'Recent',exact:true}).click();await expect(library()).toContainText('Campaign acceptance › North › Town');await library().getByRole('button',{name:'Open map Market map',exact:true}).click()
 await page.getByRole('navigation',{name:'Campaign breadcrumbs'}).getByRole('button',{name:'Town',exact:true}).click();await expect(library()).toBeVisible();await library().getByRole('button',{name:'Gallery',exact:true}).click();await page.screenshot({path:path.join(root,'gallery.png')})
 await createMap('Second map');await explorer().getByRole('searchbox',{name:'Search campaign'}).fill('Market');await expect(library()).toContainText('North › Town');await library().getByRole('button',{name:'Open map Market map',exact:true}).click();await poll(async()=>(await api('/startup-project')).id===mapId,'recent map acknowledged')
 await row('Market map').focus();page.once('dialog',d=>d.accept('Market revised'));await page.keyboard.press('F2');await expect(row('Market revised')).toBeVisible();await poll(async()=>(await api('/startup-project')).id===mapId,'recent map acknowledged')
 // Native drag moves the map into North; it changes metadata, not the document.
 const before=await api('/projects/'+mapId);await row('Market revised').dragTo(row('North'));await poll(async()=>{const snap=await api('/campaigns/'+campaignId);return snap.nodes.find(n=>n.mapId===mapId).parentId===snap.nodes.find(n=>n.name==='North').id},'map drag');assert.deepEqual(await api('/projects/'+mapId),before)
 d=await actions('Market revised');await d.getByLabel('Move to folder',{exact:true}).selectOption('');await d.getByRole('button',{name:'Move',exact:true}).click();await expect(d).toHaveCount(0);snapshot=await api('/campaigns/'+campaignId);assert.equal(snapshot.nodes.find(n=>n.mapId===mapId).parentId,null)
 await row('North').focus();await page.keyboard.press('ArrowLeft');await expect(row('Town')).toHaveCount(0);await page.keyboard.press('ArrowRight');await expect(row('Town')).toBeVisible()
 // Focus mode hides the explorer temporarily, retaining expansion state.
 await page.getByRole('button',{name:'Focus',exact:true}).click();await expect(explorer()).toBeHidden();await page.getByRole('button',{name:'Exit focus',exact:true}).click();await expect(explorer()).toBeVisible();await expect(row('Town')).toBeVisible()
 // Folder trash preserves descendants and can be restored.
 d=await actions('North');page.once('dialog',d=>d.accept());await d.getByRole('button',{name:'Move to Trash',exact:true}).click();await expect(row('North')).toHaveCount(0);await explorer().getByRole('button',{name:'Trash',exact:true}).click();await library().getByRole('button',{name:'Actions for North',exact:true}).click();d=page.getByRole('dialog',{name:'Actions — North',exact:true});await d.getByRole('button',{name:'Restore',exact:true}).click();await expect(row('North')).toBeVisible()
 // Persisted navigation, favorites and direct startup reopen.
 await row('Market revised').getByRole('button',{name:'Market revised',exact:true}).click();await page.reload();await expect(explorer()).toBeVisible();await expect(row('Market revised')).toHaveAttribute('aria-current','page');await expect(page.getByRole('dialog')).toHaveCount(0)
 // Existing portable maps still import into the selected campaign with their assets.
 await page.getByLabel('Mapweaver project file').setInputFiles(path.resolve('public/examples/prefabs/house.mapweaver'))
 await poll(async()=>(await api('/startup-project')).id!==mapId,'existing map import')
 const importedId=(await api('/startup-project')).id,imported=await api('/projects/'+importedId)
 assert(imported.document.assets.length>0);assert((await api('/campaigns/'+campaignId)).nodes.some(n=>n.mapId===importedId));await expect(page.getByRole('button',{name:'Save',exact:true})).toBeEnabled()
 // Exercise a large metadata-only tree: no document reads are needed for browsing/search.
 const template=(await api('/projects/'+mapId)).document
 let large=await api('/campaigns/'+campaignId)
 for(let i=0;i<120;i++)large=await api('/campaigns/'+campaignId+'/command','POST',{revision:large.campaign.revision,op:'folder',name:'Location '+i})
 for(let i=0;i<180;i++)await api('/projects?campaignId='+campaignId,'POST',{...template,name:'Survey '+i})
 let documentReads=0;page.on('request',r=>{if(r.method()==='GET'&&/\/api\/v1\/projects\/[a-zA-Z0-9_-]+$/.test(r.url()))documentReads++})
 await explorer().getByRole('button',{name:'Refresh',exact:true}).click();await expect(row('Survey 179')).toBeVisible();const start=Date.now();await explorer().getByRole('searchbox',{name:'Search campaign'}).fill('Survey 17');await expect(library().getByRole('button',{name:/Open map Survey /})).toHaveCount(11);const searchMs=Date.now()-start;assert.equal(documentReads,0)
 await fs.writeFile(path.join(root,'performance.json'),JSON.stringify({nodes:(await api('/campaigns/'+campaignId)).nodes.length,searchMs,documentReads},null,2))
 assert.deepEqual(errors,[]);await page.screenshot({path:path.join(root,'reopened.png')});console.log('PASS '+root)
 await fs.writeFile(path.join(root,'results.json'),JSON.stringify({createCampaign:true,nestedFolders:true,contextualMaps:true,breadcrumbs:true,favorites:true,recents:true,search:true,gallery:true,rename:true,drag:true,keyboardMove:true,focus:true,trashRestore:true,reopen:true,errors},null,2))
} catch(error){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Evidence '+root);throw error}
finally{if(health){await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});await poll(()=>child.exitCode!==null,'stop').catch(()=>{})}await browser?.close();if(child.exitCode===null)child.kill()}
