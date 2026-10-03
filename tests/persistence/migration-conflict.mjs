import path from 'node:path';
import { chromium,expect } from '@playwright/test';
import {strict as assert} from 'node:assert';
import fs from 'node:fs/promises';
const base='http://127.0.0.1:47831',root='.sprint12.local';
const destination=await fetch(base+'/api/v1/storage').then(r=>r.json());
assert.equal(path.resolve(destination.location),path.resolve('.sprint12.local/browser-data'),'Refusing to test against a non-test data directory');
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:720}});
await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
const page=await context.newPage();page.setDefaultTimeout(10000);page.on('dialog',d=>d.accept());
const saved=p=>expect(p.locator('small[role=status]')).toContainText('Saved locally');
const api=(p,url)=>p.evaluate(async url=>(await fetch('/api/v1'+url)).json(),url);
try{
 await page.goto(base);await page.getByRole('dialog',{name:'Projects',exact:true}).waitFor();
 const evidence=JSON.parse(await fs.readFile(`${root}/acceptance.json`,'utf8'));
 const seeded=await page.evaluate(async id=>{
  const row=await(await fetch('/api/v1/projects/'+id)).json(),d=structuredClone(row.document);d.id=crypto.randomUUID();d.name='Browser migration '+Date.now();
  const originals=await Promise.all(d.assets.map(async a=>({manifest:a,blob:await(await fetch('/api/v1/assets/'+a.id+'/content')).blob()})));
  const source=originals.find(a=>a.manifest.kind==='stamp'&&d.objects.some(o=>o.assetId===a.manifest.id));const libraryId=crypto.randomUUID();
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('mapweaver-library');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  await new Promise((resolve,reject)=>{const tx=db.transaction(['assets','blobs','recoveryProjects','projectAssets'],'readwrite');tx.objectStore('assets').put({id:libraryId,blobId:libraryId,kind:'stamp',name:'Migrated stamp',mimeType:source.manifest.mimeType,naturalWidth:source.manifest.width,naturalHeight:source.manifest.height,categoryId:'uncategorized',createdAt:d.createdAt,contentHash:source.manifest.hash});tx.objectStore('blobs').put({id:libraryId,blob:source.blob});tx.objectStore('recoveryProjects').put({id:d.id,name:d.name,document:d,savedAt:d.modifiedAt,modifiedAt:d.modifiedAt,downloadedAt:null});for(const a of originals)tx.objectStore('projectAssets').put({projectId:d.id,assetId:a.manifest.id,...a});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();return{id:d.id,name:d.name};
 },evidence.id);
 await page.reload();await expect(page.getByRole('dialog',{name:'Projects',exact:true})).toContainText('previous data');await page.getByRole('dialog',{name:'Projects',exact:true}).getByRole('button',{name:'Storage',exact:true}).click();await expect(page.getByRole('dialog',{name:'Storage',exact:true})).toContainText('1 library images');
 await page.getByRole('button',{name:'Copy and verify browser data'}).click();await expect.poll(async()=>JSON.parse(await page.getByLabel('Migration report').inputValue()).completed).toBe(true);
 let report=JSON.parse(await page.getByLabel('Migration report').inputValue());assert.equal(report.mappings['project:'+seeded.id],seeded.id);const count=(await api(page,'/projects')).length;
 await page.getByRole('button',{name:'Copy and verify browser data'}).click();await expect(page.getByRole('button',{name:'Copy and verify browser data'})).toBeEnabled();report=JSON.parse(await page.getByLabel('Migration report').inputValue());assert(report.completed);assert.equal((await api(page,'/projects')).length,count);
 const counts=await page.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('mapweaver-library');q.onsuccess=()=>r(q.result)});const tx=db.transaction(['assets','blobs','recoveryProjects']);const out=await Promise.all(['assets','blobs','recoveryProjects'].map(t=>new Promise(r=>{const q=tx.objectStore(t).count();q.onsuccess=()=>r(q.result)})));db.close();return out});assert.deepEqual(counts,[1,1,1]);await page.screenshot({path:`${root}/migration.png`});
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Open '+seeded.name,exact:true}).click();await saved(page);
 const second=await context.newPage();second.setDefaultTimeout(10000);second.on('dialog',d=>d.accept());await second.goto(base);await second.getByRole('button',{name:'Open '+seeded.name,exact:true}).click();await saved(second);
 await page.getByRole('tab',{name:'Layers',exact:true}).click();await page.getByRole('button',{name:'Add layer',exact:true}).click();await saved(page);const original=await api(page,'/projects/'+seeded.id);
 await second.getByRole('tab',{name:'Layers',exact:true}).click();await second.getByRole('button',{name:'Add layer',exact:true}).click();await second.getByRole('dialog',{name:'Save conflict',exact:true}).waitFor();assert.equal((await api(page,'/projects/'+seeded.id)).revision,original.revision);
 const pending=second.waitForEvent('download');await second.getByRole('button',{name:'Export unsaved project'}).click();const download=await pending;await download.saveAs(`${root}/downloads/conflict.mapweaver`);assert.equal(await download.failure(),null);await expect(second.locator('small[role=status]')).toHaveText('Save conflict');
 await second.getByRole('button',{name:'Save as separate project'}).click();await saved(second);assert.equal((await api(page,'/projects/'+seeded.id)).revision,original.revision);assert((await api(page,'/projects')).some(p=>p.name===seeded.name+' copy'));
 await fs.unlink(`${root}/downloads/conflict.mapweaver`);console.log('PASS browser migration: copy/verify/rerun/source retained; two-tab conflict, export unsaved, save separate copy');
}finally{await context.close();await browser.close()}
