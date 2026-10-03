import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate'
import {createServer} from 'vite'
import sharp from 'sharp'
const out='deliverables.local/Illustrated-Markers',source='deliverables.local/Coastal-Contours/after.mapweaver',bytes=await fs.readFile(source),files=unzipSync(bytes),base=JSON.parse(strFromU8(files['project.json'])),hash=b=>createHash('sha256').update(b).digest('hex')
await fs.mkdir(out,{recursive:true})
const catalog=JSON.parse(await fs.readFile('public/settlement-assets-painterly/catalog.json','utf8'))
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {createMarkerBundle,positionMarkerLabel}=await server.ssrLoadModule('/src/domain/markers.ts'),{markerDefaults}=await server.ssrLoadModule('/src/domain/markerRegistry.ts'),{illustratedWidthKm,illustrateMarker}=await server.ssrLoadModule('/src/domain/illustratedMarkers.ts'),{parseProject}=await server.ssrLoadModule('/src/projects/format.ts')
 base.map.mapType='world-map';base.map.theme={version:1,id:'world.painterlyFantasy',map:{},managed:{}}
 const markerLayer={id:'settlement-study',name:'Settlements',visible:true,locked:false,objectIds:[]},terrainLayer={id:'settlement-scenery',name:'Painterly vegetation',visible:true,locked:false,objectIds:[]}
 base.layers.unshift(markerLayer,terrainLayer);base.layerTree.roots.unshift(markerLayer.id,terrainLayer.id)
 const archive={...files},resources=[]
 for(const [i,[x,y,file]] of [[150,480,'broadleaf-interior-01'],[220,480,'broadleaf-interior-02'],[150,535,'broadleaf-edge-support-01'],[70,350,'ridge-low-support-01'],[340,120,'broadleaf-interior-03'],[600,620,'broadleaf-edge-01']].entries()){
  const data=await fs.readFile('public/world-assets-painterly/assets/'+file+'.png'),m=await sharp(data).metadata(),id='study-art-'+i,path='assets/'+hash(data)+'.png';archive[path]=data;resources.push({id,kind:'stamp',fileName:file,mimeType:'image/png',width:m.width,height:m.height,hash:hash(data),path})
  const width=100,o={id:'study-scenery-'+i,kind:'stamp',assetId:id,x,y,width,height:width*m.height/m.width,rotation:0,scaleX:1,scaleY:1,opacity:1};base.objects.push(o);terrainLayer.objectIds.push(o.id)
 }
 base.assets.push(...resources)
 const positions=[['capital','Aster',450,440,'capital-temperate'],['city','Stoneford',250,340,'city-stone'],['town','Brook',140,820,'town-walled'],['village','Oakham',150,130,'village-wooded'],['fort','High Keep',750,130,'fort-keep'],['harbor','Eastport',850,450,'harbor-merchant'],['ruin','Old Arch',560,800,'ruin-arch'],['landmark','Three Stones',500,120,'landmark-stones']]
 for(const [type,name,x,y] of positions){const bundle=createMarkerBundle({x,y},{...markerDefaults('world-map',type),name,label:true},base.map);bundle[0].id='study-'+type;bundle[1].id='study-label-'+type;bundle[1].ownerId=bundle[0].id;base.objects.push(...bundle);markerLayer.objectIds.push(...bundle.map(o=>o.id))}
 const reports=[]
 for(const illustrated of [false,true]){
  const doc=structuredClone(base),zip={...archive},label=illustrated?'after':'before';doc.id='settlements-'+label;doc.name='Settlements — '+(illustrated?'Illustrated':'Symbol')
  if(illustrated)for(const [type,,,,file] of positions){const entry=catalog.manifest.assets.find(a=>a.file==='assets/'+file+'.png'),d=catalog.dimensions[entry.file],id='settlement-'+entry.sha256.slice(0,48),path='assets/'+entry.sha256+'.png';zip[path]=await fs.readFile('public/settlement-assets-painterly/'+entry.file);doc.assets.push({id,kind:'stamp',fileName:entry.title,mimeType:'image/png',width:d.width,height:d.height,hash:entry.sha256,path})
   const index=doc.objects.findIndex(o=>o.id==='study-'+type),old=doc.objects[index],place=illustrateMarker(old,{assetId:id,aspect:d.width/d.height,widthKm:illustratedWidthKm(doc.map,type,old.marker.prominence)},doc.map);doc.objects[index]=place;const li=doc.objects.findIndex(o=>o.id==='study-label-'+type);doc.objects[li]=positionMarkerLabel(doc.objects[li],place,'below')
  }
  parseProject(doc);zip['project.json']=strToU8(JSON.stringify(doc));delete zip['preview.png'];await fs.writeFile(out+'/'+label+'.mapweaver',zipSync(zip));reports.push({label,objects:doc.objects.length,places:doc.objects.filter(o=>o.kind==='place').length,assets:doc.assets.length})
 }
 if(hash(await fs.readFile(source))!==hash(bytes))throw Error('Original map changed')
 await fs.writeFile(out+'/composition.json',JSON.stringify({source,sourceHash:hash(bytes),comparison:'Identical map scale, terrain and semantic Places; only explicit representation/bounds and dependent label offsets differ.',cases:reports},null,2))
 console.log(reports)
}finally{await server.close()}
