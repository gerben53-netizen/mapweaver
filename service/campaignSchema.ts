import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
export function migrateCampaigns(db:Database.Database) {
 db.transaction(()=>{
  db.exec(`CREATE TABLE campaigns(id TEXT PRIMARY KEY,name TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,createdAt TEXT NOT NULL,modifiedAt TEXT NOT NULL,deletedAt TEXT,preferences TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE campaign_nodes(id TEXT PRIMARY KEY,campaignId TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,parentId TEXT REFERENCES campaign_nodes(id),mapId TEXT UNIQUE REFERENCES projects(id) ON DELETE CASCADE,name TEXT NOT NULL,position INTEGER NOT NULL,favorite INTEGER NOT NULL DEFAULT 0,deletedAt TEXT,mapType TEXT);
  CREATE INDEX campaign_children ON campaign_nodes(campaignId,parentId,position);`)
  for(const p of db.prepare("SELECT id,name,createdAt,modifiedAt,deletedAt,CASE WHEN json_valid(document) THEN json_extract(document,'$.map.mapType') ELSE NULL END mapType FROM projects").all() as Array<{id:string;name:string;createdAt:string;modifiedAt:string;deletedAt:string|null;mapType:string|null}>){
   const id=randomUUID(),type=p.mapType||'battlemap'
   db.prepare('INSERT INTO campaigns(id,name,createdAt,modifiedAt,deletedAt) VALUES(?,?,?,?,?)').run(id,p.name,p.createdAt,p.modifiedAt,p.deletedAt)
   db.prepare('INSERT INTO campaign_nodes(id,campaignId,mapId,name,position,deletedAt,mapType) VALUES(?,?,?,?,0,?,?)').run(randomUUID(),id,p.id,p.name,p.deletedAt,type)
  }
  db.prepare('INSERT INTO schema_migrations VALUES(7,?,?)').run('Campaign organization metadata',new Date().toISOString())
 })()
}
