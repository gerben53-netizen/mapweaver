import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=path.resolve('.fonts.local',String(Date.now()));await fs.mkdir(root,{recursive:true})
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5178','--strictPort'],{windowsHide:true,stdio:'ignore'})
let browser
try {
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5178')).ok)break}catch { /* Expected during startup/shutdown; the owned-process check handles failure. */ }await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}})
 await page.route('**/font-proof',r=>r.fulfill({contentType:'text/html',body:'<html><body style="background:#eee"><div id="proof"></div></body></html>'}))
 await page.route('**/*.ttf',async r=>{await new Promise(resolve=>setTimeout(resolve,350));await r.continue()})
 await page.goto('http://127.0.0.1:5178/font-proof')
 const result=await page.evaluate(async()=>{
  const a=await import('/src/domain/annotations.ts'),d=await import('/src/domain/decorations.ts'),m=await import('/src/domain/mapSettings.ts'),g=await import('/src/domain/geography.ts'),r=await import('/src/fonts/registry.ts'),e=await import('/src/export/render.ts'),f=await import('/src/canvas/annotationFonts.ts')
  const map={width:1400,height:1500,...m.defaultMapStyle(),background:null,backgroundColor:'#ebe3ca',mapType:'world-map',geography:g.defaultGeography('world-map')},objects=[]
  const fonts=['cinzel','cormorantgaramond','ebgaramond','sourcesans3','imfellenglish']
  for(const [i,font] of fonts.entries()){
   const y=50+i*290,style={...a.DEFAULT_TEXT,font,size:30,maxWidth:260,backgroundOpacity:0,strokeWidth:1,strokeColor:'#fffaf0'}
   let label=a.restyleLabel(a.createLabel({x:160,y},'The Silver Coast'),style);label={...label,x:30,y,rotation:5,opacity:.8};objects.push(label)
   for(const [j,preset] of ['simple','ribbon'].entries()){const o=d.createMapElement('title',{x:0,y:0},map,[],preset);o.title='The Northern Kingdoms';o.body='Mountains and rivers';o.style={...style,maxWidth:350,size:32,bold:j===0,italic:j===1};const layout=d.panelLayout(o);objects.push({...o,x:340+j*440,y,width:layout.width,height:layout.height})}
   const legend=d.createMapElement('legend',{x:100,y:y+140},map,[{id:'entry',text:'Ancient forest',placeType:'landmark',color:'#345634'}]);legend.x=30;legend.font=font;legend.title=r.fontEntry(font).name;objects.push(legend)
  }
  const snapshot={map,objects,layers:[{id:'text',name:'Text',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['text'],groups:[]}}
  const recorded=new Set(),original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(...args){recorded.add(this.font);return original.apply(this,args)}
  const start=performance.now(),blob=await e.exportPng(snapshot,{scale:1,includeGrid:false,includeScaleBar:false,transparent:false}),elapsed=performance.now()-start
  CanvasRenderingContext2D.prototype.fillText=original
  const ctx=document.createElement('canvas').getContext('2d'),metricErrors=[];for(const entry of r.FONT_LIBRARY)for(const v of Object.keys(entry.variants)){const style={...a.DEFAULT_TEXT,font:entry.id,size:60,bold:v.includes('Bold'),italic:v.includes('Italic')};ctx.font=r.fontCSS(style);const difference=Math.abs(ctx.measureText('W').width-a.advance('W',style));if(difference>.1)metricErrors.push({font:entry.id,v,difference})}
  const faces=[...document.fonts].map(face=>({family:face.family,status:face.status,weight:face.weight,style:face.style}))
  const url=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob)})
  const img=document.createElement('img');img.src=url;img.style.width='100%';document.body.append(img)
  return {url,elapsed,faces,metricErrors,failures:f.fontFailures,recorded:[...recorded],fontCount:r.FONT_LIBRARY.length}
 })
 assert(result.elapsed>=300);assert.deepEqual(result.failures,[]);assert.deepEqual(result.metricErrors,[]);assert(result.faces.every(f=>f.status==='loaded'));assert(result.recorded.some(s=>s.includes('Cinzel')));assert(result.recorded.some(s=>s.includes('Cormorant Garamond')))
 await fs.writeFile(path.join(root,'fonts-export.png'),Buffer.from(result.url.split(',')[1],'base64'));await page.screenshot({path:path.join(root,'fonts-render.png'),fullPage:true})
 // Exercise the real shared picker in-browser without altering the user's service/data.
 await page.evaluate(async()=>{const Refresh=await import('/@react-refresh');Refresh.default.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;const React=await import('/node_modules/.vite/deps/react.js'),dom=await import('/node_modules/.vite/deps/react-dom_client.js'),{FontPicker}=await import('/src/app/FontPicker.tsx'),{DEFAULT_TEXT}=await import('/src/domain/annotations.ts');(dom.createRoot||dom.default.createRoot)(document.getElementById('proof')).render((React.createElement||React.default.createElement)(FontPicker,{value:{...DEFAULT_TEXT,font:'cinzel'},onChange:s=>window.choice=s}))})
 await page.getByRole('button',{name:'Choose font'}).click();await page.getByRole('button',{name:'Cinzel',exact:true}).focus();await page.keyboard.press('ArrowDown');await expect(page.getByRole('button',{name:'Marcellus SC',exact:true})).toBeFocused();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.choice.font),'marcellussc');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Choose font'})).toBeFocused()
 // A fresh page with failed local font requests still exports and reports degradation.
 const failed=await browser.newPage();await failed.route('**/font-proof',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await failed.route('**/*.ttf',r=>r.abort());await failed.goto('http://127.0.0.1:5178/font-proof');const fallback=await failed.evaluate(async()=>{const f=await import('/src/canvas/annotationFonts.ts'),a=await import('/src/domain/annotations.ts'),m=await import('/src/domain/mapSettings.ts'),e=await import('/src/export/render.ts');const o=a.createLabel({x:200,y:200},'Fallback text'),blob=await e.exportPng({map:{width:500,height:400,...m.defaultMapStyle(),background:null},objects:[o],layers:[{id:'text',name:'Text',visible:true,locked:false,objectIds:[o.id]}],layerTree:{roots:['text'],groups:[]},objectGroups:[]},{scale:1,includeGrid:false,transparent:false});return {failures:f.fontFailures,bytes:blob.size}});assert(fallback.failures.length===9);assert(fallback.bytes>100)
 const summary={...result};delete summary.url;await fs.writeFile(path.join(root,'results.json'),JSON.stringify({...summary,keyboard:true,missingFontsReported:fallback},null,2));console.log('PASS fonts loaded before PNG; five-family native text/halo/rotation/banner/legend matrix; picker keyboard; missing fonts reported. Evidence '+root)
}finally{await browser?.close();server.kill()}

