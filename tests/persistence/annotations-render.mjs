import {createServer} from 'vite'
import {chromium} from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve('.sprint22.local','render');await fs.mkdir(root,{recursive:true});const server=await createServer({server:{host:'127.0.0.1',port:48002,strictPort:true,watch:{ignored:['**/*.local/**']}}});let browser
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1500,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:48002/tests/persistence/annotations-render.html');await page.waitForFunction(()=>window.ready);const r=await page.evaluate(()=>window.results);assert.deepEqual(errors,[]);assert.equal(r.editorPngDifference,0);assert(r.missingAsset);assert.equal(r.doubleWidth,1400);assert.equal(r.doubleHeight,1000);assert.equal(r.fontFaces,4);assert(r.textPixelCount>10000);await page.screenshot({path:path.join(root,'comparison.png'),fullPage:true})
 const missing=await browser.newPage();await missing.route('**/fonts/*.ttf',route=>route.abort());await missing.goto('http://127.0.0.1:48002/tests/persistence/annotations-render.html');const fontFailure=await missing.evaluate(async()=>{const {loadAnnotationFonts}=await import('/src/canvas/annotationFonts.ts');try{await loadAnnotationFonts();return false}catch(e){return e.message.includes('Restore the fonts')}});assert(fontFailure);r.missingFontBlocked=fontFailure
 await fs.writeFile(path.join(root,'results.json'),JSON.stringify(r,null,2));console.log(r)
}finally{await browser?.close();await server.close()}
