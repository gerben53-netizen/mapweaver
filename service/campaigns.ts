import { randomUUID } from 'node:crypto'
import { Storage, StorageError, label, safeId } from './storage'
import { campaignIndex, moveNodes, nodePath, validateHierarchy } from '../src/campaigns/model'
import type { Campaign, CampaignNode, CampaignPreferences, CampaignSnapshot } from '../src/campaigns/model'
export interface MapLocation { campaignId:string; parentId:string|null }
export function campaigns(s:Storage,trash=false):Campaign[]{return s.db.prepare(`SELECT id,name,revision,createdAt,modifiedAt,deletedAt FROM campaigns WHERE deletedAt IS ${trash?'NOT NULL':'NULL'} ORDER BY modifiedAt DESC`).all() as Campaign[]}
export function campaign(s:Storage,id:string):CampaignSnapshot {
 const c=s.db.prepare('SELECT * FROM campaigns WHERE id=?').get(safeId(id)) as (Campaign&{preferences:string})|undefined
 if(!c)throw new StorageError('NOT_FOUND','Campaign not found.',404)
 const nodes=(s.db.prepare(`SELECT n.*,p.revision mapRevision,CASE WHEN n.mapId IS NULL THEN n.name ELSE p.name END name,p.openedAt,COALESCE(p.modifiedAt,?) modifiedAt,COALESCE(n.deletedAt,p.deletedAt) deletedAt FROM campaign_nodes n LEFT JOIN projects p ON p.id=n.mapId WHERE campaignId=? ORDER BY position,id`).all(c.modifiedAt,id) as (Omit<CampaignNode,'favorite'>&{favorite:number})[]).map(n=>({...n,favorite:!!n.favorite}))
 const raw=JSON.parse(c.preferences),ids=new Set(nodes.filter(n=>!n.deletedAt).map(n=>n.id)),preferences:CampaignPreferences={expanded:Array.isArray(raw.expanded)?raw.expanded.filter((id:string)=>ids.has(id)):[],selected:ids.has(raw.selected)?raw.selected:null,view:raw.view==='gallery'?'gallery':'list'}
 const {preferences:_,...record}=c;void _
 return {campaign:record,nodes,preferences}
}
export function createCampaign(s:Storage,name:unknown) {
 const id=randomUUID(),now=new Date().toISOString();s.db.prepare('INSERT INTO campaigns(id,name,createdAt,modifiedAt) VALUES(?,?,?,?)').run(id,label(name),now,now);return campaign(s,id)
}
export function mapLocation(s:Storage,id:string):MapLocation|undefined{return s.db.prepare('SELECT campaignId,parentId FROM campaign_nodes WHERE mapId=?').get(id) as MapLocation|undefined}
export function attachMap(s:Storage,id:string,name:string,mapType:string,location?:MapLocation) {
 if(mapLocation(s,id)){s.db.prepare('UPDATE campaign_nodes SET mapType=? WHERE mapId=?').run(mapType,id);return}
 const c=location?campaign(s,location.campaignId):createCampaign(s,name),parentId=location?.parentId||null
 if(c.campaign.deletedAt||parentId&&!c.nodes.some(n=>n.id===parentId&&!n.mapId&&!n.deletedAt))throw new StorageError('INVALID_FOLDER','The selected campaign or folder is unavailable.')
 const node:CampaignNode={id:randomUUID(),campaignId:c.campaign.id,parentId,mapId:id,name,position:Math.max(-1,...c.nodes.filter(n=>n.parentId===parentId).map(n=>n.position))+1,favorite:false,deletedAt:null,mapType,openedAt:null,modifiedAt:new Date(Math.max(Date.now(),Date.parse(c.campaign.modifiedAt)+1)).toISOString()}
 validateHierarchy([...c.nodes,node]);s.db.prepare('INSERT INTO campaign_nodes(id,campaignId,parentId,mapId,name,position,mapType) VALUES(?,?,?,?,?,?,?)').run(node.id,node.campaignId,parentId,id,name,node.position,mapType)
 s.db.prepare('UPDATE campaigns SET revision=revision+1,modifiedAt=? WHERE id=?').run(node.modifiedAt,node.campaignId)
}
export function rememberCampaign(s:Storage,id:string){if(campaign(s,id).campaign.deletedAt)throw new StorageError('CAMPAIGN_TRASHED','Restore this campaign before opening.');s.db.prepare("INSERT INTO settings VALUES('lastCampaign',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(id);s.db.prepare("DELETE FROM settings WHERE key='lastOpenedProject' AND value NOT IN (SELECT mapId FROM campaign_nodes WHERE campaignId=? AND mapId IS NOT NULL)").run(id)}
export function campaignForMap(s:Storage,id:string){const loc=mapLocation(s,id);if(loc){rememberCampaign(s,loc.campaignId);return loc.campaignId}return null}
export function preferences(s:Storage,id:string,value:CampaignPreferences) {
 const c=campaign(s,id),valid=new Set(c.nodes.map(n=>n.id))
 if(!value||!Array.isArray(value.expanded)||value.expanded.length>10000||value.expanded.some(id=>!valid.has(id))||value.selected!==null&&!valid.has(value.selected)||!['list','gallery'].includes(value.view))throw new StorageError('INVALID_PREFERENCES','Invalid explorer preferences.')
 s.db.prepare('UPDATE campaigns SET preferences=? WHERE id=?').run(JSON.stringify(value),id);return {saved:true}
}
export interface CampaignCommand { revision:number; op:'folder'|'move'|'rename'|'favorite'|'trash'|'restore'; id?:string; parentId?:string|null; beforeId?:string|null; name?:string; favorite?:boolean; mapRevision?:number }
export function campaignCommand(s:Storage,campaignId:string,body:CampaignCommand) {
 return s.db.transaction(()=>{
  const snapshot=campaign(s,campaignId),c=snapshot.campaign,nodes=snapshot.nodes,{byId}=campaignIndex(nodes),node=body?.id?byId.get(body.id):undefined,now=new Date(Math.max(Date.now(),Date.parse(c.modifiedAt)+1)).toISOString()
  if(!body||body.revision!==c.revision)throw new StorageError('REVISION_CONFLICT','Campaign changed in another window. Refresh and retry.',409)
  if(c.deletedAt&&body.op!=='restore')throw new StorageError('CAMPAIGN_TRASHED','Restore this campaign first.')
  if(body.id&&!node)throw new StorageError('NOT_FOUND','Entry not found.',404)
  if(node?.deletedAt&&body.op!=='restore')throw new StorageError('NODE_TRASHED','Restore this entry first.')
  if(body.op==='folder'){
   const parentId=body.parentId||null,parent=parentId?byId.get(parentId):null
   if(parentId&&(!parent||parent.mapId||parent.deletedAt))throw new StorageError('INVALID_FOLDER','Choose an active folder.')
   const next:CampaignNode={id:randomUUID(),campaignId,parentId,mapId:null,name:label(body.name),position:Math.max(-1,...nodes.filter(n=>n.parentId===parentId).map(n=>n.position))+1,favorite:false,deletedAt:null,mapType:null,openedAt:null,modifiedAt:now};validateHierarchy([...nodes,next])
   s.db.prepare('INSERT INTO campaign_nodes(id,campaignId,parentId,name,position) VALUES(?,?,?,?,?)').run(next.id,campaignId,parentId,next.name,next.position)
  }else if(body.op==='move'&&node){
   const moved=moveNodes(nodes,node.id,body.parentId||null,body.beforeId);for(const n of moved){const old=byId.get(n.id)!;if(n.parentId!==old.parentId||n.position!==old.position)s.db.prepare('UPDATE campaign_nodes SET parentId=?,position=? WHERE id=?').run(n.parentId,n.position,n.id)}
  }else if(body.op==='rename'){
   const name=label(body.name)
   if(!node)s.db.prepare('UPDATE campaigns SET name=? WHERE id=?').run(name,campaignId)
   else if(node.mapId){const p=s.project(node.mapId);if(body.mapRevision!==p.revision)throw new StorageError('REVISION_CONFLICT','Map changed in another window. Refresh before renaming.',409);s.writeProject({...p.document,name},p.revision)}
   else s.db.prepare('UPDATE campaign_nodes SET name=? WHERE id=?').run(name,node.id)
  }else if(body.op==='favorite'&&node?.mapId&&typeof body.favorite==='boolean')s.db.prepare('UPDATE campaign_nodes SET favorite=? WHERE id=?').run(Number(body.favorite),node.id)
  else if(body.op==='trash'||body.op==='restore'){
   const restore=body.op==='restore',batch=node?.deletedAt||c.deletedAt,affected=nodes.filter(n=>(!node||nodePath(n.id,byId).some(p=>p.id===node.id))&&(restore?n.deletedAt===batch:!n.deletedAt))
   if(restore&&node?.parentId&&byId.get(node.parentId)?.deletedAt)s.db.prepare('UPDATE campaign_nodes SET parentId=NULL WHERE id=?').run(node.id)
   for(const n of affected){s.db.prepare('UPDATE campaign_nodes SET deletedAt=? WHERE id=?').run(restore?null:now,n.id);if(n.mapId){s.db.prepare('UPDATE projects SET deletedAt=?,revision=revision+1 WHERE id=?').run(restore?null:now,n.mapId);if(!restore)s.db.prepare("DELETE FROM settings WHERE key='lastOpenedProject' AND value=?").run(n.mapId)}}
   if(!node){s.db.prepare('UPDATE campaigns SET deletedAt=? WHERE id=?').run(restore?null:now,campaignId);if(!restore)s.db.prepare("DELETE FROM settings WHERE key='lastCampaign' AND value=?").run(campaignId)}
  }else throw new StorageError('INVALID_COMMAND','Unsupported campaign action.')
  s.db.prepare('UPDATE campaigns SET revision=revision+1,modifiedAt=? WHERE id=?').run(now,campaignId)
  return campaign(s,campaignId)
 })()
}

export function restoreMapNode(s:Storage,id:string){
 const loc=mapLocation(s,id);if(!loc)return
 const snapshot=campaign(s,loc.campaignId),node=snapshot.nodes.find(n=>n.mapId===id)!
 if(snapshot.campaign.deletedAt)throw new StorageError('CAMPAIGN_TRASHED','Restore the campaign before this map.')
 const blocked=nodePath(node.parentId,campaignIndex(snapshot.nodes).byId).some(n=>n.deletedAt)
 s.db.prepare('UPDATE campaign_nodes SET deletedAt=NULL,parentId=? WHERE mapId=?').run(blocked?null:node.parentId,id)
 s.db.prepare('UPDATE campaigns SET revision=revision+1,modifiedAt=? WHERE id=?').run(new Date(Math.max(Date.now(),Date.parse(snapshot.campaign.modifiedAt)+1)).toISOString(),loc.campaignId)
}
