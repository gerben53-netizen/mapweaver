import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {zipSync,strToU8} from 'fflate'
import assert from 'node:assert/strict'
const before=process.argv.includes('--before'),out=path.resolve('deliverables.local/Library-Navigation'),root=path.resolve('.qa.local/library-navigation-'+Date.now()),base='http://127.0.0.1:48065',token=crypto.randomUUID()
await fs.mkdir(out,{recursive:true})
const service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'ignore',env:{...process.env,MAPWEAVER_PORT:'48065',MAPWEAVER_DATA_DIR:root,MAPWEAVER_CONTROL_TOKEN:token}})
let health,browser,page
const api=async(u,method='GET',body)=>{const r=await fetch(base+'/api/v1'+u,{method,headers:{'Content-Type':Buffer.isBuffer(body)?'application/zip':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
try{
 for(let i=0;i<100;i++){try{health=await fetch(base+'/api/v1/health').then(r=>r.json());if(health.pid===service.pid)break}catch { /* Expected during startup/shutdown; the owned-process check handles failure. */ }await new Promise(r=>setTimeout(r,200))}assert.equal(health?.pid,service.pid)
 const main=['Valmyria','Eryndor','Battlemap','Paleis'],deep=[...main,'Interieur','Meubilair','Banken'],files={},assets=[]
 for(let i=0;i<600;i++){const file=`fixture-${i}.png`;files[file]=await sharp({create:{width:64,height:48,channels:4,background:{r:i%256,g:Math.floor(i/256)*80,b:150,alpha:1}}}).png().toBuffer();const cat=i<12?deep:i<28?[...main,'Bedrooms']:i<40?['City Map','Residential','Bedrooms']:['World Map',`Region ${Math.floor(i/40)}`,`Landscape ${Math.floor(i/10)}`,`Details ${i%4}`];assets.push({file,type:'stamp',title:`Fixture ${String(i).padStart(3,'0')}`,categoryPath:cat,favorite:i%3===0})}
 files['mapweaver-assets.json']=strToU8(JSON.stringify({schemaVersion:1,assets,categories:[{path:['Palace'],sortOrder:0},{path:['Paleis'],sortOrder:1}],collection:{title:'QA collection',description:'Navigation fixture'}}))
 const preview=await api('/library/preview','POST',Buffer.from(zipSync(files,{level:0})));assert.deepEqual(preview.errors,[]);await api('/library/commit','POST',{token:preview.token,revision:preview.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})
 const initial=await api('/library?limit=1');assert.equal(initial.total,600)
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base)
 page.once('dialog',d=>d.accept('Navigation QA'));await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.getByRole('button',{name:'+ Map',exact:true}).click();const dialog=page.getByRole('dialog',{name:'New map',exact:true});await dialog.getByLabel('Name',{exact:true}).fill('Navigation map');await dialog.getByRole('button',{name:'Create map',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.getByRole('tab',{name:'Asset library',exact:true}).click()
 const side=page.getByRole('complementary',{name:'Asset explorer'});await expect(side).toBeVisible();await expect(page.getByText('0 selected / 600 results')).toBeVisible()
 if(before){await page.getByRole('treeitem',{name:'Banken, 12 assets'}).click();await expect(page.getByText('0 selected / 12 results')).toBeVisible();await page.screenshot({path:out+'/before-1280.png'})}
 else{
  const start=Date.now();for(const name of deep){const row=page.getByRole('treeitem',{name:new RegExp('^'+name+',')});await row.click()}
  await expect(page.getByText('0 selected / 12 results')).toBeVisible();const navigationMs=Date.now()-start
  const crumb=page.getByRole('navigation',{name:'Category breadcrumb'});await expect(crumb.getByRole('button',{name:'Banken',exact:true})).toHaveAttribute('aria-current','location');assert.equal(await side.locator('[role=treeitem]').count()<20,true)
  await page.screenshot({path:out+'/after-deep-1280.png'})
  await crumb.getByRole('button',{name:'Paleis',exact:true}).click();await expect(page.getByRole('region',{name:'Subcategories'}).getByRole('button',{name:/Bedrooms/})).toBeVisible()
  await expect(page.getByText('0 selected / 28 results')).toBeVisible();await page.screenshot({path:out+'/child-categories-1280.png'});await page.getByRole('searchbox',{name:'Search library'}).fill('Bedrooms');const matches=page.getByRole('region',{name:'Matching categories'});await expect(matches.getByRole('button')).toHaveCount(2);await expect(page.getByText('0 selected / 0 results')).toBeVisible();await page.screenshot({path:out+'/category-search-1280.png'});await matches.getByRole('button',{name:/Bedrooms Valmyria/}).click();await expect(page.getByRole('searchbox',{name:'Search library'})).toHaveValue('');await expect(page.getByText('0 selected / 16 results')).toBeVisible();await expect(page.getByRole('treeitem',{name:/^Bedrooms,/})).toBeFocused()
  await side.getByRole('button',{name:'Collapse all',exact:true}).click();await expect(page.getByRole('treeitem',{name:/^Bedrooms,/})).toHaveCount(0);await side.getByRole('button',{name:'Expand current path'}).click();await expect(page.getByRole('treeitem',{name:/^Bedrooms,/})).toBeVisible()
  await expect(page.getByRole('treeitem',{name:'Palace, 0 assets'})).toHaveCount(0);await side.getByLabel('Show empty categories').check();await expect(page.getByRole('treeitem',{name:'Palace, 0 assets'})).toBeVisible();await side.getByLabel('Show empty categories').uncheck()
  const bedroom=page.getByRole('treeitem',{name:/^Bedrooms,/});await bedroom.focus();await page.keyboard.press('ArrowLeft');await expect(page.getByRole('treeitem',{name:/^Paleis,/})).toBeFocused();await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');await expect(crumb.getByRole('button',{name:'Bedrooms',exact:true})).toHaveAttribute('aria-current','location')
  await side.getByRole('button',{name:'All assets',exact:true}).click();await page.getByRole('searchbox',{name:'Search library'}).fill('Fixture 001');await expect(page.getByText('0 selected / 1 results')).toBeVisible();await page.getByRole('searchbox',{name:'Search library'}).fill('');await side.getByRole('button',{name:'Favorites',exact:true}).click();await expect(page.getByText('0 selected / 200 results')).toBeVisible();await side.getByRole('button',{name:'Favorites',exact:true}).click();await side.getByRole('button',{name:'QA collection',exact:true}).click();await expect(page.getByText('0 selected / 600 results')).toBeVisible()
  assert.equal(await side.evaluate(e=>e.scrollWidth>e.clientWidth),false);assert.deepEqual(errors,[])
  const final=await api('/library?limit=1');assert.deepEqual(final.categories,initial.categories)
  await fs.writeFile(out+'/validation.json',JSON.stringify({assets:600,categories:initial.categories.length,navigationMs,errors,scenarios:['deep path','breadcrumb','children','category search and jump','collapse/reveal','empty categories','keyboard','asset search','favorites','collections'],taxonomyUnchanged:true},null,2));console.log({navigationMs,categories:initial.categories.length,errors})
 }
} catch(e){await page?.screenshot({path:out+'/failure.png'});throw e}finally{if(health?.pid===service.pid)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});await browser?.close();service.kill()}
