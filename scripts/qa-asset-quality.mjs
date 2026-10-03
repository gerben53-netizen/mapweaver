import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
const out=path.resolve('deliverables.local/asset-library-audit'),data=path.resolve('.qa.local/asset-quality-audit/dataset')
const inventory=JSON.parse(await fs.readFile(path.join(out,'inventory.json'))),plan=JSON.parse(await fs.readFile(path.join(out,'migration-plan.json')))
// Check occupied ports before spawning, never attach to or stop the user's service.
for(const port of [48820,48821]){const {createServer}=await import('node:net');await new Promise((resolve,reject)=>{const socket=createServer();socket.once('error',reject);socket.listen(port,'127.0.0.1',()=>socket.close(resolve))})}
process.env.MAPWEAVER_PORT='48820'
const child=spawn(process.execPath,['dist-service/main.js'],{env:{...process.env,MAPWEAVER_DATA_DIR:data,MAPWEAVER_DEV_ORIGIN:'http://127.0.0.1:48821'},stdio:['ignore','pipe','pipe'],windowsHide:true})
let browser,dev,page,log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b)
const errors=[],checks=[],pause=ms=>new Promise(r=>setTimeout(r,ms))
try{
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(log);try{const r=await fetch('http://127.0.0.1:48820/api/v1/health');if(r.ok)break}catch{/* Service is still starting. */}await pause(200)}
 dev=await createServer({server:{host:'127.0.0.1',port:48821,strictPort:true}});await dev.listen()
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',route=>{const url=new URL(route.request().url());return /^https?:$/.test(url.protocol)&&url.hostname!=='127.0.0.1'?route.abort():route.continue()})
 await fs.mkdir(path.join(out,'context-proofs'),{recursive:true});await page.exposeFunction('saveContextProof',async(index,bytes)=>{if(!Number.isInteger(index))throw Error('Invalid proof index');await fs.writeFile(path.join(out,'context-proofs',index+'.png'),Buffer.from(bytes))});
 await page.goto('http://127.0.0.1:48821',{waitUntil:'commit',timeout:180000});await page.getByRole('region',{name:'Map canvas',exact:true}).waitFor({timeout:180000})
 const result=await page.evaluate(async({inventory,plan})=>{
   const {api,pauseLifecycleAutosave}=await import('/src/storage/api.ts'),{useProjectStore:s}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts'),session=await import('/src/projects/session.ts'),local=await import('/src/projects/localSession.ts'),{toAsset}=await import('/src/storage/remoteLibrary.ts'),{adoptLibraryAsset}=await import('/src/projects/assets.ts'),{exportPng}=await import('/src/export/render.ts')
   const {createArea,rectangleGeometry}=await import('/src/domain/areas.ts'),{createWall,SIMPLE_WALL}=await import('/src/domain/walls.ts'),{generatedWallStyle}=await import('/src/domain/generatedWalls.ts'),{defaultMapEffects}=await import('/src/domain/mapEffects.ts')
   pauseLifecycleAutosave(true)
   const sample=plan.entries.find(a=>a.classification==='REPLACE'&&a.references.length&&a.previouslyActive)
   const before=(await api('/library?limit=200')).total, hidden=await api('/assets/'+sample.id)
   if(!hidden.quality)throw Error('Quality metadata missing')
   const projects=await api('/projects');await local.loadLocalProject(projects[0].id,()=>true)
   await local.createLocalProject('Premium referenties — 40 × 30 ft',400,300,'#d3c4aa',()=>true)
   e.setState({workspace:'editor',activeTool:'select'});s.getState().applyMapSettings({...s.getState().map,grid:{...s.getState().map.grid,cellSize:50,physicalScale:{unit:'ft',distancePerCell:5}},effects:{...defaultMapEffects(),stampSoftShadow:{enabled:true,intensity:.25}}},()=>true)
   const floor=inventory.assets.find(a=>a.auditIndex===227),meta=toAsset(await api('/assets/'+floor.id));await adoptLibraryAsset(meta)
   s.getState().addArea(createArea(rectangleGeometry({x:0,y:0,width:400,height:300}),{kind:'pattern',assetId:floor.id,mode:'repeat',scale:.1,rotation:0,offsetX:0,offsetY:0}))
   const style=generatedWallStyle(SIMPLE_WALL,s.getState().map);s.getState().addPath(createWall([{id:'a',x:8,y:8,mode:'corner'},{id:'b',x:392,y:8,mode:'corner'},{id:'c',x:392,y:292,mode:'corner'},{id:'d',x:8,y:292,mode:'corner'}],true,{...style,strokeWidth:10}))
   const refs=plan.entries.filter(a=>a.premiumReference),points=[[80,70],[200,70],[300,70],[125,190],[270,190]]
   for(const [i,a] of refs.entries()){const meta=toAsset(await api('/assets/'+a.id));await adoptLibraryAsset(meta);s.getState().place(meta,{x:points[i][0],y:points[i][1]},true)}
   const render=async()=>Array.from(new Uint8Array(await(await exportPng(session.currentSnapshot(),{scale:1,includeGrid:false,transparent:false,includeScaleBar:false})).arrayBuffer()))
   const proof=await render();const baseScene=s.getState();
   const {createPlacedObject:placed}=await import('/src/domain/placement.ts')
   for(const candidate of plan.entries.filter(a=>a.classification==='FIX'&&a.scope==='battlemap')){const asset=toAsset(await api('/assets/'+candidate.id));await adoptLibraryAsset(asset);const object=placed(asset,{x:200,y:150},baseScene.map);s.setState({objects:[...baseScene.objects,object],layers:baseScene.layers.map((l,i)=>i===0?{...l,objectIds:[...l.objectIds,object.id]}:l)});await window.saveContextProof(candidate.auditIndex,await render())}
   s.setState({objects:baseScene.objects,layers:baseScene.layers});await local.saveLocalProject();if(session.useProjectSession.getState().error){const current=session.useProjectSession.getState();throw Error(JSON.stringify({error:current.error,sessionRevision:current.revision,id:current.info.id,serverRevision:(await api('/projects/'+current.info.id)).revision}))};const id=session.useProjectSession.getState().info.id;await local.loadLocalProject(id,()=>true);const reloaded=await render()
   // Resolve an inactive image directly for a historical scene, without making it placeable.
   const old=toAsset(hidden);await adoptLibraryAsset(old);const {createPlacedObject}=await import('/src/domain/placement.ts');const object=createPlacedObject({...old,quality:null},{x:200,y:150},s.getState().map)
   const state=s.getState(),layer=state.layers[0];s.setState({objects:[...state.objects,object],layers:state.layers.map(l=>l.id===layer.id?{...l,objectIds:[...l.objectIds,object.id]}:l)})
   const historic=await render();await local.saveLocalProject();if(session.useProjectSession.getState().error){const current=session.useProjectSession.getState();throw Error(JSON.stringify({error:current.error,sessionRevision:current.revision,id:current.info.id,serverRevision:(await api('/projects/'+current.info.id)).revision}))};await local.loadLocalProject(id,()=>true);const historicReloaded=await render()
   return {before,sampleId:sample.id,proof,reloaded,historic,historicReloaded,dimensions:[s.getState().map.width,s.getState().map.height],id}
 },{inventory,plan})
 assert.deepEqual(result.proof,result.reloaded,'Reference PNG changed on save/reload');assert.deepEqual(result.historic,result.historicReloaded,'Inactive stamp PNG changed on save/reload');assert.deepEqual(result.dimensions,[400,300])
 await fs.writeFile(path.join(out,'reference-room-100.png'),Buffer.from(result.proof));await fs.writeFile(path.join(out,'inactive-asset-room.png'),Buffer.from(result.historic))
 const sharp=(await import('sharp')).default;await sharp(Buffer.from(result.proof)).resize(200,150).png().toFile(path.join(out,'reference-room-50.png'));await sharp(Buffer.from(result.proof)).resize(800,600).png().toFile(path.join(out,'reference-room-inspection.png'))
 checks.push('Real Mapweaver renderer: 40×30 ft, 10 px/ft, original floor + production Living Root + 5 references + soft shadow','Reference scene PNG byte-identical after SQLite save/reload','Inactive referenced stamp resolves/renders; PNG byte-identical after save/reload')
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify({checks,errors,sampleId:result.sampleId,fixtureMapId:result.id,data,ports:[48820,48821]},null,2));console.log(JSON.stringify({checks,errors}))
}catch(error){await page?.screenshot({path:path.join(out,'qa-failure.png')}).catch(()=>{});throw error}finally{await fs.writeFile(path.join(out,'qa-service.log'),log);await browser?.close();await dev?.close();child.kill()}
