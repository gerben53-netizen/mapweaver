import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';
import fs from 'node:fs/promises';
import {strict as assert} from 'node:assert';
const directory=await fs.mkdtemp(path.resolve('.sprint12.local/outage-')),base='http://127.0.0.1:47832';let child;
async function start(){
 child=spawn(process.execPath,['dist-service/main.js'],{env:{...process.env,MAPWEAVER_PORT:'47832',MAPWEAVER_DATA_DIR:directory},windowsHide:true,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Owned test service did not start')),10000);child.stdout.on('data',chunk=>{if(chunk.toString().includes('Mapweaver:')){clearTimeout(timer);resolve()}});child.once('exit',()=>{clearTimeout(timer);reject(Error('Owned test service exited before startup'))})});
}
async function stop(){if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited}}
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:720}});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();page.setDefaultTimeout(10000);
try{
 await start();await page.goto(base);await page.getByRole('dialog',{name:'Projects',exact:true}).getByRole('button',{name:'New project',exact:true}).click();await page.getByRole('dialog',{name:'New project'}).getByLabel('Name',{exact:true}).fill('Service outage test');await page.getByRole('button',{name:'Create project'}).click();await expect(page.locator('small[role=status]')).toContainText('Saved locally');
 const id=await page.evaluate(async()=>(await(await fetch('/api/v1/projects')).json())[0].id);
 await stop();await page.getByRole('button',{name:'Add layer',exact:true}).click();await expect(page.locator('small[role=status]')).toHaveText('Save failed');
 const pending=await page.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('mapweaver-unsynced');q.onsuccess=()=>r(q.result)});const count=await new Promise(r=>{const q=db.transaction('pending').objectStore('pending').count();q.onsuccess=()=>r(q.result)});db.close();return count});assert.equal(pending,1);await page.screenshot({path:'.sprint12.local/service-offline.png'});
 await start();const before=await page.evaluate(async id=>(await(await fetch('/api/v1/projects/'+id)).json()).document.layers.length,id);assert.equal(before,1);await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator('small[role=status]')).toContainText('Saved locally');const after=await page.evaluate(async id=>(await(await fetch('/api/v1/projects/'+id)).json()).document.layers.length,id);assert.equal(after,2);
 console.log('PASS actual service stop during editing: Save failed + recovery retained; restart/retry commits current edits');
}finally{await context.close();await browser.close();await stop()}
