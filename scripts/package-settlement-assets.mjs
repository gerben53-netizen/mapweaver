import fs from 'node:fs/promises'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {zipSync,strToU8} from 'fflate'
const root='public/settlement-assets-painterly',prompts=JSON.parse(await fs.readFile(root+'/prompts.json','utf8')),assets=[],dimensions={},files={},catalog=[],provenance=[]
await fs.mkdir(root+'/assets',{recursive:true})
const hash=b=>createHash('sha256').update(b).digest('hex')
for(const [i,p] of prompts.entries()){
 const file='assets/'+p.id+'.png',source='.qa.local/illustrated-markers/sources/'+p.id+'.png'
 let bytes
 try{const original=await fs.readFile(source);bytes=await sharp(original).resize(384,384,{fit:'inside',withoutEnlargement:true}).png().toBuffer();await fs.writeFile(root+'/'+file,bytes);provenance.push({id:p.id,sourceSha256:hash(original),outputSha256:hash(bytes),tool:'OpenAI built-in imagegen',promptId:p.id})}
 catch(e){if(e.code!=='ENOENT')throw e;bytes=await fs.readFile(root+'/'+file)}
 const m=await sharp(bytes).metadata();if(!m.hasAlpha)throw Error('Missing alpha: '+p.id)
 dimensions[file]={width:m.width,height:m.height};files[file]=bytes
 const baseWidth={capital:300000,city:220000,town:160000,village:120000,fort:180000,harbor:180000,ruin:140000,tower:100000,temple:120000,landmark:180000}[p.type]
 const a={file,type:'stamp',title:p.title,description:'Painterly world-map '+p.type+' illustration. Northwest light, transparent background; no embedded label.',categoryPath:['World Map','Painterly Settlements',p.type],tags:['marker:'+p.type,'theme:painterly-fantasy','style:painterly','northwest-light',...(p.id.includes('arid')?['arid']:p.id.includes('northern')||p.id.includes('alpine')?['northern']:['temperate'])],defaultSize:{mode:'world',width:baseWidth,unit:'m',lockAspectRatio:true},applicableMapTypes:['world-map','regional-map'],author:'Mapweaver — AI-assisted artwork',source:'OpenAI built-in imagegen; prompts.json and provenance.json',license:'See LICENSE.txt',sha256:hash(bytes)}
 assets.push(a)
 catalog.push({input:await sharp(bytes).resize(170,140,{fit:'contain',background:'#00000000'}).png().toBuffer(),left:(i%5)*190+10,top:Math.floor(i/5)*175})
 catalog.push({input:Buffer.from(`<svg width="190" height="35"><text x="95" y="13" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#26372e">${p.title}</text><text x="95" y="29" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#26372e">${p.type}</text></svg>`),left:(i%5)*190,top:Math.floor(i/5)*175+140})
}
const manifest={schemaVersion:3,collection:{title:'Painterly Settlements & Landmarks',description:'31 transparent world/regional-map illustrations for semantic Smart Markers.'},assets}
await fs.writeFile(root+'/mapweaver-assets.json',JSON.stringify(manifest,null,2));await fs.writeFile(root+'/catalog.json',JSON.stringify({manifest,dimensions},null,2))
if(provenance.length)await fs.writeFile(root+'/provenance.json',JSON.stringify({version:1,assets:provenance},null,2))
await sharp({create:{width:950,height:Math.ceil(assets.length/5)*175,channels:4,background:'#d4d6bf'}}).composite(catalog).png().toFile(root+'/catalog.png')
for(const file of ['mapweaver-assets.json','README.md','LICENSE.txt','prompts.json','provenance.json'])files[file]=strToU8(await fs.readFile(root+'/'+file,'utf8'))
files['catalog.png']=await fs.readFile(root+'/catalog.png')
await fs.writeFile(root+'/mapweaver-settlements-painterly.zip',zipSync(files,{level:6}))
console.log(JSON.stringify({count:assets.length,counts:assets.reduce((r,a)=>{const type=a.tags[0];r[type]=(r[type]??0)+1;return r},{})}))
