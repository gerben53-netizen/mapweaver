import {chromium} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve('.ux-selection.local',String(Date.now())),base='http://127.0.0.1:48009',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const poll=async fn=>{for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out')}
let service,health,browser,page
const headers=()=>({'Content-Type':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token})
const api=async(url,options={})=>{const r=await fetch(base+'/api/v1'+url,{...options,headers:{...headers(),...options.headers}});assert(r.ok,await r.clone().text());return r.json()}
const checks=[],errors=[],check=text=>{checks.push(text);console.log('PASS '+text)}
try{
 service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48009',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token}});service.stdout.resume();service.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===service.pid}catch{return false}})
 const imported=await api('/projects/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:await fs.readFile('public/examples/prefabs/house.mapweaver')})
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(45000);page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Open Prefab house demonstration',exact:true}).click()

 const canvas=page.getByRole('region',{name:'Map canvas'}),props=page.getByRole('region',{name:'Object properties'}),list=page.getByRole('listbox',{name:'Map objects'})
 await page.getByRole('tab',{name:'Objects',exact:true}).click();await list.getByRole('option').filter({has:page.getByText('Furniture',{exact:true})}).click();await page.getByRole('tab',{name:'Properties',exact:true}).click();await props.getByRole('button',{name:'Ungroup - keep objects'}).click()
 await page.getByRole('tab',{name:'Objects',exact:true}).click();await list.getByRole('option').filter({has:page.getByText('Furniture',{exact:true})}).click()
 const objectsPanel=page.getByRole('region',{name:'Objects',exact:true})
 assert.equal(await list.getByRole('option',{selected:true}).count(),1);assert.match(await list.getByRole('option',{selected:true}).innerText(),/✓/)
 for(const name of ['Duplicate','Delete','Copy','Edit selection properties','Group selection'])assert.equal(await objectsPanel.getByRole('button',{name,exact:true}).count(),0)
 await page.screenshot({path:path.join(root,'objects-1280.png')});check('Objects browser: unmistakable selection and no duplicate editing controls')
 await page.getByRole('tab',{name:'Properties',exact:true}).click();assert(await props.getByRole('heading',{name:'Furniture',exact:true}).isVisible());assert(await props.getByRole('spinbutton',{name:'Width',exact:true}).isVisible());assert.equal(await props.getByRole('heading',{name:'Transform',exact:true}).count(),1)
 for(const name of ['Group','Align','Distribute'])assert.equal(await props.getByRole('heading',{name,exact:true}).count(),0)
 assert.equal(await props.locator('details').getAttribute('open'),null);await page.screenshot({path:path.join(root,'properties-1280.png')});check('Single Properties: identity and primary fields first; contextual controls and closed asset settings')
 await props.getByRole('spinbutton',{name:'Width',exact:true}).fill('200');await props.getByRole('spinbutton',{name:'Width',exact:true}).press('Enter');assert.equal(await props.getByRole('spinbutton',{name:'Height',exact:true}).inputValue(),'100')
 await poll(async()=>(await api('/projects/'+imported.id)).document.objects.find(o=>o.name==='Furniture').width===200)
 await canvas.focus();await page.keyboard.press('Control+z');assert.equal(await props.getByRole('spinbutton',{name:'Width',exact:true}).inputValue(),'100');check('Proportional dimensions persist and undo updates Properties')
 await canvas.focus();await page.keyboard.press('Shift+f');await page.keyboard.press('Escape');assert(await props.getByText('Select an object to edit its properties.').isVisible())
 // Fit selection centers the stamp on the canvas. Select and drag its visible center.
 const box=await canvas.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2
 await page.mouse.click(x,y);assert(await props.getByRole('heading',{name:'Furniture',exact:true}).isVisible())
 const beforeX=Number(await props.getByRole('spinbutton',{name:'X',exact:true}).inputValue());await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+25,y+15,{steps:5});await page.mouse.up();assert.notEqual(Number(await props.getByRole('spinbutton',{name:'X',exact:true}).inputValue()),beforeX)
 await page.getByRole('tab',{name:'Objects',exact:true}).click();assert.match(await list.getByRole('option',{selected:true}).innerText(),/Furniture/);check('Canvas selection and direct drag synchronize Objects and Properties; deselection clears fields')
 await page.getByRole('group',{name:'Tool context'}).getByRole('button',{name:'Duplicate',exact:true}).click();await page.getByRole('button',{name:'Fit to map',exact:true}).click()
 await poll(async()=>await list.getByRole('option').filter({has:page.getByText('Furniture',{exact:true})}).count()===2)
 assert.match(await list.getByRole('option').filter({has:page.getByText('Furniture',{exact:true})}).nth(0).innerText(),/Item 1/);assert.match(await list.getByRole('option').filter({has:page.getByText('Furniture',{exact:true})}).nth(1).innerText(),/Item 2/)
 await list.getByRole('option').filter({has:page.getByText('Furniture',{exact:true})}).nth(1).click({modifiers:['Shift']});assert.equal(await list.getByRole('option',{selected:true}).count(),2)
 await page.getByRole('tab',{name:'Properties',exact:true}).click();assert(await props.getByRole('heading',{name:'2 objects selected'}).isVisible());assert(await props.getByRole('button',{name:'Group selection'}).isVisible());assert.equal(await props.getByRole('heading',{name:'Distribute'}).count(),0);await props.getByRole('heading',{name:'Align',exact:true}).scrollIntoViewIfNeeded();assert(await props.getByRole('heading',{name:'Align',exact:true}).isVisible());check('Duplicate names gain shared item context; multi-selection exposes only applicable bulk controls')
 await page.setViewportSize({width:1600,height:1000});await props.getByRole('heading',{name:'2 objects selected'}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,'multi-1600.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.getByRole('tab',{name:'Objects',exact:true}).click();await list.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await list.getByRole('option',{selected:true}).count(),1);await page.screenshot({path:path.join(root,'keyboard-1600.png')});check('Keyboard selection and layouts at 1280 × 720 and 1600 × 1000')
 await poll(async()=>(await api('/projects/'+imported.id)).document.objects.length===8);await page.reload();await page.getByRole('button',{name:'Open Prefab house demonstration',exact:true}).click();const saved=(await api('/projects/'+imported.id)).document;assert.equal(saved.formatVersion,12);assert.equal(saved.objects.length,8);check('Existing format 12 project imports, edits, saves and reloads')
 assert.deepEqual(errors,[]);await api('/lifecycle/control',{method:'POST',body:'{"action":"stop"}'});await poll(()=>service.exitCode!==null||service.signalCode!==null);await fs.writeFile(path.join(root,'results.json'),JSON.stringify({checks,errors},null,2));console.log('EVIDENCE '+root)
}catch(e){if(page&&!page.isClosed())await page.screenshot({path:path.join(root,'failure.png')});throw e}finally{await browser?.close();if(service?.exitCode===null&&service.signalCode===null)service.kill()}
