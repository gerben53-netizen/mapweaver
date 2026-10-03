import { afterEach,expect,it } from 'vitest'
import { mkdtempSync,rmSync,readdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Storage } from './storage'
import { createCampaign,campaign,campaigns,campaignCommand,mapLocation,preferences,rememberCampaign } from './campaigns'
import { rememberStartupProject,startupProject } from './startupProject'
import { migrateCampaigns } from './campaignSchema'
import { defaultMapStyle } from '../src/domain/mapSettings'
import { defaultGeography } from '../src/domain/geography'
import { validateDataset,createBackup,extractArchive } from './archives'
import { generation } from './safety'
const stores:Storage[]=[],dirs:string[]=[]
const store=()=>{const dir=mkdtempSync(path.join(os.tmpdir(),'mapweaver-campaign-'));dirs.push(dir);const s=new Storage(dir);stores.push(s);return s}
const doc=()=>{const now=new Date().toISOString();return {formatVersion:12,id:randomUUID(),name:'Existing map',createdAt:now,modifiedAt:now,map:{width:800,height:600,...defaultMapStyle(),background:null,mapType:'battlemap',geography:defaultGeography('battlemap')},layers:[{id:'layer',name:'Objects',visible:true,locked:false,objectIds:[]}],layerTree:{roots:['layer'],groups:[]},objectGroups:[],objects:[],assets:[]}}
afterEach(()=>{for(const s of stores.splice(0))if(s.db.open)s.close();for(const dir of dirs.splice(0)){if(!dir.startsWith(path.join(os.tmpdir(),'mapweaver-campaign-')))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true})}})
it('creates contextual maps and nested folders, moves without touching map documents, renames and favorites',()=>{
 const s=store(),c=createCampaign(s,'Campaign'),id=c.campaign.id
 let snap=campaignCommand(s,id,{revision:1,op:'folder',name:'North'});const folder=snap.nodes[0]
 snap=campaignCommand(s,id,{revision:snap.campaign.revision,op:'folder',name:'Town',parentId:folder.id});const town=snap.nodes.find(n=>n.name==='Town')!
 const map=s.writeProject(doc(),undefined,{campaignId:id,parentId:town.id});snap=campaign(s,id);const n=snap.nodes.find(n=>n.mapId===map.id)!,raw=s.db.prepare('SELECT document,revision FROM projects WHERE id=?').get(map.id)
 snap=campaignCommand(s,id,{revision:snap.campaign.revision,op:'favorite',id:n.id,favorite:true});snap=campaignCommand(s,id,{revision:snap.campaign.revision,op:'move',id:n.id,parentId:null});expect(s.db.prepare('SELECT document,revision FROM projects WHERE id=?').get(map.id)).toEqual(raw)
 snap=campaignCommand(s,id,{revision:snap.campaign.revision,op:'rename',id:n.id,name:'New name',mapRevision:map.revision});expect(s.project(map.id).name).toBe('New name');expect(snap.nodes.find(v=>v.id===n.id)).toMatchObject({favorite:true,mapId:map.id,parentId:null,name:'New name'})
 expect(()=>campaignCommand(s,id,{revision:snap.campaign.revision,op:'move',id:folder.id,parentId:town.id})).toThrow();expect(()=>campaignCommand(s,id,{revision:1,op:'folder',name:'Stale'})).toThrow(/another window/)
 preferences(s,id,{expanded:[folder.id],selected:town.id,view:'gallery'});expect(campaign(s,id).preferences).toEqual({expanded:[folder.id],selected:town.id,view:'gallery'})
 rememberStartupProject(s,map.id);expect(startupProject(s)).toBe(map.id);expect(campaign(s,id).nodes.find(v=>v.id===n.id)?.openedAt).toBeTruthy()
})
it('trashes/restores a subtree, preserves earlier individual trash, and invalidates startup',()=>{
 const s=store(),id=createCampaign(s,'Campaign').campaign.id;let snap=campaignCommand(s,id,{revision:1,op:'folder',name:'Folder'});const f=snap.nodes[0],a=s.writeProject(doc(),undefined,{campaignId:id,parentId:f.id}),b=s.writeProject(doc(),undefined,{campaignId:id,parentId:f.id});snap=campaign(s,id)
 snap=campaignCommand(s,id,{revision:snap.campaign.revision,op:'trash',id:snap.nodes.find(n=>n.mapId===a.id)!.id})
 rememberStartupProject(s,b.id);snap=campaignCommand(s,id,{revision:snap.campaign.revision,op:'trash',id:f.id});expect(startupProject(s)).toBeNull();expect(snap.nodes.every(n=>n.deletedAt)).toBe(true)
 snap=campaignCommand(s,id,{revision:snap.campaign.revision,op:'restore',id:f.id});expect(snap.nodes.find(n=>n.mapId===a.id)?.deletedAt).toBeTruthy();expect(snap.nodes.find(n=>n.mapId===b.id)?.deletedAt).toBeNull();expect(s.project(b.id).deletedAt).toBeNull()
})
it('migrates schema 6 transactionally preserving exact map bytes and identity',()=>{
 const s=store(),p=s.writeProject(doc()),raw=s.db.prepare('SELECT document FROM projects WHERE id=?').get(p.id),root=s.root;s.db.exec('DROP TABLE campaign_nodes;DROP TABLE campaigns;DELETE FROM schema_migrations WHERE version=7');s.close();const migrated=new Storage(root);stores.push(migrated)
 expect(migrated.db.prepare('SELECT document FROM projects WHERE id=?').get(p.id)).toEqual(raw);expect(campaigns(migrated)[0].name).toBe(p.name);expect(mapLocation(migrated,p.id)?.parentId).toBeNull();expect(readdirSync(path.join(root,'backups')).some(n=>n.startsWith('pre-campaigns-'))).toBe(true)
})
it('rolls back failed migration without modifying source documents',()=>{
 const s=store(),p=s.writeProject(doc()),raw=s.db.prepare('SELECT document FROM projects WHERE id=?').get(p.id);s.db.exec('DROP TABLE campaign_nodes;DROP TABLE campaigns;DELETE FROM schema_migrations WHERE version=7;CREATE TABLE campaign_nodes(broken TEXT)')
 expect(()=>migrateCampaigns(s.db)).toThrow();expect(s.db.prepare("SELECT 1 FROM sqlite_master WHERE name='campaigns'").get()).toBeUndefined();expect(s.db.prepare('SELECT document FROM projects WHERE id=?').get(p.id)).toEqual(raw)
})
it('keeps campaign hierarchy and favorite state through full backup extraction/validation',async()=>{
 const s=store(),p=s.writeProject(doc()),id=mapLocation(s,p.id)!.campaignId;let snap=campaign(s,id);const mapNode=snap.nodes[0].id;snap=campaignCommand(s,id,{revision:snap.campaign.revision,op:'folder',name:'Nested'});snap=campaignCommand(s,id,{revision:snap.campaign.revision,op:'move',id:mapNode,parentId:snap.nodes.find(n=>!n.mapId)!.id});campaignCommand(s,id,{revision:snap.campaign.revision,op:'favorite',id:mapNode,favorite:true});rememberStartupProject(s,p.id);snap=campaign(s,id)
 await validateDataset(s.root);const signal=new AbortController().signal,result=await createBackup(s,path.join(s.root,'work'),generation(s),signal,()=>{}),dest=path.join(s.root,'restored');await extractArchive(result.file,dest,signal,()=>{});await validateDataset(dest);const restored=new Storage(dest);stores.push(restored);expect(campaign(restored,id)).toEqual(snap)
})

it('rejects stale map renames and leaves both metadata and content intact',()=>{
 const s=store(),p=s.writeProject(doc()),id=mapLocation(s,p.id)!.campaignId,snap=campaign(s,id),changed=s.writeProject({...p.document,name:'Another browser'},p.revision)
 expect(()=>campaignCommand(s,id,{revision:snap.campaign.revision,op:'rename',id:snap.nodes[0].id,name:'Stale name',mapRevision:p.revision})).toThrow(/another window/)
 expect(s.project(p.id).document).toEqual(changed.document);expect(campaign(s,id).campaign.revision).toBe(snap.campaign.revision)
})
it('switching to an empty campaign clears a startup map from the previous campaign',()=>{
 const s=store(),p=s.writeProject(doc()),empty=createCampaign(s,'Empty');rememberStartupProject(s,p.id);rememberCampaign(s,empty.campaign.id)
 expect(startupProject(s)).toBeNull();expect(s.db.prepare("SELECT value FROM settings WHERE key='lastCampaign'").get()).toEqual({value:empty.campaign.id})
})
it('invalid contextual placement rolls back the new map rather than leaving an orphan',()=>{
 const s=store(),c=createCampaign(s,'Safe'),d=doc();expect(()=>s.writeProject(d,undefined,{campaignId:c.campaign.id,parentId:'missing'})).toThrow();expect(s.db.prepare('SELECT 1 FROM projects WHERE id=?').get(d.id)).toBeUndefined();expect(campaign(s,c.campaign.id).nodes).toEqual([])
})
