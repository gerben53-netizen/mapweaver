import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createServer} from 'vite'
import {chromium} from '@playwright/test'
const out=path.resolve('deliverables.local/eldric-pqa-integration'),data=path.resolve('.qa.local/eldric-pqa/dataset'),registration=JSON.parse(await fs.readFile(path.join(out,'isolated-registration.json'))),result=JSON.parse(await fs.readFile(path.join(out,'benchmark-results.json')))
for(const port of [48832,48833]){const {createServer}=await import('node:net');await new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve))})}
process.env.MAPWEAVER_PORT='48832'
const child=spawn(process.execPath,['dist-service/main.js'],{env:{...process.env,MAPWEAVER_DATA_DIR:data,MAPWEAVER_DEV_ORIGIN:'http://127.0.0.1:48833'},stdio:'ignore',windowsHide:true})
const pause=ms=>new Promise(r=>setTimeout(r,ms));let browser,dev;const errors=[]
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:48832/api/v1/health')).ok)break}catch{/* starting */}await pause(200)}
 dev=await createServer({server:{host:'127.0.0.1',port:48833,strictPort:true}});await dev.listen();browser=await chromium.launch({channel:'chrome',headless:true})
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>{const u=new URL(route.request().url());return /^https?:$/.test(u.protocol)&&u.hostname!=='127.0.0.1'?route.abort():route.continue()})
 await page.goto('http://127.0.0.1:48833',{waitUntil:'commit',timeout:180000});await page.getByRole('region',{name:'Map canvas',exact:true}).waitFor({timeout:180000})
 await page.waitForFunction(()=>window.Konva?.stages.some(stage=>stage.find('Image').length>=10&&stage.find('Text').every(t=>!t.text().includes('Loading')&&!t.text().includes('unavailable'))),null,{timeout:180000})
 await pause(3000)
 for(const map of result.maps){
  await page.evaluate(async(id)=>{const local=await import('/src/projects/localSession.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts');await local.loadLocalProject(id,()=>true);e.setState({workspace:'editor'})},map.id)
  await page.waitForFunction(()=>window.Konva?.stages.some(stage=>stage.find('Image').length>=10&&stage.find('Text').every(t=>!t.text().includes('Loading')&&!t.text().includes('unavailable'))),null,{timeout:180000})
  await page.getByRole('button',{name:'Fit to map',exact:true}).click();await pause(3000)
  const displayed=await page.evaluate(async()=>{const {useProjectSession}=await import('/src/projects/session.ts');return useProjectSession.getState().info.id});assert.equal(displayed,map.id,'Editor shows wrong benchmark')
  await page.screenshot({path:path.join(out,map.name+'-editor-normal-zoom.png')})
 }
 const png=await page.evaluate(async(ids)=>{
  const {useProjectStore:s}=await import('/src/store/projectStore.ts'),{currentSnapshot}=await import('/src/projects/session.ts'),{toAsset}=await import('/src/storage/remoteLibrary.ts'),{api}=await import('/src/storage/api.ts'),{adoptLibraryAsset}=await import('/src/projects/assets.ts'),{createPlacedObject}=await import('/src/domain/placement.ts'),{exportPng}=await import('/src/export/render.ts')
  const state=s.getState(),map={...state.map,width:450,height:200},points=[[225,40],[50,140],[140,140],[270,140],[370,140]],objects=[]
  for(const [i,id] of ids.entries()){const a=toAsset(await api('/assets/'+id));await adoptLibraryAsset(a);objects.push(createPlacedObject(a,{x:points[i][0],y:points[i][1]},map))}
  const snapshot={...currentSnapshot(),map,objects,layers:state.layers.map((l,i)=>({...l,objectIds:i===0?objects.map(o=>o.id):[]}))}
  return Array.from(new Uint8Array(await(await exportPng(snapshot,{scale:2,includeGrid:false,transparent:true,includeScaleBar:false})).arrayBuffer()))
 },registration.ids.map(a=>a.id))
 await fs.writeFile(path.join(out,'integrated-five-contact.png'),Buffer.from(png));assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'editor-proof-results.json'),JSON.stringify({errors,renderedMaps:result.maps.map(m=>m.name),imagesLoadedBeforeCapture:true,contact:'Actual native Mapweaver export, five registered images at world size; no proxy',ports:[48832,48833]},null,2));console.log('Loaded editor proofs and native contact complete')
}finally{await browser?.close();await dev?.close();child.kill()}
