import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
const out=path.resolve('deliverables.local/eldric-pqa-integration'),data=path.resolve('.qa.local/eldric-pqa/dataset')
const registration=JSON.parse(await fs.readFile(path.join(out,'isolated-registration.json'))),inventory=JSON.parse(await fs.readFile('deliverables.local/asset-library-audit/inventory.json'))
// Occupied ports are never reused or terminated. Dataset lease also prevents competing writers.
for(const port of [48830,48831]){const {createServer}=await import('node:net');await new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve))})}
process.env.MAPWEAVER_PORT='48830'
const child=spawn(process.execPath,['dist-service/main.js'],{env:{...process.env,MAPWEAVER_DATA_DIR:data,MAPWEAVER_DEV_ORIGIN:'http://127.0.0.1:48831'},stdio:['ignore','pipe','pipe'],windowsHide:true})
let log='',browser,dev,page;const errors=[];child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b)
const pause=ms=>new Promise(r=>setTimeout(r,ms))
try{
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(log);try{if((await fetch('http://127.0.0.1:48830/api/v1/health')).ok)break}catch{/* starting */}await pause(200)}
 dev=await createServer({server:{host:'127.0.0.1',port:48831,strictPort:true}});await dev.listen()
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',route=>{const u=new URL(route.request().url());return /^https?:$/.test(u.protocol)&&u.hostname!=='127.0.0.1'?route.abort():route.continue()})
 await page.exposeFunction('proofFile',async(name,bytes)=>{if(!/^[a-z0-9-]+\.(png|mapweaver)$/.test(name))throw Error('Unsafe proof name');await fs.writeFile(path.join(out,name),Buffer.from(bytes))})
 // Load real domain/store/export modules without mounting a second UI autosave/lifecycle subscriber.
 // The full editor is opened separately after persistent rendering checks.
 await page.route('http://127.0.0.1:48831/',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body>Mapweaver native renderer integration harness</body></html>'}))
 await page.goto('http://127.0.0.1:48831',{waitUntil:'commit',timeout:180000})
 const result=await page.evaluate(async({registration,inventory})=>{
  const {api,pauseLifecycleAutosave}=await import('/src/storage/api.ts'),{useProjectStore:s}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts'),session=await import('/src/projects/session.ts'),local=await import('/src/projects/localSession.ts'),{toAsset}=await import('/src/storage/remoteLibrary.ts'),{adoptLibraryAsset}=await import('/src/projects/assets.ts'),{exportPng}=await import('/src/export/render.ts')
  const {createArea,rectangleGeometry}=await import('/src/domain/areas.ts'),{createWall,SIMPLE_WALL}=await import('/src/domain/walls.ts'),{generatedWallStyle}=await import('/src/domain/generatedWalls.ts'),{defaultMapEffects}=await import('/src/domain/mapEffects.ts'),{createOpening}=await import('/src/domain/openings.ts'),{request}=await import('/src/storage/api.ts')
  pauseLifecycleAutosave(true)
  const legacy=inventory.assets.find(a=>a.auditIndex===421),availableMaps=await api('/projects'),oldId=legacy.references.find(r=>availableMaps.some(m=>m.id===r.projectId))?.projectId
  if(!oldId)throw Error('No live historical map with bookshelf reference')
  await local.loadLocalProject(oldId,()=>true)
  const oldBefore=JSON.stringify((await api('/projects/'+oldId)).document)
  const oldExport=await exportPng(session.currentSnapshot(),{scale:1,includeGrid:false,transparent:false,includeScaleBar:false});await window.proofFile('existing-map-legacy.png',Array.from(new Uint8Array(await oldExport.arrayBuffer())))
  const production=Object.fromEntries(registration.ids.map(a=>[a.conceptId,a.id])),checks=[],maps=[]
  const render=async(scale=1)=>Array.from(new Uint8Array(await(await exportPng(session.currentSnapshot(),{scale,includeGrid:false,transparent:false,includeScaleBar:false})).arrayBuffer()))
  const place=async(id,x,y,rotation=0)=>{const a=toAsset(await api('/assets/'+id));await adoptLibraryAsset(a);s.getState().place(a,{x,y},true);if(rotation){const o=s.getState().objects.at(-1);s.getState().updateTransform(o.id,{...o,rotation})}return a}
  const existing=async(n,x,y,rotation=0)=>place(inventory.assets.find(a=>a.auditIndex===n).id,x,y,rotation)
  const checkedSave=async()=>{await local.saveLocalProject();if(session.useProjectSession.getState().error)throw Error(session.useProjectSession.getState().error)}
  for(const name of ['eldric','library']){
   const w=name==='eldric'?400:450,h=name==='eldric'?300:320
   await local.createLocalProject(name==='eldric'?'PQA benchmark — Eldrics werkkamer':'PQA benchmark — Openbare Bibliotheek',w,h,'#c5b38c',()=>true)
   e.setState({workspace:'editor',activeTool:'select',selectedIds:[]})
   s.getState().applyMapSettings({...s.getState().map,grid:{...s.getState().map.grid,cellSize:50,visible:false,physicalScale:{unit:'ft',distancePerCell:5}},effects:{...defaultMapEffects(),stampSoftShadow:{enabled:true,intensity:.25}}},()=>true)
   const floor=toAsset(await api('/assets/'+inventory.assets.find(a=>a.auditIndex===227).id));await adoptLibraryAsset(floor)
   s.getState().addArea(createArea(rectangleGeometry({x:0,y:0,width:w,height:h}),{kind:'pattern',assetId:floor.id,mode:'repeat',scale:.1,rotation:0,offsetX:0,offsetY:0}))
   const style=generatedWallStyle(SIMPLE_WALL,s.getState().map),wall=createWall([{id:'a',x:8,y:8,mode:'corner'},{id:'b',x:w-8,y:8,mode:'corner'},{id:'c',x:w-8,y:h-8,mode:'corner'},{id:'d',x:8,y:h-8,mode:'corner'}],true,{...style,strokeWidth:10,wall:{...style.wall,generated:{...style.wall.generated,seed:1234,overgrowth:.05}}})
   s.getState().addPath(wall);const pos=((w-16)+(h-16)+(w-16)/2)/(2*(w+h-32)),opening=createOpening(wall,pos,'door',30);s.getState().addOpening({...opening,doorType:'passage',status:'closed',name:'Entrance passage'})
   if(name==='eldric'){
    await existing(73,220,240)
    if(s.getState().objects.at(-1).effects?.softShadow!=='off')throw Error('Rug shadow override not preserved')
    await place(production['pqa-koningsboom-writing-desk-clean'],110,145);await existing(77,105,142);await existing(175,128,145)
    await existing(531,265,155);await existing(70,110,180);await existing(170,265,210)
    await place(production['pqa-koningsboom-bookcase-quarter-curve'],65,65)
    await place(production['pqa-koningsboom-grown-book-niche'],300,40)
    await existing(155,335,245);await existing(75,340,100);await existing(187,265,105);await existing(192,75,245);await existing(264,350,185)
   }else{
    await place(production['pqa-koningsboom-bookcase-long-curve'],225,60)
    await place(production['pqa-koningsboom-bookcase-quarter-curve'],65,140)
    await place(production['pqa-koningsboom-bookcase-horseshoe'],380,130)
    await place(production['pqa-koningsboom-grown-book-niche'],75,250)
    await existing(71,220,150);await existing(72,205,225);await existing(70,195,115);await existing(70,245,185);await existing(170,160,225)
    await existing(65,305,285);await existing(66,100,40);await existing(64,70,205)
    await place(production['pqa-koningsboom-writing-desk-clean'],365,245);await existing(77,365,245);await existing(69,280,250);await existing(264,415,270)
   }
   const proof=await render(),two=await render(2)
   await window.proofFile(name+'-100.png',proof);await window.proofFile(name+'-2x.png',two)
   const current=s.getState().map;s.getState().applyMapSettings({...current,effects:{...current.effects,stampSoftShadow:{...current.effects.stampSoftShadow,enabled:false}}},()=>true);await window.proofFile(name+'-shadow-off.png',await render());s.getState().applyMapSettings(current,()=>true)
   await checkedSave();const id=session.useProjectSession.getState().info.id;await local.loadLocalProject(id,()=>true);const reloaded=await render();if(JSON.stringify(proof)!==JSON.stringify(reloaded))throw Error('Reload changed pixels '+name)
   // Exercise the real autosave subscriber with one reversible shadow-setting edit.
   const stop=local.startLocalAutosave();pauseLifecycleAutosave(false)
   const beforeRevision=session.useProjectSession.getState().revision
   s.getState().applyMapSettings({...s.getState().map,effects:{...s.getState().map.effects,stampSoftShadow:{enabled:true,intensity:.3}}},()=>true)
   for(let i=0;i<100&&session.useProjectSession.getState().revision===beforeRevision;i++)await new Promise(r=>setTimeout(r,100))
   if(session.useProjectSession.getState().revision===beforeRevision)throw Error('Autosave did not persist '+name+' '+JSON.stringify({session:session.useProjectSession.getState(),history:(await import('/src/store/history.ts')).useHistoryStore.getState(),paused:(await import('/src/storage/api.ts')).lifecyclePausesAutosave,effects:s.getState().map.effects}))
   pauseLifecycleAutosave(true);stop();s.getState().applyMapSettings(current,()=>true);await checkedSave();await local.loadLocalProject(id,()=>true)
   const response=await request('/projects/'+id+'/export');await window.proofFile(name+'.mapweaver',Array.from(new Uint8Array(await response.arrayBuffer())))
   e.getState().fit(s.getState().map,{width:950,height:800})
   maps.push({name,id,width:w,height:h,objects:s.getState().objects.map(o=>({id:o.id,kind:o.kind,assetId:o.assetId,wallId:o.wallId,generated:o.wall?.generated})),revision:session.useProjectSession.getState().revision,autosaveVerified:true})
   checks.push(name+': real Living Root production-1, passage, physical stamps, save/reload identical, autosave, PNG 1x/2x')
  }
  if(JSON.stringify((await api('/projects/'+oldId)).document)!==oldBefore)throw Error('Historical document changed')
  if(JSON.parse((await api('/assets/'+legacy.id)).quality).classification!=='REPLACE')throw Error('Legacy reactivated')
  const library=await api('/library?limit=200');for(const id of Object.values(production))if(!library.assets.some(a=>a.id===id)){const a=await api('/library?search='+encodeURIComponent(JSON.parse((await api('/assets/'+id)).source).conceptId));if(!a.assets.some(a=>a.id===id))throw Error('Production picker missing')}
  return {maps,checks,oldMapId:oldId,legacyId:legacy.id,oldMapUnchanged:true}
 },{registration,inventory})
 await page.evaluate(async(ids)=>{
  const {useProjectStore:s}=await import('/src/store/projectStore.ts'),{currentSnapshot}=await import('/src/projects/session.ts'),{toAsset}=await import('/src/storage/remoteLibrary.ts'),{api}=await import('/src/storage/api.ts'),{adoptLibraryAsset}=await import('/src/projects/assets.ts'),{createPlacedObject}=await import('/src/domain/placement.ts'),{exportPng}=await import('/src/export/render.ts')
  const state=s.getState(),map={...state.map,width:450,height:200},points=[[225,40],[50,140],[140,140],[270,140],[370,140]],objects=[]
  for(const [i,id] of ids.entries()){const a=toAsset(await api('/assets/'+id));await adoptLibraryAsset(a);objects.push(createPlacedObject(a,{x:points[i][0],y:points[i][1]},map))}
  s.setState({map,objects,layers:state.layers.map((l,i)=>({...l,objectIds:i===0?objects.map(o=>o.id):[]}))})
  const png=await exportPng(currentSnapshot(),{scale:2,includeGrid:false,transparent:true,includeScaleBar:false});await window.proofFile('integrated-five-contact.png',Array.from(new Uint8Array(await png.arrayBuffer())))
 },registration.ids.map(a=>a.id))
 const editor=await browser.newPage({viewport:{width:1600,height:1000}})
 await editor.route('**/*',route=>{const u=new URL(route.request().url());return /^https?:$/.test(u.protocol)&&u.hostname!=='127.0.0.1'?route.abort():route.continue()})
 await editor.goto('http://127.0.0.1:48831',{waitUntil:'commit',timeout:180000});await editor.getByRole('region',{name:'Map canvas',exact:true}).waitFor({timeout:180000})
 await editor.evaluate(async()=>{const {useEditorStore:e}=await import('/src/store/editorStore.ts'),{useProjectStore:s}=await import('/src/store/projectStore.ts');e.setState({workspace:'editor'});e.getState().fit(s.getState().map,{width:950,height:800})})
 await pause(1500);await editor.screenshot({path:path.join(out,'library-editor-normal-zoom.png')})
 for(const n of ['eldric','library']){const png=await fs.readFile(path.join(out,n+'-100.png'));const m=await sharp(png).metadata();const two=await sharp(path.join(out,n+'-2x.png')).metadata();assert.equal(two.width,m.width*2);assert.equal(two.height,m.height*2);await sharp(png).resize(Math.round(m.width*.5),Math.round(m.height*.5)).png().toFile(path.join(out,n+'-50.png'));await sharp(png).resize(Math.round(m.width*.75),Math.round(m.height*.75)).png().toFile(path.join(out,n+'-play-75.png'))}
 assert.deepEqual(errors,[])
 await fs.writeFile(path.join(out,'benchmark-results.json'),JSON.stringify({...result,errors,ports:[48830,48831],data},null,2));console.log(JSON.stringify({checks:result.checks,errors}))
}catch(error){await page?.screenshot({path:path.join(out,'qa-failure.png')}).catch(()=>{});throw error}finally{await fs.writeFile(path.join(out,'qa-service.log'),log);await browser?.close();await dev?.close();child.kill()}
