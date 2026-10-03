import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve('.sprint18.local','render');await fs.mkdir(root,{recursive:true})
const server=await createServer({server:{host:'127.0.0.1',port:47993,strictPort:true}});let browser
try{await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:900,height:500}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:47993/tests/persistence/opening-render.html');await page.waitForFunction(()=>window.ready);const results=await page.evaluate(()=>window.results);assert.deepEqual(errors,[]);for(const result of results){assert.equal(result.pixel[3],0);assert.equal(result.hitAlpha,0);assert.equal(result.exportPixel[3],0)}await page.screenshot({path:path.join(root,'cutouts.png')});await fs.writeFile(path.join(root,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser?.close();await server.close()}
