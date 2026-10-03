import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve('.sprint17-1.local','visual');await fs.mkdir(root,{recursive:true})
const data=[]
const server=await createServer({plugins:[{name:'wall-test-data',configureServer(s){s.middlewares.use('/wall-test-data',(_req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))})}}],server:{host:'127.0.0.1',port:47995,strictPort:true,watch:{ignored:['**/*.local/**']}}});let browser
try{
  const {prepareWallSet}=await server.ssrLoadModule('/service/wallSets.ts')
  for(const id of ['masonry','timber','cave-rock']){const prepared=await prepareWallSet(await fs.readFile(`public/wall-sets/${id}.zip`));data.push({definition:prepared.definition,image:`data:image/png;base64,${prepared.atlas.toString('base64')}`})}
  await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1640,height:1200}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack)});await page.goto('http://127.0.0.1:47995/tests/persistence/wall-material-render.html');await page.waitForFunction(()=>window.ready)
  const results=await page.evaluate(()=>window.results);for(const result of results){assert.equal(result.gap,0);assert.equal(result.hitGap,0);assert.equal(result.outside,0);assert.deepEqual(result.editor,result.export)}
  for(const zoom of [.5,1,2])for(const dark of [false,true]){
    const png=await page.evaluate(({zoom,dark})=>window.draw(zoom,dark),{zoom,dark});await fs.writeFile(path.join(root,`${zoom*100}-${dark?'dark':'light'}.png`),Buffer.from(png.split(',')[1],'base64'));await page.screenshot({path:path.join(root,`browser-${zoom*100}-${dark?'dark':'light'}.png`),fullPage:true})
  }
  await page.setViewportSize({width:3300,height:2400});await page.evaluate(()=>window.draw(2,true));await page.screenshot({path:path.join(root,'closeup-sharp-joins.png'),clip:{x:0,y:880,width:2150,height:380}});await page.screenshot({path:path.join(root,'closeup-cave-contours.png'),clip:{x:2110,y:1290,width:1110,height:430}})
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));console.log('Visual matrix '+root)
}finally{await browser?.close();await server.close()}
