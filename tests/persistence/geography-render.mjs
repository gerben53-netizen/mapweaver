import {createServer} from 'vite'
import {chromium} from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve('.sprint20.local','render');await fs.mkdir(root,{recursive:true});const server=await createServer({server:{host:'127.0.0.1',port:48000,strictPort:true,watch:{ignored:['**/*.local/**']}}});let browser
try{await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1540,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:48000/tests/persistence/geography-render.html');await page.waitForFunction(()=>window.ready);const r=await page.evaluate(()=>window.results);assert.deepEqual(errors,[]);assert.equal(r.editorPngDifference,0);assert.equal(r.migrationDifference,0);assert.equal(r.holeAlpha,0);assert.equal(r.barOffAlpha,0);assert.equal(r.barOnAlpha,255);assert.equal(r.doubleWidth,1000);assert.equal(r.doubleHeight,700);await page.screenshot({path:path.join(root,'comparison.png'),fullPage:true});await fs.writeFile(path.join(root,'results.json'),JSON.stringify(r,null,2));console.log(r)}finally{await browser?.close();await server.close()}
