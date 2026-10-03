import { readFileSync, readdirSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
const root='deliverables.local/asset-library-audit',plan=JSON.parse(readFileSync(path.join(root,'migration-plan.json')))
const files=readdirSync(path.join(root,'context-proofs')).filter(f=>/^\d+\.png$/.test(f)).sort((a,b)=>parseInt(a)-parseInt(b))
mkdirSync(path.join(root,'contact-sheets','context-play-size'),{recursive:true})
for(let start=0;start<files.length;start+=42){const slice=files.slice(start,start+42),height=Math.ceil(slice.length/7)*180,parts=[]
 for(const [i,file] of slice.entries()){const x=i%7*200,y=Math.floor(i/7)*180,e=plan.entries.find(e=>e.auditIndex===parseInt(file));parts.push({input:await sharp(path.join(root,'context-proofs',file)).resize(200,150).png().toBuffer(),left:x,top:y});const name=e.name.replaceAll('&','&amp;').replaceAll('<','&lt;').slice(0,28);parts.push({input:Buffer.from(`<svg width="200" height="180"><text x="4" y="166" fill="white" font-size="11">${e.auditIndex} · ${name}</text></svg>`),left:x,top:y})}
 await sharp({create:{width:1400,height,channels:4,background:'#24292b'}}).composite(parts).png().toFile(path.join(root,'contact-sheets','context-play-size',`${start/42+1}.png`))
}
console.log(`${files.length} real-renderer proofs composed at 50% play size`)
