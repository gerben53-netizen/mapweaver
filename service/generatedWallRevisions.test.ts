import {expect,it} from 'vitest'
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import path from 'node:path'
import {Storage} from './storage'
import {createWall,SIMPLE_WALL} from '../src/domain/walls'
import {generatedWallStyle} from '../src/domain/generatedWalls'
import {normalizeMapSettings,defaultMapStyle} from '../src/domain/mapSettings'
it('preserves production-1 and production-2 native walls through SQLite save/update/reopen',()=>{
 const base=path.resolve('.qa.local/generated-revision-tests');mkdirSync(base,{recursive:true});const root=mkdtempSync(path.join(base,'data-'));if(!root.startsWith(base+path.sep+'data-'))throw Error('Unsafe QA cleanup');let store:Storage|undefined
 try{store=new Storage(root);const records=[];for(const revision of ['production-1','production-2']){const map={...normalizeMapSettings({width:640,height:400,...defaultMapStyle()}),background:null},wall=createWall([{id:'a',x:35,y:80,mode:'corner'},{id:'b',x:550,y:80,mode:'corner'}],false,generatedWallStyle(SIMPLE_WALL,map,'pale-palace-stone',revision)),now=new Date().toISOString(),document={formatVersion:12,id:crypto.randomUUID(),name:'Revision '+revision,createdAt:now,modifiedAt:now,map,objects:[wall],layers:[{id:'walls',name:'Walls',visible:true,locked:false,objectIds:[wall.id]}],objectGroups:[],layerTree:{roots:['walls'],groups:[]},assets:[]};const saved=store.writeProject(document);const updated=store.writeProject({...saved.document,name:document.name+' saved'},saved.revision);records.push(updated)}store.close();store=new Storage(root);for(const saved of records){const loaded=store.project(saved.id);expect(loaded.document).toEqual(saved.document);store.validateDocument(loaded.document)}}finally{if(store?.db.open)store.close();rmSync(root,{recursive:true,force:true})}
})
