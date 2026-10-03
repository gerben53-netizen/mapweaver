import { chromium, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'

const root=path.resolve('.qa.local/premium-terrain/ui'),out=path.resolve('deliverables.local/Velanth-BrushTextureQuality')
const web='http://127.0.0.1:5193',base='http://127.0.0.1:48045',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'ignore',env:{...process.env,MAPWEAVER_PORT:'48045',MAPWEAVER_DATA_DIR:root+'/data',MAPWEAVER_CONTROL_TOKEN:token,MAPWEAVER_DEV_ORIGIN:web}})
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5193','--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,MAPWEAVER_PORT:'48045'}})
let h,browser,page
const api=async(u,method='GET',body)=>{const r=await fetch(base+'/api/v1'+u,{method,headers:{'Content-Type':Buffer.isBuffer(body)?'application/zip':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':h.instanceId,'X-Mapweaver-Generation':h.generation,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});if(!r.ok)throw Error(await r.text());return r.json()}
try{
  for(let i=0;i<100;i++){try{h=await fetch(base+'/api/v1/health').then(r=>r.json());if(h.pid===service.pid&&(await fetch(web)).ok)break}catch{/* Service may still be starting. */}await new Promise(r=>setTimeout(r,300))}
  assert.equal(h?.pid,service.pid)
  browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1280,height:720}})
  const measurement=await browser.newPage()
  await measurement.goto(web+'/tests/persistence/premium-terrain-preview.html')
  const coldLibrary=await measurement.evaluate(async()=>{const {PREMIUM_TERRAIN}=await import('/src/domain/premiumTerrain.ts'),{loadPremiumTexture,premiumTextureStats}=await import('/src/canvas/premiumTerrainTextures.ts');const t=performance.now();await Promise.all(PREMIUM_TERRAIN.map(v=>loadPremiumTexture(v.id)));return{ms:performance.now()-t,...premiumTextureStats()}})
  await measurement.close()
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(web);await page.waitForTimeout(700)
  if(await page.getByRole('dialog',{name:'Create your first campaign'}).isVisible()){page.once('dialog',d=>d.accept('Terrain material validation'));await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.getByRole('button',{name:'+ Map',exact:true}).waitFor()}
  const row=await api('/projects/import','POST',await fs.readFile(out+'/Velanth-BrushTextureQuality.mapweaver'))
  await page.evaluate(async id=>{await(await import('/src/projects/localSession.ts')).loadLocalProject(id,()=>true);await(await import('/src/canvas/premiumTerrainTextures.ts')).loadPaintTextures((await import('/src/store/projectStore.ts')).useProjectStore.getState().map.terrainPaint)},row.id)
  await page.getByRole('region',{name:'Map canvas'}).waitFor();await page.getByRole('button',{name:'Fit to map',exact:true}).click()
  await page.getByRole('button',{name:'Terrain Brush',exact:true}).click()
  await page.getByLabel('Material preset').selectOption('painterly.v1.foothill')
  await page.getByText('Browse terrain materials',{exact:true}).click()
  await page.getByLabel('Terrain family').selectOption('Forest floor')
  await expect(page.getByRole('button',{name:/Mossy Woodland Floor/})).toBeVisible()
  await page.getByLabel('Search materials').fill('mossy')
  await page.getByRole('button',{name:/Mossy Woodland Floor/}).click()
  const panel=await page.locator('[class*=materialPanel]').boundingBox()
  await page.screenshot({path:out+'/material-library-1280.png'})
  assert(panel.x>=0&&panel.x+panel.width<=1280,'library fits viewport')
  await page.getByText('Browse terrain materials',{exact:true}).click()
  // Loading failure is explicit; retry recovers and no broken stroke is committed.
  await page.route('**/terrain-textures-painterly/materials/grass-dry.png',route=>route.abort())
  await page.getByLabel('Material preset').selectOption('painterly.v1.grass-dry')
  await expect(page.getByRole('button',{name:'Retry texture',exact:true})).toBeVisible()
  await page.unroute('**/terrain-textures-painterly/materials/grass-dry.png')
  await page.getByRole('button',{name:'Retry texture',exact:true}).click()
  await expect(page.getByRole('button',{name:'Retry texture',exact:true})).not.toBeVisible()
  const performanceMetrics=await page.evaluate(async()=>{
    const {PREMIUM_TERRAIN}=await import('/src/domain/premiumTerrain.ts'),{loadPremiumTexture,premiumTextureStats}=await import('/src/canvas/premiumTerrainTextures.ts')
    const t=performance.now();await Promise.all(PREMIUM_TERRAIN.map(v=>loadPremiumTexture(v.id)))
    return {remainingLibraryLoadMs:performance.now()-t,...premiumTextureStats()}
  })
  performanceMetrics.coldLibrary=coldLibrary
  // Real mouse gesture, one history step, measured frames; restore the benchmark with undo.
  await page.getByLabel('Material preset').selectOption('painterly.v1.foothill')
  const start=await page.evaluate(async()=>{
    const {useEditorStore:e}=await import('/src/store/editorStore.ts'),{mapToScreen}=await import('/src/canvas/viewport.ts'),{currentSnapshot}=await import('/src/projects/session.ts'),{useHistoryStore}=await import('/src/store/history.ts')
    window.premiumBefore=currentSnapshot();window.premiumFrames=[];window.premiumRunning=true;let last=performance.now();const tick=t=>{window.premiumFrames.push(t-last);last=t;if(window.premiumRunning)requestAnimationFrame(tick)};requestAnimationFrame(tick)
    return {p:mapToScreen({x:840,y:780},e.getState().viewport),zoom:e.getState().viewport.zoom,undo:useHistoryStore.getState().undoCount}
  })
  const bounds=await page.getByRole('region',{name:'Map canvas'}).boundingBox()
  await page.mouse.move(bounds.x+start.p.x,bounds.y+start.p.y);const gestureStart=performance.now();await page.mouse.down();await page.mouse.move(bounds.x+start.p.x+100*start.zoom,bounds.y+start.p.y+35*start.zoom,{steps:30});await page.mouse.up()
  performanceMetrics.pointerGestureMs=performance.now()-gestureStart
  performanceMetrics.interaction=await page.evaluate(async()=>{window.premiumRunning=false;const {history,useHistoryStore}=await import('/src/store/history.ts'),{currentSnapshot}=await import('/src/projects/session.ts');const added=useHistoryStore.getState().undoCount;history.undo();const restored=JSON.stringify(window.premiumBefore)===JSON.stringify(currentSnapshot());const f=window.premiumFrames.slice(3).sort((a,b)=>a-b);return{undoCount:added,restored,frames:f.length,p95Ms:f[Math.floor(f.length*.95)],maxMs:f.at(-1)}})
  assert.equal(performanceMetrics.interaction.undoCount,start.undo+1);assert(performanceMetrics.interaction.restored)
  await page.mouse.move(20,20);await page.screenshot({path:out+'/brush-controls-1280.png'})
  const proof=await page.evaluate(async()=>{
    const {PREMIUM_TERRAIN,premiumBrushPreset}=await import('/src/domain/premiumTerrain.ts'),{TerrainStroke,defaultTerrainBrush}=await import('/src/domain/terrainBrush.ts'),{paintTerrain}=await import('/src/canvas/drawTerrainPaint.ts'),{defaultMapStyle}=await import('/src/domain/mapSettings.ts'),{defaultGeography}=await import('/src/domain/geography.ts'),{exportPng}=await import('/src/export/render.ts'),{useProjectStore:project}=await import('/src/store/projectStore.ts'),{useEditorStore:editorStore}=await import('/src/store/editorStore.ts'),{currentSnapshot}=await import('/src/projects/session.ts')
    const original=currentSnapshot();editorStore.setState({activeTool:'select'});
    const read=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)})
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=PREMIUM_TERRAIN.length*180;const ctx=canvas.getContext('2d');ctx.fillStyle='#a4ad8c';ctx.fillRect(0,0,canvas.width,canvas.height)
    const results=[],times=[]
    for(let i=0;i<PREMIUM_TERRAIN.length;i++)for(let j=0;j<3;j++){
      const t=PREMIUM_TERRAIN[i],factor=[.5,1,2][j],s=new TerrainStroke(undefined,{...defaultTerrainBrush,...premiumBrushPreset(t.id),textureScale:t.scale*factor,size:150,softness:.7,strength:.7},{width:1200,height:canvas.height})
      const start=performance.now();s.add({x:j*400+100,y:i*180+90});s.add({x:j*400+320,y:i*180+90});const p=s.finish();times.push(performance.now()-start);paintTerrain(ctx,p)
      ctx.fillStyle='#17231c';ctx.font='14px sans-serif';ctx.fillText(t.title+' · '+factor+'× default',j*400+12,i*180+18)
      if(i===0||i===4||i===8){
        const material=Object.values(p.materials)[0],full=(await import('/src/domain/terrainPaint.ts')).encodeMask(new Uint8Array(4096).fill(180)),key=Object.keys(p.materials)[0]
        const paint={...p,tiles:{'0,0':{[key]:full},'1,0':{[key]:full}},materials:{[key]:material}}
        const map={...defaultMapStyle(),width:256,height:128,background:null,mapType:'world-map',geography:defaultGeography('world-map'),terrainPaint:paint}
        const snapshot={map,objects:[],layers:[],objectGroups:[],layerTree:null}
        for(const scale of [1,2]){project.setState(snapshot);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const begin=performance.now(),png=await exportPng(snapshot,{scale,transparent:false,includeGrid:false}),stage=window.Konva.stages[0],node=stage.findOne('.map-art').clone(),water=stage.findOne('.water-surface').clone();node.add(water);water.moveToBottom();const editor=node.toCanvas({x:0,y:0,width:256,height:128,pixelRatio:scale}).toDataURL();node.destroy();results.push({id:t.id,factor,scale,ms:performance.now()-begin,png:await read(png),editor})}
      }
    }
    project.setState(original);times.sort((a,b)=>a-b)
    return {results,contact:canvas.toDataURL(),stroke:{samples:times.length,p95Ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1)}}
  })
  await fs.writeFile(out+'/materials-scale-contact.png',Buffer.from(proof.contact.split(',')[1],'base64'))
  const parity=[]
  for(const p of proof.results){const a=await sharp(Buffer.from(p.png.split(',')[1],'base64')).ensureAlpha().raw().toBuffer(),b=await sharp(Buffer.from(p.editor.split(',')[1],'base64')).ensureAlpha().raw().toBuffer();assert(a.equals(b),'material parity '+p.id+' '+p.factor+' '+p.scale);parity.push({id:p.id,factor:p.factor,scale:p.scale,ms:p.ms,differingChannels:0})}
  assert.deepEqual(errors,[])
  await fs.writeFile(out+'/material-validation.json',JSON.stringify({performanceMetrics,stroke:proof.stroke,parity,errors,loadFailureRetry:'passed',pointerUndo:'passed'},null,2))
  console.log(JSON.stringify({performanceMetrics,stroke:proof.stroke,parityCases:parity.length,errors}))
}catch(error){await page?.screenshot({path:root+'/failure.png'}).catch(()=>{});throw error}
finally{if(h?.pid===service.pid)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});await browser?.close();vite.kill();service.kill()}
