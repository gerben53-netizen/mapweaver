import {isDeepStrictEqual} from 'node:util'
const equivalent=(a,b)=>isDeepStrictEqual(JSON.parse(JSON.stringify(a??null)),JSON.parse(JSON.stringify(b??null)))
import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
const root=path.resolve('.qa.local','land-brush-'+Date.now()),base='http://127.0.0.1:48030',web='http://127.0.0.1:5187',token=crypto.randomUUID()
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

 await page.getByRole('button',{name:'+ Map',exact:true}).click();const creation=page.getByRole('dialog',{name:'New map',exact:true});await creation.getByLabel('Name',{exact:true}).fill('Land Brush proof');await creation.getByLabel('Map type',{exact:true}).selectOption('world-map');await creation.getByRole('button',{name:'Create map',exact:true}).click();await expect(page.getByRole('region',{name:'Map canvas'})).toBeVisible()


 await page.evaluate(async()=>{
  const {themeFixture}=await import('/tests/fixtures/worldThemes.ts'),{generateWorld}=await import('/src/world/generate.ts'),{WORLD_DEFAULTS}=await import('/src/world/model.ts'),{scatterWorld}=await import('/src/world/scatterWorld.ts'),{loadWorldScatterAssets}=await import('/src/world/scatterResources.ts'),{themeWorld}=await import('/src/world/themeWorld.ts'),{useProjectStore:p}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts'),{history}=await import('/src/store/history.ts')
  await themeFixture({...p.getState().map,width:1200,height:800}) // installs isolated QA source stamps
  const generated=themeWorld(scatterWorld(generateWorld({...WORLD_DEFAULTS,width:1200,height:800,seed:'brush-world'}),{mountains:'medium',forests:'medium',details:'off',theme:'painterlyFantasy'},await loadWorldScatterAssets()),'world.painterlyFantasy')
  history.run('Generated fixture',()=>p.setState({map:generated.map,objects:generated.objects,layers:generated.layers,layerTree:generated.layerTree,objectGroups:[]}));history.reset();e.setState({selectedObjectIds:[],activeLayerId:generated.layers[0].id,activeTool:'select'})
 })
 const current=()=>page.evaluate(async()=>(await import('/src/projects/session.ts')).currentSnapshot())
 const counts=()=>page.evaluate(async()=>(await import('/src/store/history.ts')).useHistoryStore.getState().undoCount)
 await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.screenshot({path:path.join(root,'before.png')})

 await page.getByRole('button',{name:'Land / Water',exact:true}).click()
 const controls=page.getByLabel('Land / Water controls',{exact:true})
 const screen=async p=>page.evaluate(async p=>{const {viewport:v}=(await import('/src/store/editorStore.ts')).useEditorStore.getState(),r=document.querySelector('[aria-label="Map canvas"]').getBoundingClientRect();return{x:r.x+v.pan.x+p.x*v.zoom,y:r.y+v.pan.y+p.y*v.zoom}},p)
 const config=async patch=>page.evaluate(async patch=>{const {useLandBrushStore:b}=await import('/src/store/landBrushStore.ts');b.setState({settings:{...b.getState().settings,...patch}})},patch)
 const stroke=async(points,expected=true)=>{const n=await counts();let p=await screen(points[0]);await page.mouse.move(p.x,p.y);await page.mouse.down();for(const point of points.slice(1)){p=await screen(point);await page.mouse.move(p.x,p.y,{steps:8})}await page.mouse.up();await expect.poll(async()=>page.evaluate(async()=>(await import('/src/store/landBrushStore.ts')).useLandBrushStore.getState().busy)).toBe(false);if(expected)assert.equal(await counts(),n+1,'one stroke: '+await page.evaluate(async()=>(await import('/src/store/editorStore.ts')).useEditorStore.getState().message));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
 const points=await page.evaluate(async()=>{
  const {useProjectStore:p}=await import('/src/store/projectStore.ts'),{isLandmass}=await import('/src/domain/landEditing.ts');const lands=p.getState().objects.filter(isLandmass),land=lands.sort((a,b)=>b.width*b.height-a.width*a.height)[0]
  const inside=(p,ring)=>{let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)result=!result}return result}
  const onLand=p=>lands.some(o=>o.geometry.polygons.some(poly=>inside(p,poly.outer)&&!poly.holes.some(h=>inside(p,h))))
  const rings=lands.flatMap(o=>o.geometry.polygons.flatMap(p=>[p.outer,...p.holes]));const distance=p=>Math.min(...rings.flatMap(r=>r.map(q=>Math.hypot(p.x-q.x,p.y-q.y))))
  const candidates=[];for(let y=100;y<700;y+=25)for(let x=100;x<1100;x+=25)candidates.push({x,y})
  const lake=candidates.filter(onLand).sort((a,b)=>distance(b)-distance(a))[0]
  const water=candidates.filter(p=>!onLand(p)&&distance(p)>75);const island=water[0],island2=water.find(p=>Math.hypot(p.x-island.x,p.y-island.y)>180)
  const edge=land.geometry.polygons[0].outer.filter(p=>p.x>150&&p.x<1000&&p.y>150&&p.y<650).sort((a,b)=>b.x-a.x)[0]
  return{edge,lake,island,island2,landId:land.id}
 });console.log('Workflow points',points)
 await config({action:'add',shape:'organic',size:130,softness:.2,roughness:.4});await stroke([points.edge,{x:points.edge.x+70,y:points.edge.y}]);await page.screenshot({path:path.join(root,'extended-continent.png')})
 await config({action:'remove',shape:'round',size:65,softness:0});await stroke([{x:points.edge.x+75,y:points.edge.y},{x:points.edge.x-30,y:points.edge.y}]);await page.screenshot({path:path.join(root,'bay.png')})
 await config({action:'add',shape:'island',size:90});await stroke([points.island]);await stroke([points.island2]);await page.screenshot({path:path.join(root,'two-islands.png')})
 await config({shape:'peninsula',size:110});await stroke([points.island,{x:points.island.x+110,y:points.island.y+15}]);await page.screenshot({path:path.join(root,'peninsula.png')})
 // Cover a deep land location with both native biome geometry and visual paint, then remove its land.
 await page.evaluate(async point=>{const {useProjectStore:p}=await import('/src/store/projectStore.ts'),{createArea,rectangleGeometry}=await import('/src/domain/areas.ts'),{defaultLandArea}=await import('/src/domain/landAreas.ts'),{TerrainStroke,defaultTerrainBrush}=await import('/src/domain/terrainBrush.ts');const s=p.getState(),area={...createArea(rectangleGeometry({x:point.x-45,y:point.y-45,width:90,height:90})),id:'clip-proof',land:defaultLandArea('terrain-region')},stroke=new TerrainStroke(undefined,{...defaultTerrainBrush,size:130,softness:0,style:'grassland'},s.map);stroke.add(point);p.setState({objects:[...s.objects,area],layers:s.layers.map((l,i)=>i===0?{...l,objectIds:[...l.objectIds,area.id]}:l),map:{...s.map,terrainPaint:stroke.finish()}})},points.lake)
 const beforeLake=await current();await config({action:'remove',shape:'round',size:100,softness:0});await stroke([points.lake]);const lake=await current();assert(lake.objects.some(o=>o.kind==='area'&&o.land?.role==='landmass'&&o.geometry.polygons.some(p=>p.holes.length)),'inland hole');assert(equivalent(lake.map.terrainPaint,beforeLake.map.terrainPaint),'paint source retained');assert(equivalent(lake.objects.find(o=>o.id==='clip-proof'),beforeLake.objects.find(o=>o.id==='clip-proof')),'biome source retained')
 await page.screenshot({path:path.join(root,'lake-and-clipping.png')});await page.getByRole('button',{name:/^Undo:/}).click();assert(equivalent((await current()).objects,beforeLake.objects));await page.getByRole('button',{name:/^Redo:/}).click();assert(equivalent((await current()).objects,lake.objects))
 await config({action:'roughen',size:180,roughness:.7,shape:'jagged'});await stroke([{x:points.island.x,y:points.island.y+30}]);await page.screenshot({path:path.join(root,'roughened-coast.png')})
 await config({action:'smooth',size:160,smoothing:'high'});await stroke([{x:points.island2.x,y:points.island2.y}]);await page.screenshot({path:path.join(root,'smoothed-shore.png')})
 // Actual Alt inversion, preview-only mutation, Escape and focus cancellation.
 await config({action:'add',shape:'round',size:35,roughness:0});const cancelBase=await current(),n=await counts();let p=await screen(points.island2);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+20,p.y+10,{steps:4});await page.keyboard.press('Escape');await page.mouse.up();assert(equivalent(await current(),cancelBase));assert.equal(await counts(),n)
 await page.keyboard.down('Alt');await stroke([points.island2]);await page.keyboard.up('Alt');assert((await current()).objects.find(o=>o.kind==='area'&&o.geometry.polygons.some(p=>p.holes.length)),'inversion removes')
 await page.mouse.move(20,20)
 const proof=await page.evaluate(async()=>{const {exportPng}=await import('/src/export/render.ts'),{currentSnapshot}=await import('/src/projects/session.ts');const s=currentSnapshot(),read=blob=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)}),exports=[],editors=[];for(const scale of [1,2]){exports.push(await read(await exportPng(s,{scale,transparent:false,includeGrid:false})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const stage=window.Konva.stages[0],node=stage.findOne('.map-art').clone(),water=stage.findOne('.water-surface').clone();node.add(water);water.moveToBottom();editors.push(node.toCanvas({x:0,y:0,width:s.map.width,height:s.map.height,pixelRatio:scale}).toDataURL());node.destroy()}return{exports,editors}})
 const parity=[];for(let i=0;i<2;i++){await fs.writeFile(path.join(root,'land-'+(i+1)+'x.png'),Buffer.from(proof.exports[i].split(',')[1],'base64'));const a=await sharp(Buffer.from(proof.exports[i].split(',')[1],'base64')).ensureAlpha().raw().toBuffer(),b=await sharp(Buffer.from(proof.editors[i].split(',')[1],'base64')).ensureAlpha().raw().toBuffer();assert.equal(a.length,b.length);let max=0,total=0,large=0;for(let j=0;j<a.length;j++){const d=Math.abs(a[j]-b[j]);max=Math.max(max,d);total+=d;if(d>3)large++}parity.push({scale:i+1,max,mean:total/a.length,large});await fs.writeFile(path.join(root,'land-'+(i+1)+'x-editor.png'),Buffer.from(proof.editors[i].split(',')[1],'base64'));assert(total/a.length<.05&&large/a.length<.0001,'parity '+JSON.stringify(parity.at(-1)))}
 await page.screenshot({path:path.join(root,'final-editor.png')})
 const saved=await current(),id=(await api('/startup-project')).id
 await poll(async()=>equivalent((await api('/projects/'+id)).document.map.landEditing,saved.map.landEditing),'autosave paint')
 await page.getByRole('button',{name:'Save',exact:true}).click();await poll(async()=>equivalent((await api('/projects/'+id)).document.map.landEditing,saved.map.landEditing),'manual save');await page.reload();await expect.poll(async()=>(await current()).objects.length).toBe(saved.objects.length);assert(equivalent((await current()).map,saved.map),'reload map');assert(equivalent((await current()).objects,saved.objects),'reload objects')

 const clipProof=await page.evaluate(async()=>{const {exportPng}=await import('/src/export/render.ts'),{currentSnapshot}=await import('/src/projects/session.ts'),s=currentSnapshot(),objects=s.objects.filter(o=>o.id!=='clip-proof');const blob=await exportPng({...s,map:{...s.map,terrainPaint:undefined},objects,layers:s.layers.map(l=>({...l,objectIds:l.objectIds.filter(id=>id!=='clip-proof')}))},{scale:1,transparent:false,includeGrid:false});return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)})})
 const crop={left:Math.round(points.lake.x-8),top:Math.round(points.lake.y-8),width:16,height:16};const clipped=await sharp(Buffer.from(proof.exports[0].split(',')[1],'base64')).extract(crop).raw().toBuffer(),clean=await sharp(Buffer.from(clipProof.split(',')[1],'base64')).extract(crop).raw().toBuffer();assert.deepEqual(clipped,clean,'water in lake has no biome or paint pixels')
 const performanceResult=await page.evaluate(async()=>{
  const {applyLandStroke,defaultLandBrush}=await import('/src/domain/landBrush.ts'),{generateWorld}=await import('/src/world/generate.ts'),{WORLD_DEFAULTS}=await import('/src/world/model.ts'),{isLandmass}=await import('/src/domain/landEditing.ts'),{allRings}=await import('/src/domain/areas.ts')
  const world=generateWorld({...WORLD_DEFAULTS,width:4096,height:2800,seed:'land-stress'}),lands=world.objects.filter(isLandmass),results=[]
  for(const size of [24,180,1200]){const p=lands[0].geometry.polygons[0].outer[5],times=[];let vertices=0;for(let i=0;i<5;i++){const start=performance.now(),r=applyLandStroke({lands,editable:lands.map(o=>o.id),map:world.map,brush:{...defaultLandBrush,size},points:[p,{x:p.x+size*.7,y:p.y+size*.1}],newId:'test',seed:1});times.push(performance.now()-start);vertices=r.replacements.reduce((n,o)=>n+allRings(o.geometry).flat().length,0)}results.push({size,times,vertices})}
  const {createArea}=await import('/src/domain/areas.ts'),{defaultLandArea}=await import('/src/domain/landAreas.ts'),{calculateLandStroke}=await import('/src/canvas/landBrushClient.ts')
  const complex=Array.from({length:180},(_,i)=>{const center={x:60+(i%18)*220,y:60+Math.floor(i/18)*260},count=i===0?500:48,outer=Array.from({length:count},(_,j)=>{const t=j*2*Math.PI/count,r=35*(1+.13*Math.sin(t*(i===0?75:7)));return{x:center.x+Math.cos(t)*r,y:center.y+Math.sin(t)*r}});return{...createArea({polygons:[{outer,holes:[]}]}),id:'stress-'+i,land:defaultLandArea('landmass')}})
  const start=performance.now(),edited=await calculateLandStroke({lands:complex,editable:complex.map(o=>o.id),map:world.map,brush:{...defaultLandBrush,size:100},points:[{x:90,y:60},{x:170,y:60}],newId:'stress-added',seed:1},new AbortController().signal),workerMs=performance.now()-start
  const stress={islands:complex.length,sourceVertices:complex.reduce((n,o)=>n+allRings(o.geometry).flat().length,0),resultVertices:edited.replacements.reduce((n,o)=>n+allRings(o.geometry).flat().length,0),workerMs}
  return{stress,map:[4096,2800],lands:lands.length,vertices:lands.reduce((n,o)=>n+allRings(o.geometry).flat().length,0),results}
 });console.log('Performance',JSON.stringify(performanceResult));assert(performanceResult.results.every(r=>Math.max(...r.times)<1500),'bounded geometry latency')
 await page.setViewportSize({width:1280,height:720});await page.getByRole('button',{name:'Land / Water',exact:true}).click();await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.screenshot({path:path.join(root,'layout-1280x720.png')});assert(await controls.getByRole('button',{name:'Done',exact:true}).isVisible())
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'results.json'),JSON.stringify({parity,performanceResult,points,objects:saved.objects.length,errors},null,2));console.log('PASS land brush generated-world workflow, undo/redo, cancellation, autosave/save/reload, 1x/2x parity and performance. Evidence '+root)
}catch(e){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Evidence '+root);throw e}
finally{await browser?.close();vite?.kill();if(health)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});if(service?.exitCode===null)service.kill()}
