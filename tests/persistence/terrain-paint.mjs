import {isDeepStrictEqual} from 'node:util'
const equivalent=(a,b)=>isDeepStrictEqual(JSON.parse(JSON.stringify(a??null)),JSON.parse(JSON.stringify(b??null)))
import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
const root=path.resolve('.qa.local','terrain-paint-'+Date.now()),base='http://127.0.0.1:48030',web='http://127.0.0.1:5187',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const poll=async(fn,label)=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout: '+label)}
let service,vite,health,browser,page
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api/v1'+url,{method,headers:{'Content-Type':Buffer.isBuffer(body)?'application/zip':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
const errors=[]
try{
 service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48030',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token,MAPWEAVER_DEV_ORIGIN:web}});service.stdout.resume();service.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===service.pid}catch{return false}},'service')
 vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5187','--strictPort'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48030'}});vite.stdout.resume();vite.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{return (await fetch(web)).ok}catch{return false}},'vite')


 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto(web,{timeout:90000});await expect(page.getByRole('dialog',{name:'Create your first campaign'})).toBeVisible();page.once('dialog',d=>d.accept('Generator asset proof'));await page.getByRole('button',{name:'New campaign',exact:true}).click()

 await expect(page.getByRole('button',{name:'+ Map',exact:true})).toBeVisible();await poll(async()=>(await api('/campaigns')).length>0,'campaign created')

 await page.getByRole('button',{name:'+ Map',exact:true}).click();const creation=page.getByRole('dialog',{name:'New map',exact:true});await creation.getByLabel('Name',{exact:true}).fill('Terrain Brush proof');await creation.getByLabel('Map type',{exact:true}).selectOption('world-map');await creation.getByRole('button',{name:'Create map',exact:true}).click();await expect(page.getByRole('region',{name:'Map canvas'})).toBeVisible()


 await page.evaluate(async()=>{
  const {themeFixture}=await import('/tests/fixtures/worldThemes.ts'),{generateWorld}=await import('/src/world/generate.ts'),{WORLD_DEFAULTS}=await import('/src/world/model.ts'),{scatterWorld}=await import('/src/world/scatterWorld.ts'),{loadWorldScatterAssets}=await import('/src/world/scatterResources.ts'),{themeWorld}=await import('/src/world/themeWorld.ts'),{useProjectStore:p}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts'),{history}=await import('/src/store/history.ts')
  await themeFixture({...p.getState().map,width:1200,height:800}) // installs isolated QA source stamps
  const generated=themeWorld(scatterWorld(generateWorld({...WORLD_DEFAULTS,width:1200,height:800,seed:'brush-world'}),{mountains:'medium',forests:'medium',details:'off',theme:'painterlyFantasy'},await loadWorldScatterAssets()),'world.painterlyFantasy')
  history.run('Generated fixture',()=>p.setState({map:generated.map,objects:generated.objects,layers:generated.layers,layerTree:generated.layerTree,objectGroups:[]}));history.reset();e.setState({selectedObjectIds:[],activeLayerId:generated.layers[0].id,activeTool:'select'})
 })
 const current=()=>page.evaluate(async()=>(await import('/src/projects/session.ts')).currentSnapshot())
 const counts=()=>page.evaluate(async()=>(await import('/src/store/history.ts')).useHistoryStore.getState().undoCount)
 const before=await current();await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.screenshot({path:path.join(root,'before.png')})
 await page.getByRole('button',{name:'Terrain Brush',exact:true}).click()
 const controls=page.getByLabel('Terrain Brush controls',{exact:true})
 await controls.getByLabel('Size (map px)',{exact:true}).fill('105');await controls.getByLabel('Softness (%)',{exact:true}).fill('80');await controls.getByLabel('Strength (%)',{exact:true}).fill('50');await controls.getByLabel('Texture scale',{exact:true}).fill('0.5');await controls.getByLabel('Texture scale',{exact:true}).press('Tab')
 const screen=async p=>page.evaluate(async p=>{const {viewport:v}=(await import('/src/store/editorStore.ts')).useEditorStore.getState(),r=document.querySelector('[aria-label="Map canvas"]').getBoundingClientRect();return{x:r.x+v.pan.x+p.x*v.zoom,y:r.y+v.pan.y+p.y*v.zoom}},p)
 const stroke=async(points,steps=12)=>{let p=await screen(points[0]);await page.mouse.move(p.x,p.y);await page.mouse.down();for(const point of points.slice(1)){p=await screen(point);await page.mouse.move(p.x,p.y,{steps})}await page.mouse.up();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
 const areas=before.objects.filter(o=>o.kind==='area'&&o.land?.role==='terrain-region'),pick=type=>areas.filter(o=>o.land.terrain===type).sort((a,b)=>b.width*b.height-a.width*a.height)[0]
 const centers=[]
 for(const [style,type] of [['rocky','mountains'],['forest','forest'],['grassland','desert'],['snow','snow'],['swamp','swamp']]){
  const area=pick(type)||pick('forest'),x=area.x+area.width*.5,y=area.y+area.height*.5
  centers.push({style,x,y});await controls.getByLabel('Style',{exact:true}).selectOption(style)
  const n=await counts();await stroke([{x:x-60,y:y+15},{x:x-20,y:y-10},{x:x+30,y:y+8},{x:x+60,y:y-15}]);assert.equal(await counts(),n+1,'one history entry per '+style)
 }
 const painted=await current();assert.deepEqual(painted.objects,before.objects);assert.deepEqual(painted.map.generation,before.map.generation);assert(Object.keys(painted.map.terrainPaint.tiles).length>0)
 await page.screenshot({path:path.join(root,'painted-world.png')})
 const c=centers[2];await controls.getByLabel('Mode',{exact:true}).selectOption('erase');await controls.getByLabel('Strength (%)',{exact:true}).fill('65');await stroke([{x:c.x-30,y:c.y},{x:c.x,y:c.y-10}]);const erased=await current();assert(!equivalent(erased.map.terrainPaint,painted.map.terrainPaint));await page.getByRole('button',{name:/^Undo:/}).click();assert(equivalent((await current()).map.terrainPaint,painted.map.terrainPaint));await page.getByRole('button',{name:/^Redo:/}).click();assert(equivalent((await current()).map.terrainPaint,erased.map.terrainPaint))
 await controls.getByLabel('Mode',{exact:true}).selectOption('blend');await stroke([{x:c.x-60,y:c.y},{x:c.x+60,y:c.y}]);await page.screenshot({path:path.join(root,'erase-and-blend.png')})
 const expected=await current();const n=await counts();let p=await screen({x:600,y:400});await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+30,p.y+30,{steps:3});await page.keyboard.press('Escape');await page.mouse.up();assert(equivalent((await current()).map,expected.map));assert.equal(await counts(),n,'cancelled stroke')
 // A hidden/locked paint layer must refuse painting without changing semantic selection.
 await page.getByRole('tab',{name:'Layers',exact:true}).click();await page.getByRole('button',{name:'Lock Terrain paint',exact:true}).click();const locked=await current();await stroke([{x:600,y:400},{x:650,y:410}]);assert(equivalent((await current()).map,locked.map));await page.getByRole('button',{name:'Unlock Terrain paint',exact:true}).click();await page.getByRole('button',{name:'Hide Terrain paint',exact:true}).click();await page.screenshot({path:path.join(root,'hidden-paint.png')});await page.getByRole('button',{name:'Show Terrain paint',exact:true}).click()
 // Navigation never becomes a paint gesture; losing focus cancels an unfinished stroke.
 const navigationMap=(await current()).map
 p=await screen({x:500,y:300});await page.mouse.move(p.x,p.y);await page.mouse.down({button:'middle'});await page.mouse.move(p.x+24,p.y+18,{steps:3});await page.mouse.up({button:'middle'});assert(equivalent((await current()).map,navigationMap))
 await page.keyboard.down('Space');await page.mouse.down();await page.mouse.move(p.x+40,p.y+35,{steps:3});await page.mouse.up();await page.keyboard.up('Space');assert(equivalent((await current()).map,navigationMap))
 p=await screen({x:500,y:300});await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+20,p.y+10,{steps:2});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();assert(equivalent((await current()).map,navigationMap))
 await page.getByRole('button',{name:'Fit to map',exact:true}).click();p=await screen({x:300,y:320});await page.mouse.move(p.x,p.y);await page.screenshot({path:path.join(root,'brush-footprint.png')})
 // Same actual pointer stroke, identical mask result at four zoom levels.
 const zoomProof=[]
 await controls.getByLabel('Mode',{exact:true}).selectOption('paint');await controls.getByLabel('Style',{exact:true}).selectOption('rocky');await controls.getByLabel('Size (map px)',{exact:true}).fill('60');await controls.getByLabel('Softness (%)',{exact:true}).fill('65');await controls.getByLabel('Strength (%)',{exact:true}).fill('40')
 const zoomBase=await current()
 for(const zoom of [.5,1,2,4]){
  await page.evaluate(async({map,zoom})=>{const {useProjectStore:p}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts');p.setState({map});e.setState({viewport:{zoom,pan:{x:180-600*zoom,y:200-400*zoom}}})},{map:zoomBase.map,zoom})
  await stroke([{x:600,y:400},{x:640,y:410}],1);zoomProof.push((await current()).map.terrainPaint)
 }
 zoomProof.forEach(p=>assert(equivalent(p,zoomProof[0]),'zoom-independent pointer painting'))
 await page.evaluate(async map=>(await import('/src/store/projectStore.ts')).useProjectStore.setState({map}),zoomBase.map)
 await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.mouse.move(20,20)
 // Editor art excludes the separate footprint layer; compare every RGBA channel at both scales.
 const proof=await page.evaluate(async()=>{const {exportPng}=await import('/src/export/render.ts'),{currentSnapshot}=await import('/src/projects/session.ts');const s=currentSnapshot(),read=blob=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)}),exports=[],editors=[];for(const scale of [1,2]){exports.push(await read(await exportPng(s,{scale,transparent:false,includeGrid:false})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const stage=window.Konva.stages[0],node=stage.findOne('.map-art').clone(),water=stage.findOne('.water-surface').clone();node.add(water);water.moveToBottom();editors.push(node.toCanvas({x:0,y:0,width:s.map.width,height:s.map.height,pixelRatio:scale}).toDataURL());node.destroy()}return{exports,editors}})
 const parity=[];for(let i=0;i<2;i++){await fs.writeFile(path.join(root,'paint-'+(i+1)+'x.png'),Buffer.from(proof.exports[i].split(',')[1],'base64'));const a=await sharp(Buffer.from(proof.exports[i].split(',')[1],'base64')).ensureAlpha().raw().toBuffer(),b=await sharp(Buffer.from(proof.editors[i].split(',')[1],'base64')).ensureAlpha().raw().toBuffer();assert.equal(a.length,b.length);let max=0,total=0,large=0;for(let j=0;j<a.length;j++){const d=Math.abs(a[j]-b[j]);max=Math.max(max,d);total+=d;if(d>3)large++}parity.push({scale:i+1,max,mean:total/a.length,large});await fs.writeFile(path.join(root,'paint-'+(i+1)+'x-editor.png'),Buffer.from(proof.editors[i].split(',')[1],'base64'));assert(total/a.length<.05&&large/a.length<.0001,'parity '+JSON.stringify(parity.at(-1)))}
 await page.screenshot({path:path.join(root,'final-editor.png')})
 const saved=await current(),id=(await api('/startup-project')).id
 await poll(async()=>equivalent((await api('/projects/'+id)).document.map.terrainPaint,saved.map.terrainPaint),'autosave paint')
 await page.getByRole('button',{name:'Save',exact:true}).click();await poll(async()=>equivalent((await api('/projects/'+id)).document.map.terrainPaint,saved.map.terrainPaint),'manual save');await page.reload();await expect.poll(async()=>(await current()).objects.length).toBe(saved.objects.length);assert(equivalent((await current()).map,saved.map),'reload map');assert(equivalent((await current()).objects,saved.objects),'reload objects')
 const performanceResult=await page.evaluate(async()=>{
  const {TerrainStroke,defaultTerrainBrush}=await import('/src/domain/terrainBrush.ts'),{paintTerrain}=await import('/src/canvas/drawTerrainPaint.ts'),{validateTerrainPaint}=await import('/src/domain/terrainPaint.ts')
  let paint;const times=[],map={width:4096,height:3072}
  for(let i=0;i<120;i++){const start=performance.now(),s=new TerrainStroke(paint,{...defaultTerrainBrush,size:100,style:['rocky','forest','snow','swamp'][i%4]},map),x=100+(i*139)%3700,y=100+(i*199)%2700;s.add({x,y});s.add({x:x+180,y:y+40});paint=s.finish();times.push(performance.now()-start)}
  validateTerrainPaint(paint);const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=3072;const ctx=canvas.getContext('2d'),render=[]
  for(let i=0;i<4;i++){ctx.clearRect(0,0,canvas.width,canvas.height);const t=performance.now();paintTerrain(ctx,paint);render.push(performance.now()-t)}
  window.stressPaint=paint;
  const blendTimes=[];for(const brushSize of [120,512]){const s=new TerrainStroke(paint,{...defaultTerrainBrush,mode:'blend',size:brushSize},map),t=performance.now();s.add({x:600,y:600});s.finish();blendTimes.push({size:brushSize,ms:performance.now()-t})}
  return{blendTimes,strokes:120,tiles:Object.keys(paint.tiles).length,bytes:JSON.stringify(paint).length,strokeP95:times.sort((a,b)=>a-b)[113],strokeMax:Math.max(...times),renderMs:render}
 });assert(performanceResult.strokeP95<200,'stroke latency');assert(Math.max(...performanceResult.blendTimes.map(v=>v.ms))<150,'blend latency');assert(Math.max(...performanceResult.renderMs.slice(1))<100,'warm rendering')
 // Actual editor gesture with the stress paint layer and 700+ visible map objects.
 await page.evaluate(async()=>{const {useProjectStore:p}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts');const state=p.getState(),stamps=state.objects.filter(o=>o.kind==='stamp'),extra=Array.from({length:600},(_,i)=>({...stamps[i%stamps.length],id:'paint-stress-'+i,x:100+(i*131)%3800,y:100+(i*197)%2800})),layer=state.layers.find(l=>l.objectIds.includes(stamps[0].id));p.setState({map:{...state.map,width:4096,height:3072,terrainPaint:window.stressPaint},objects:[...state.objects,...extra],layers:state.layers.map(l=>l.id===layer.id?{...l,objectIds:[...l.objectIds,...extra.map(o=>o.id)]}:l)});e.setState({activeTool:'terrainBrush'})})
 await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
 await page.evaluate(()=>{window.paintFrames=[];window.paintFrameActive=true;let last=performance.now();const tick=t=>{window.paintFrames.push(t-last);last=t;if(window.paintFrameActive)requestAnimationFrame(tick)};requestAnimationFrame(tick)})
 await stroke([{x:500,y:500},{x:1400,y:700}],60)
 const interactive=await page.evaluate(()=>{window.paintFrameActive=false;const frames=window.paintFrames.slice(3).sort((a,b)=>a-b);return{visibleImages:window.Konva.stages[0].find('Image').length,frames:frames.length,median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1)}});performanceResult.interactive=interactive
 await page.screenshot({path:path.join(root,'stress-editor.png')});assert(interactive.p95<150,'interactive paint latency '+JSON.stringify(interactive))
 await page.evaluate(async snapshot=>(await import('/src/store/projectStore.ts')).useProjectStore.setState(snapshot),saved)
 await page.setViewportSize({width:1280,height:720});await page.getByRole('button',{name:'Terrain Brush',exact:true}).click();await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.screenshot({path:path.join(root,'layout-1280x720.png')});assert(await controls.getByRole('button',{name:'Done',exact:true}).isVisible())
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'results.json'),JSON.stringify({parity,performanceResult,objects:saved.objects.length,generatedStamps:saved.map.generation.scatter.placements.length,centers,zoomLevels:[.5,1,2,4],errors},null,2));console.log('PASS terrain paint UI/modes, semantics, undo/redo, cancellation/lock, zoom, autosave/save/reload, 1x/2x parity, performance. Evidence '+root)
}catch(e){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Evidence '+root);throw e}
finally{await browser?.close();vite?.kill();if(health)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});if(service?.exitCode===null)service.kill()}
