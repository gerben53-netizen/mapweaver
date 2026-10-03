import { readFileSync,writeFileSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { lease } from '../service/safety'
import { Storage } from '../service/storage'
import { previewPack,commitPack } from '../service/libraryPacks'
const [directory,resultFile,benchmarkDirectory]=process.argv.slice(2)
if(!directory||!resultFile)throw Error('Supply dataset and result file')
const out=path.resolve('deliverables.local/eldric-pqa-integration'),bytes=readFileSync(path.join(out,'eldric-bibliotheek-mapweaver-assets.zip'))
const requirements=JSON.parse(readFileSync(path.join(out,'requirements.json'),'utf8'))
const release=await lease(path.resolve(directory))
let s:Storage|undefined
try{
 s=new Storage(path.resolve(directory))
 const assets=s.db.prepare('SELECT * FROM assets ORDER BY id').all(),maps=s.db.prepare('SELECT * FROM projects ORDER BY id').all(),refs=s.db.prepare('SELECT * FROM project_assets ORDER BY projectId,assetId,role').all(),cats=s.db.prepare('SELECT * FROM categories ORDER BY id').all()
 const hashes=assets.map(a=>({id:(a as {id:string}).id,sha256:s!.asset((a as {id:string}).id).sha256}))
 const backup=path.join(s.root,'backups',`pre-eldric-pqa-${randomUUID()}.sqlite3`);s.db.prepare('VACUUM INTO ?').run(backup)
 const preview=await previewPack(s,bytes)
 if(preview.errors.length||preview.warnings.length)throw Error(JSON.stringify(preview))
 const result=commitPack(s,{token:preview.token,revision:preview.revision,useExistingCategories:true,createCategories:false,duplicate:'keep'})
 for(const asset of assets){const id=(asset as {id:string}).id;if(JSON.stringify(asset)!==JSON.stringify(s.db.prepare('SELECT * FROM assets WHERE id=?').get(id)))throw Error('Existing metadata changed '+id)}
 if(JSON.stringify(cats)!==JSON.stringify(s.db.prepare('SELECT * FROM categories ORDER BY id').all())||JSON.stringify(maps)!==JSON.stringify(s.db.prepare('SELECT * FROM projects ORDER BY id').all())||JSON.stringify(refs)!==JSON.stringify(s.db.prepare('SELECT * FROM project_assets ORDER BY projectId,assetId,role').all()))throw Error('Map/category invariant failed')
 for(const h of hashes){const {createHash}=await import('node:crypto');if(createHash('sha256').update(s.bytes(s.asset(h.id))).digest('hex')!==h.sha256)throw Error('Existing pixels changed '+h.id)}
 const ids=requirements.assets.map((r:{proposedId:string;filename:string;replacesAssetIds:string[]})=>{const row=s!.db.prepare('SELECT id,sha256,name,quality FROM assets WHERE originalName=? AND deletedAt IS NULL').get(r.filename) as {id:string;sha256:string;name:string;quality:string};if(!row||JSON.parse(row.quality).classification!=='KEEP')throw Error('Production registration missing');return {conceptId:r.proposedId,...row,replacesAssetIds:r.replacesAssetIds}})
 const benchmarkMaps=[]
 if(benchmarkDirectory){
  for(const name of ['eldric','library']){const imported=await s.importProject(new Uint8Array(readFileSync(path.join(benchmarkDirectory,name+'.mapweaver'))));benchmarkMaps.push({name,id:imported.id,title:imported.name})}
  for(const asset of assets){const id=(asset as {id:string}).id;if(JSON.stringify(asset)!==JSON.stringify(s.db.prepare('SELECT * FROM assets WHERE id=?').get(id)))throw Error('Benchmark import changed existing metadata '+id)}
  for(const map of maps){const id=(map as {id:string}).id;if(JSON.stringify(map)!==JSON.stringify(s.db.prepare('SELECT * FROM projects WHERE id=?').get(id)))throw Error('Benchmark import changed existing map '+id)}
 }
 writeFileSync(resultFile,JSON.stringify({result,ids,benchmarkMaps,dataset:s.root,backup,existingAssetsUnchanged:true,originalHashesUnchanged:true,existingMapsUnchanged:true,referencesUnchanged:true,categoriesUnchanged:true},null,2)+'\n')
 console.log(JSON.stringify({count:ids.length,backup,resultFile}))
}finally{s?.close();await release()}
