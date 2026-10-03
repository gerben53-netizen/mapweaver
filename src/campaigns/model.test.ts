import { expect,it } from 'vitest'
import { campaignIndex, moveNodes, nodePath, visibleTree, validateHierarchy } from './model'
import type { CampaignNode } from './model'
const node=(id:string,parentId:string|null=null,mapId:string|null=null,position=0):CampaignNode=>({id,parentId,mapId,position,campaignId:'campaign',name:id,favorite:false,deletedAt:null,mapType:mapId?'battlemap':null,openedAt:null,modifiedAt:'2026-09-24'})
const tree=()=>[node('region'),node('town','region'),node('map','town','document'),node('other',null,null,1)]
it('builds breadcrumbs and visible rows from stable IDs',()=>{const nodes=tree();expect(nodePath('map',campaignIndex(nodes).byId).map(n=>n.name)).toEqual(['region','town','map']);expect(visibleTree(nodes,[]).map(r=>r.node.id)).toEqual(['region','other']);expect(visibleTree(nodes,['region','town'])).toHaveLength(4)})
it('moves a map preserving identity, favorites and input',()=>{const nodes=tree();nodes[2].favorite=true;const moved=moveNodes(nodes,'map','other');expect(moved[2]).toMatchObject({id:'map',mapId:'document',parentId:'other',favorite:true});expect(nodes[2].parentId).toBe('town')})
it('moves a folder together with its descendants',()=>{const moved=moveNodes(tree(),'town','other');expect(nodePath('map',campaignIndex(moved).byId).map(n=>n.id)).toEqual(['other','town','map'])})
it.each([['region','region'],['region','town'],['town','map']])('rejects invalid move %s → %s',(id,parent)=>{expect(()=>moveNodes(tree(),id,parent)).toThrow()})
it('reorders siblings deterministically',()=>{const moved=moveNodes(tree(),'other',null,'region');expect(visibleTree(moved,[]).map(n=>n.node.id)).toEqual(['other','region'])})
it('rejects excessive depth and missing parent references',()=>{expect(()=>validateHierarchy([node('a','missing')])).toThrow();expect(()=>validateHierarchy(Array.from({length:17},(_,i)=>node('n'+i,i?'n'+(i-1):null)))).toThrow()})
it('indexes and searches hundreds of nodes without opening map documents',()=>{const nodes=Array.from({length:1500},(_,i)=>node('map'+i,null,'document'+i,i));validateHierarchy(nodes);expect(visibleTree(nodes,[])).toHaveLength(1500);expect(nodes.filter(n=>n.name.includes('map149'))).toHaveLength(11)})
