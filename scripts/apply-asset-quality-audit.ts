import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { lease } from '../service/safety'
import { Storage, managedPath } from '../service/storage'
import { applyQualityAudit } from '../service/assetQualityAudit'
const [directory, planFile, inventoryFile, resultFile] = process.argv.slice(2)
if(!directory||!planFile||!inventoryFile||!resultFile)throw Error('Supply dataset, reviewed plan, inventory, result file.')
if(existsSync(path.join(directory,'service.lock')))throw Error('Dataset has an active service lease; stop dependent migration.')
const plan=JSON.parse(readFileSync(planFile,'utf8')),inventory=JSON.parse(readFileSync(inventoryFile,'utf8'))
const release=await lease(path.resolve(directory))
let s:Storage
try{s=new Storage(path.resolve(directory))}catch(error){await release();throw error}
try{
 const before=s.db.prepare('SELECT * FROM projects ORDER BY id').all(),refs=s.db.prepare('SELECT * FROM project_assets ORDER BY projectId,assetId,role').all()
 const backup=managedPath(s.root,`backups/pre-quality-audit-${randomUUID()}.sqlite3`)
 s.db.prepare('VACUUM INTO ?').run(backup)
 const result=applyQualityAudit(s,plan,inventory.libraryRevision)
 if(JSON.stringify(before)!==JSON.stringify(s.db.prepare('SELECT * FROM projects ORDER BY id').all())||JSON.stringify(refs)!==JSON.stringify(s.db.prepare('SELECT * FROM project_assets ORDER BY projectId,assetId,role').all()))throw Error('Project invariant failed.')
 for(const e of plan.entries){const a=s.asset(e.id);if(createHash('sha256').update(s.bytes(a)).digest('hex')!==e.sha256)throw Error('Artwork invariant failed.')}
 writeFileSync(resultFile,JSON.stringify({...result,directory:s.root,backup,projectsUnchanged:true,referencesUnchanged:true,allOriginalHashesUnchanged:true},null,2)+'\n')
 console.log(JSON.stringify({...result,aliases:undefined,backup,projectsUnchanged:true,referencesUnchanged:true,allOriginalHashesUnchanged:true}))
}finally{s.close();await release()}
