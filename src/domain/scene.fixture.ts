import { createPlacedObject } from './placement'
import type { ManagedContent } from './projectView'
const object=(id:string,name=id)=>({...createPlacedObject({id:'asset',name:'Stamp',naturalWidth:30,naturalHeight:30,categoryId:'',mimeType:'image/png',createdAt:'',contentHash:''},{x:100,y:100},{width:800,height:600}),id,name})
export function sceneFixture():ManagedContent {
  return {objects:[object('a','Archiefkast'),object('b'),object('c'),object('d')],layers:[{id:'library',name:'Bibliotheek',visible:true,locked:false,objectIds:['a','b','c']},{id:'hall',name:'Hall',visible:true,locked:false,objectIds:['d']}],objectGroups:[{id:'shelves',name:'Boekenkasten',layerId:'library',visible:true,locked:false,objectIds:['a','c']}],layerTree:{roots:['floor'],groups:[{id:'floor',name:'Ground floor',visible:true,locked:false,children:['library','hall']}]}}
}
