import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import sharp from 'sharp'
const packageDir=path.resolve(process.argv[2]||'distribution.local/Mapweaver-GeographyFinish-20260926'),exe=path.join(packageDir,'Mapweaver.exe'),out=path.resolve('deliverables.local/Velanth-GeographyFinish'),data=path.resolve('.qa.local/geography-finish/packaged-data'),base='http://127.0.0.1:48044'
const env={...process.env,MAPWEAVER_PORT:'48044',MAPWEAVER_DATA_DIR:data},pause=ms=>new Promise(r=>setTimeout(r,ms))
await fs.mkdir(data,{recursive:true})
const launcher=spawn(exe,['--no-browser','--test'],{cwd:packageDir,env,windowsHide:true,stdio:'ignore'})
let browser,h,page
const results={package:packageDir,executable:exe,errors:[],resourceErrors:[],checks:[]}
const check=(condition,message)=>{if(!condition)throw Error(message);results.checks.push(message);console.log(message)}
const api=async u=>{const r=await fetch(base+'/api/v1'+u,{headers:{'X-Mapweaver':'1','X-Mapweaver-Instance':h.instanceId,'X-Mapweaver-Generation':h.generation}});if(!r.ok)throw Error(await r.text());return r.json()}
const until=async(fn,description)=>{for(let i=0;i<100;i++){const r=await fn();if(r)return r;await pause(300)}throw Error('Timeout: '+description)}
try {
 await until(async()=>{try{h=await fetch(base+'/api/v1/health').then(r=>r.json());return !!h.supervisorId}catch{return false}},'launcher health')
 check(launcher.exitCode===null&&!!h.supervisorId,'Windows executable started supervised packaged service')
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true})
 page.on('pageerror',e=>results.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\/(assets|fonts)\//.test(r.url()))results.resourceErrors.push(r.url()+':'+r.status())})
 page.on('dialog',d=>d.type()==='prompt'?d.accept('Geography package smoke'):d.accept())
 await page.goto(base)
 const setup=page.getByRole('dialog',{name:'Create your first campaign'});await pause(1500)
 if(await setup.isVisible()){await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.getByRole('button',{name:'+ Map',exact:true}).waitFor()}
 await page.getByLabel('Mapweaver project file').setInputFiles(out+'/Velanth-GeographyFinish.mapweaver')
 const identity=page.locator('[class*="identity"] strong').first()
 await until(async()=>await identity.textContent()==='Velanth-GeographyFinish','imported map identity')
 await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.evaluate(()=>document.fonts.ready);await pause(2000)
 const rows=await api('/projects'),row=rows.find(r=>r.name==='Velanth-GeographyFinish'),read=async()=>(await api('/projects/'+row.id)).document,before=await read()
 check(before.objects.length===538&&before.map.geographyFinish?.relief.enabled,'Benchmark imported with relief and native rivers')
 await page.getByRole('tab',{name:'Map',exact:true}).click();await page.getByText('Geography & terrain finish',{exact:true}).click();await page.getByLabel('Relief strength').waitFor({state:'visible'})
 check(await page.getByLabel('Relief strength').inputValue()==='0.45','Packaged geography controls show saved settings')
 await page.screenshot({path:out+'/packaged-editor.png'})
 // Real pointer strokes, service autosave proof, then undo back to the benchmark.
 const point=async(x,y)=>page.evaluate(({x,y})=>{const s=window.Konva.stages[0],p=s.getAbsoluteTransform().point({x,y}),r=s.container().getBoundingClientRect();return{x:r.x+p.x,y:r.y+p.y}},{x,y})
 await page.getByRole('button',{name:'Terrain Brush',exact:true}).click();await page.getByLabel('Style',{exact:true}).selectOption('volcanic');await page.getByLabel('Size (map px)',{exact:true}).fill('40');await page.getByRole('button',{name:'Fit to map',exact:true}).click()
 let p=await point(1100,900);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+12,p.y+5,{steps:4});await page.mouse.up()
 await until(async()=>!isDeepStrictEqual((await read()).map.terrainPaint,before.map.terrainPaint),'paint autosave')
 check(true,'Terrain Brush pointer stroke persisted by autosave')
 await page.getByRole('button',{name:/^Undo: Paint terrain/}).click();await until(async()=>isDeepStrictEqual((await read()).map.terrainPaint,before.map.terrainPaint),'paint undo autosave')
 await page.getByRole('button',{name:'Land / Water',exact:true}).click();await page.getByLabel('Land brush preset').selectOption('Island');await page.getByRole('button',{name:'Fit to map',exact:true}).click()
 p=await point(2100,200);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+8,p.y+2,{steps:3});await page.mouse.up()
 await until(async()=>!isDeepStrictEqual((await read()).objects,before.objects),'land autosave')
 check(true,'Land / Water Brush pointer stroke persisted by autosave')
 await page.getByRole('button',{name:/^Undo:/}).click();await until(async()=>isDeepStrictEqual((await read()).objects,before.objects),'land undo autosave')
 await page.getByRole('button',{name:'Select',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click()
 await until(async()=>['saved','clean'].includes(await page.locator('[data-save-state]').getAttribute('data-save-state')),'save status')
 const saved=await read();for(const key of ['map','objects','layers','layerTree','objectGroups'])check(isDeepStrictEqual(saved[key],before[key]),'Brush undo and save preserve '+key)
 await page.reload();await until(async()=>await identity.textContent()==='Velanth-GeographyFinish','last map reopened');await page.getByRole('region',{name:'Map canvas'}).waitFor();await pause(2000)
 check(true,'Last campaign and map reopened after reload')
 await page.getByRole('button',{name:'Export PNG',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Export PNG'});results.exports=[]
 for(const scale of [1,2]){
  await page.getByLabel('PNG export scale').selectOption(String(scale));const start=performance.now(),download=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download PNG',exact:true}).click();const file=await download;const target=out+'/packaged-'+scale+'x.png';await file.saveAs(target)
  const meta=await sharp(target).metadata();check(meta.width===2400*scale&&meta.height===1600*scale,'Packaged '+scale+'x PNG dimensions and decode')
  results.exports.push({scale,ms:performance.now()-start,width:meta.width,height:meta.height})
 }
 await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.screenshot({path:out+'/packaged-reopened.png'})
 check(!results.errors.length&&!results.resourceErrors.length,'No browser or bundled resource errors')
} catch(e){results.failure=e.message;if(page)await page.screenshot({path:out+'/packaged-failure.png'}).catch(()=>{});throw e}
finally {
 await fs.writeFile(out+'/packaged-smoke.json',JSON.stringify(results,null,2))
 const stop=spawn(exe,['--stop','--wait','--test'],{cwd:packageDir,env,windowsHide:true,stdio:'ignore'})
 const code=await new Promise(r=>stop.on('exit',r));console.log('Launcher stop exit:',code)
 results.shutdownExit=code;await browser?.close();await fs.writeFile(out+'/packaged-smoke.json',JSON.stringify(results,null,2));if(code!==0)process.exitCode=1
}
