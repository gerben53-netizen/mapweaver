import fs from 'node:fs/promises'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {zipSync,strToU8} from 'fflate'
const root='public/world-assets-painterly',manifest=JSON.parse(await fs.readFile(root+'/mapweaver-assets.json','utf8')),config=JSON.parse(await fs.readFile(root+'/hierarchy.json','utf8'))
const additions=[
 {id:'frost-tree-detail-01',family:'Conifer Forest',type:'tree',roles:['sparseVegetation','forestEdge'],biomes:['snow','alpine','conifer'],tier:'detail',width:220000,subject:'One small, asymmetrical frost-dusted spruce, sparse branches, exposed roots, no ground island.'},
 {id:'broadleaf-edge-support-01',family:'Broadleaf Forest',type:'forestCluster',roles:['forestEdge','forestCluster'],biomes:['temperate','deciduous'],tier:'support',width:450000,subject:'Three modest young broadleaf trees with unequal heights, sparse open canopy, no ground island.'},
 {id:'ridge-low-support-01',family:'Mountains',type:'mountain',roles:['ridge','foothill'],biomes:['temperate','alpine'],tier:'support',width:650000,axis:-30,subject:'Long low saddle ridge with three unequal rocky knolls from lower left to upper right, mossy foothill skirt.'},
 {id:'alpine-rock-detail-01',family:'Snow & Alpine',type:'rockCluster',roles:['rockScatter','foothill'],biomes:['snow','alpine','generic'],tier:'detail',width:180000,subject:'Three small angular slate rocks with patchy snow, unequal forms, no tall peak or ground island.'}
]
const originalHashes=Object.fromEntries(manifest.assets.filter(a=>!additions.some(v=>a.file==='assets/'+v.id+'.png')).map(a=>[a.file,a.sha256]))
for(const a of manifest.assets){const id=a.file.split('/').at(-1).replace('.png',''),over=config.overrides[id];if(over){a.generator={...a.generator,...over};a.description=a.description.replace(/ Hierarchy: [a-z]+\./g,'')+' Hierarchy: '+over.hierarchy+'.';a.tags=[...new Set([...a.tags.filter(t=>!['hero','primary','support','detail'].includes(t)),over.hierarchy])];}}
const provenance=[]
for(const a of additions){
 const file='assets/'+a.id+'.png',source='.qa.local/asset-hierarchy/sources/'+a.id+'.png',edge=a.tier==='detail'?256:384
 let bytes
 try {const original=await fs.readFile(source);bytes=await sharp(original).resize(edge,edge,{fit:'inside',withoutEnlargement:true}).png().toBuffer();await fs.writeFile(root+'/'+file,bytes);provenance.push({id:a.id,originalSha256:createHash('sha256').update(original).digest('hex'),subject:a.subject,tool:'OpenAI built-in imagegen',lightingReview:'Northwest highlight and southeast shadow visually inspected; alpha composited on neutral ground.'})}
 catch(e){if(e.code!=='ENOENT')throw e;bytes=await fs.readFile(root+'/'+file)}
 const entry={file,type:'stamp',title:'Painterly '+a.id.replaceAll('-',' '),description:'Painterly atlas miniature, northwest lighting. Hierarchy: '+a.tier+'.',categoryPath:['World Map','Painterly World',a.family],tags:['painterly','northwest-light',a.tier],defaultSize:{mode:'world',width:a.width,unit:'m',lockAspectRatio:true},applicableMapTypes:['world-map','regional-map'],author:'Mapweaver — AI-assisted artwork',source:'OpenAI built-in imagegen; hierarchy-provenance.json',license:'See LICENSE.txt — generated asset usage note',sha256:createHash('sha256').update(bytes).digest('hex'),generator:{version:1,semanticType:a.type,roles:a.roles,biomes:a.biomes,themes:['painterlyFantasy'],weight:8,hierarchy:a.tier,lighting:'northwest',scale:{min:a.tier==='detail'?.75:.82,max:a.tier==='detail'?1.05:1.08},rotation:{allowed:false,min:0,max:0},spacing:a.tier==='detail'?.8:.9,...(a.axis!==undefined?{ridgeAxis:a.axis}:{})}}
 const index=manifest.assets.findIndex(v=>v.file===file);if(index>=0)manifest.assets[index]=entry;else manifest.assets.push(entry)
}
manifest.collections=[...new Set(manifest.assets.map(a=>a.categoryPath.at(-1)))].map(family=>({title:'Painterly World — '+family,description:'Coherent northwest-lit fantasy atlas family',members:manifest.assets.filter(a=>a.categoryPath.at(-1)===family).map(a=>({file:a.file,type:a.type}))}))
if(provenance.length)await fs.writeFile(root+'/hierarchy-provenance.json',JSON.stringify({version:1,style:'Elevated oblique cartographic gouache miniature, restrained fine ink edges, warm northwest highlights and cool southeast shadows; transparent background; no text or scenery.',assets:provenance},null,2))
const files={},catalog=[]
for(const [i,a] of manifest.assets.entries()){
 const bytes=await fs.readFile(root+'/'+a.file);if(originalHashes[a.file]&&createHash('sha256').update(bytes).digest('hex')!==originalHashes[a.file])throw Error('Original artwork changed: '+a.file);files[a.file]=bytes
 catalog.push({input:await sharp(bytes).resize(180,140,{fit:'contain',background:'#00000000'}).png().toBuffer(),left:(i%5)*210+15,top:Math.floor(i/5)*175})
 const label=a.file.split('/').at(-1).replace('.png',''),tier=a.generator?.hierarchy??'manual'
 catalog.push({input:Buffer.from(`<svg width="210" height="35"><text x="105" y="12" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#27372e">${label}</text><text x="105" y="28" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#27372e">${tier}</text></svg>`),left:(i%5)*210,top:Math.floor(i/5)*175+140})
}
await fs.writeFile(root+'/mapweaver-assets.json',JSON.stringify(manifest,null,2))
for(const file of ['mapweaver-assets.json','README.md','LICENSE.txt','provenance.json','hierarchy.json','hierarchy-provenance.json','hierarchy-prompts.json'])files[file]=strToU8(await fs.readFile(root+'/'+file,'utf8'))
await sharp({create:{width:1050,height:Math.ceil(manifest.assets.length/5)*175,channels:4,background:'#d4d6bf'}}).composite(catalog).png().toFile(root+'/hierarchy-catalog.png')
files['hierarchy-catalog.png']=await fs.readFile(root+'/hierarchy-catalog.png')
await fs.writeFile(root+'/mapweaver-world-painterly.zip',zipSync(files,{level:6}))
console.log(JSON.stringify({assets:manifest.assets.length,tiers:manifest.assets.reduce((out,a)=>{const tier=a.generator?.hierarchy??'manual';out[tier]=(out[tier]??0)+1;return out},{})}))
