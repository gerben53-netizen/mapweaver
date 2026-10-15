import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import Database from 'better-sqlite3';
const source=path.join(process.env.LOCALAPPDATA,'Mapweaver'),root=path.resolve('.qa.local/production-audit/data'),out=path.resolve('.qa.local/production-audit');fs.mkdirSync(out,{recursive:true});
const db=new Database(path.join(source,'mapweaver.sqlite3'),{readonly:true,fileMustExist:true});
const rows={};for(const t of ['projects','assets','categories','campaigns','library_collections','library_members'])rows[t]=db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all();
const counts=Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,{count:v.length,sha256:crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')}]));
fs.writeFileSync(out+'/primary-'+(process.argv[2]||'before')+'.json',JSON.stringify(counts,null,2));
if(process.argv[2]!=='after'){
 fs.mkdirSync(root,{recursive:true});await db.backup(path.join(root,'mapweaver.sqlite3'));
 for(const rel of new Set(rows.assets.flatMap(a=>[a.originalPath,a.previewPath]).filter(Boolean))){const target=path.resolve(root,rel);if(!target.startsWith(root+path.sep))throw Error('Unsafe target');fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(source,rel),target)}
 const assets=rows.assets.map(a=>({...a,physical:fs.existsSync(path.join(source,a.originalPath)),bytes:fs.statSync(path.join(source,a.originalPath)).size}));fs.writeFileSync(out+'/assets.json',JSON.stringify(assets,null,2));
}
db.close();console.log(counts);
