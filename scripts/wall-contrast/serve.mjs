import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {safePath,validateManifest,validateImageFile,sha256} from './contract.mjs'
const args=process.argv.slice(2),arg=n=>args.includes(n)?args[args.indexOf(n)+1]:undefined
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),beforeRoot=arg('--before'),afterRoot=arg('--after'),outputArg=arg('--output'),dryRun=args.includes('--dry-run'),port=Number(arg('--port')||49326)
if(!beforeRoot||!afterRoot||!outputArg||!Number.isInteger(port)||port<1024||port>65535)throw Error('Usage: node harness/serve.mjs --before <original-generated-walls-directory> --after <Work-package-directory> --output <isolated-proof-directory> [--dry-run] [--port 49326] [--audit <old-audit-directory>]')
const output=path.resolve(outputArg);if([beforeRoot,afterRoot].some(p=>output===path.resolve(p)))throw Error('Output must be isolated from artwork input roots')
const contract=JSON.parse(await fs.readFile(root+'/component-contract.json')),fixtures=JSON.parse(await fs.readFile(root+'/placements.json')),floors=JSON.parse(await fs.readFile(root+'/floor-contexts.json'))
if(fixtures.width!==640||fixtures.height!==400||fixtures.materials.length!==5)throw Error('Unexpected geometry fixture')
const manifest=dryRun?null:validateManifest(JSON.parse(await fs.readFile(path.join(afterRoot,'manifest.json'))),contract)
const inputs=new Map(),inputHashes=[]
for(const d of contract.materials)for(const c of d.components)for(const side of ['before','after']){const relative=side==='before'||dryRun?`${d.id}-production-1/${c.filename}`:manifest.materials.find(m=>m.id===d.id).components.find(a=>a.id===c.id).artworkPath,base=side==='before'?beforeRoot:afterRoot,target=safePath(base,relative);const meta=await validateImageFile(target,c,side==='before'||dryRun?c.sourceSHA256:manifest.materials.find(m=>m.id===d.id).components.find(a=>a.id===c.id).sha256);inputs.set(`/image/${side}/${d.id}/${c.id}.png`,target);inputHashes.push({side,material:d.id,component:c.id,sha256:meta.sha256})}
for(const f of floors.contexts){const target=safePath(root,f.path);if(sha256(await fs.readFile(target))!==f.sha256)throw Error('Floor hash mismatch');inputs.set('/'+f.path,target)}
await fs.mkdir(output,{recursive:true});const origin=`http://127.0.0.1:${port}`
const staticFiles=new Map([['/','harness/index.html'],['/proof.mjs','harness/proof.mjs'],['/renderer.js','harness/renderer.js'],['/placements.json','placements.json'],['/component-contract.json','component-contract.json'],['/floor-contexts.json','floor-contexts.json']])
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,origin),name=url.pathname;if(req.headers.host!==`127.0.0.1:${port}`)throw Error('Invalid host');res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'&&name==='/run.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({dryRun,audit:!!arg('--audit'),inputHashes}));return}
 if(req.method==='POST'){if(req.headers.origin!==origin)throw Error('Invalid origin');let dest;if(name==='/validation.json')dest='validation-results.json';else{const m=name.match(/^\/proof\/(before|after)\/([-a-z]+)\/(light|mid|dark)-(100|75|50)-(off|on)\.png$/);if(!m||!contract.materials.some(d=>d.id===m[2]))throw Error('Invalid proof name');dest=`proofs/${m[2]}/${m[1]}/${m[3]}-${m[4]}-${m[5]}.png`;}const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>16*1024*1024)throw Error('Oversized proof');chunks.push(b)}const target=safePath(output,dest);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,Buffer.concat(chunks));res.end('Saved');return}
 if(req.method!=='GET')throw Error('Read or controlled proof write only')
 let file=inputs.get(name);if(staticFiles.has(name))file=safePath(root,staticFiles.get(name));
 if(!file&&arg('--audit')){const m=name.match(/^\/audit\/([-a-z]+)\/(light|mid|dark)-(100|75|50)-(off|on)\.png$/);if(m&&contract.materials.some(d=>d.id===m[1]))file=safePath(arg('--audit'),`proofs/${m[1]}/${m[1]}-${m[2]}-${m[3]}-${m[4]}.png`)}
 if(!file){res.statusCode=404;res.end('Not found');return}res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.json')?'application/json':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.end(await fs.readFile(file))
 }catch(e){res.statusCode=400;res.end(e.message)}})
server.listen(port,'127.0.0.1',()=>console.log(`Isolated wall proof tool: ${origin}\nOpen in Chromium and click Render proofs. No Mapweaver instance/database is used. Dry-run: ${dryRun}`))
