export interface Campaign { id:string; name:string; revision:number; deletedAt:string|null; createdAt:string; modifiedAt:string }
export interface CampaignNode { mapRevision?:number; id:string; campaignId:string; parentId:string|null; mapId:string|null; name:string; position:number; favorite:boolean; deletedAt:string|null; mapType:string|null; openedAt:string|null; modifiedAt:string }
export interface CampaignPreferences { expanded:string[]; selected:string|null; view:'list'|'gallery' }
export interface CampaignSnapshot { campaign:Campaign; nodes:CampaignNode[]; preferences:CampaignPreferences }
export const CAMPAIGN_LIMITS={depth:16,nodes:10000}
export function campaignIndex(nodes:CampaignNode[]) {
 const byId=new Map(nodes.map(n=>[n.id,n])),children=new Map<string|null,CampaignNode[]>()
 for(const n of nodes){const list=children.get(n.parentId)||[];list.push(n);children.set(n.parentId,list)}
 for(const list of children.values())list.sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id))
 return {byId,children}
}
export function nodePath(id:string|null,byId:Map<string,CampaignNode>):CampaignNode[] {
 const path:CampaignNode[]=[],seen=new Set<string>();let n=id?byId.get(id):undefined
 while(n){if(seen.has(n.id)||path.length>=CAMPAIGN_LIMITS.depth)throw Error('Campaign hierarchy is cyclic or too deep.');seen.add(n.id);path.unshift(n);n=n.parentId?byId.get(n.parentId):undefined}
 return path
}
export function validateHierarchy(nodes:CampaignNode[]) {
 if(nodes.length>CAMPAIGN_LIMITS.nodes)throw Error('Campaign exceeds 10,000 entries.')
 const {byId}=campaignIndex(nodes),maps=new Set<string>()
 if(byId.size!==nodes.length)throw Error('Duplicate campaign node.')
 for(const n of nodes){if(!/^[a-zA-Z0-9_-]{1,80}$/.test(n.id)||typeof n.name!=='string'||!n.name.trim()||n.name.length>120||[...n.name].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)||!Number.isSafeInteger(n.position)||n.position<0)throw Error('Invalid campaign node.');if(n.parentId&&(!byId.has(n.parentId)||byId.get(n.parentId)!.mapId||byId.get(n.parentId)!.campaignId!==n.campaignId))throw Error('Invalid parent folder.');if(n.mapId){if(maps.has(n.mapId))throw Error('Duplicate map reference.');maps.add(n.mapId)}nodePath(n.id,byId)}
}
export function moveNodes(nodes:CampaignNode[],id:string,parentId:string|null,beforeId?:string|null) {
 const copy=nodes.map(n=>({...n})),{byId,children}=campaignIndex(copy),node=byId.get(id),parent=parentId?byId.get(parentId):null
 if(!node||node.deletedAt||parentId&&(!parent||parent.mapId||parent.deletedAt))throw Error('Choose an active folder.')
 if(parentId&&nodePath(parentId,byId).some(n=>n.id===id))throw Error('A folder cannot contain itself or its descendants.')
 const siblings=(children.get(parentId)||[]).filter(n=>n.id!==id)
 const at=beforeId?siblings.findIndex(n=>n.id===beforeId):siblings.length
 if(at<0)throw Error('The destination changed. Refresh and retry.')
 node.parentId=parentId;siblings.splice(at,0,node);siblings.forEach((n,i)=>n.position=i)
 validateHierarchy(copy);return copy
}
export function visibleTree(nodes:CampaignNode[],expanded:string[]) {
 const {children}=campaignIndex(nodes),open=new Set(expanded),rows:{node:CampaignNode;depth:number}[]=[]
 const visit=(parent:string|null,depth:number)=>{for(const n of children.get(parent)||[]){if(n.deletedAt)continue;rows.push({node:n,depth});if(!n.mapId&&open.has(n.id))visit(n.id,depth+1)}}
 visit(null,0);return rows
}
export const mapTypeLabel=(type:string|null)=>type==='world-map'?'World':type==='regional-map'?'Regional':type==='battlemap'?'Battlemap':'Folder'
