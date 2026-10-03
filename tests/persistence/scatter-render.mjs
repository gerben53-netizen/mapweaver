import {createServer} from 'vite'
import {chromium} from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve('.sprint19.local','render');await fs.mkdir(root,{recursive:true});const server=await createServer({server:{host:'127.0.0.1',port:47998,strictPort:true,watch:{ignored:['**/*.local/**']}}});let browser
try{await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1540,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:47998/tests/persistence/scatter-render.html');await page.waitForFunction(()=>window.ready);const results=await page.evaluate(()=>window.results);console.log(JSON.stringify(results));await page.screenshot({path:path.join(root,'comparison.png'),fullPage:true});assert.deepEqual(errors,[]);for(const r of results){assert.equal(r.difference,0);assert(r.premultipliedDifference<=2);assert(r.alphaDifference<=1);assert(r.expandedChangedChannels<200);if(r.holeAlpha!==null)assert.equal(r.holeAlpha,0)}await page.screenshot({path:path.join(root,'comparison.png'),fullPage:true});await fs.writeFile(path.join(root,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results))}finally{await browser?.close();await server.close()}
