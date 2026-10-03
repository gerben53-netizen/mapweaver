import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { unzipSync, zipSync, strToU8 } from 'fflate'
import sharp from 'sharp'
const out=path.resolve('deliverables.local/eldric-pqa-integration')
const root=path.join(out,'input/Eldric-Bibliotheek-PQA')
const requirementsZip=unzipSync(fs.readFileSync('deliverables.local/PQA-Requirements/Eldric-Bibliotheek-PQA-Requirements.zip'))
const get=name=>{const names=Object.keys(requirementsZip).filter(n=>n.endsWith('/'+name));if(names.length!==1)throw Error('Ambiguous requirement '+name);return JSON.parse(Buffer.from(requirementsZip[names[0]]).toString())}
const requirements=get('eldric-bibliotheek-assets.json'),reuse=get('eldric-bibliotheek-existing-keep.json'),mapping=get('eldric-bibliotheek-replacement-map.json')
const production=JSON.parse(fs.readFileSync(path.join(root,'production-metadata.json')))
const checks=[],assets=[],files={}
if(production.assets.length!==5||requirements.assets.length!==5)throw Error('Five concepts required')
for(const r of requirements.assets){
 const p=production.assets.find(a=>a.proposedId===r.proposedId)
 if(!p)throw Error('Missing concept '+r.proposedId)
 const {productionQA,...contract}=p
 if(JSON.stringify(contract)!==JSON.stringify(r))throw Error('Requirements conflict '+r.proposedId)
 const bytes=fs.readFileSync(path.join(root,'production',r.filename)),digest=createHash('sha256').update(bytes).digest('hex')
 const meta=await sharp(bytes).metadata(),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let minX=info.width,minY=info.height,maxX=-1,maxY=-1,zero=0,partial=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a===0)zero++;if(a>0&&a<255)partial++;if(a>=16){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
 const margins=[minX/info.width,minY/info.height,(info.width-1-maxX)/info.width,(info.height-1-maxY)/info.height]
 if(meta.format!=='png'||!meta.hasAlpha||!zero||maxX<0||digest!==productionQA.sha256||meta.width!==r.deliveryPixelDimensions.width||meta.height!==r.deliveryPixelDimensions.height||margins.some(m=>m>.02001))throw Error('Unsafe technical integration '+r.proposedId)
 const provenance={conceptId:r.proposedId,replacesAssetIds:r.replacesAssetIds,variantGroup:r.variantGroup,cleanDressedRelation:r.cleanDressedRelation,productionPack:'Eldric-Bibliotheek-PQA',productionDecision:'KEEP'}
 const source=JSON.stringify(provenance);if(source.length>1000)throw Error('Provenance too long')
 const file='images/'+r.filename;files[file]=bytes
 assets.push({file,type:'stamp',title:r.displayName,originalName:r.filename,description:r.semanticRole,tags:[...r.tags,'pqa:'+r.proposedId],categoryPath:r.categoryPath,defaultSize:{mode:'world',width:r.intendedWidthFt,height:r.intendedHeightFt,unit:'ft',lockAspectRatio:true},applicableMapTypes:r.applicableMapTypes,sha256:digest,source,quality:{classification:'KEEP',reason:'Work-geaccepteerd productie-artwork; technische preflight geslaagd. Geïntegreerde fidelitycontrole staat in het sprintrapport.',semanticClass:r.semanticClass,softShadowDefault:r.softShadowDefault}})
 checks.push({conceptId:r.proposedId,sha256:digest,pixels:[meta.width,meta.height],worldFeet:[r.intendedWidthFt,r.intendedHeightFt],hasAlpha:meta.hasAlpha,transparentPixels:zero,partialPixels:partial,alphaBoundsAt16:{left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1},margins,requirementsMatch:true,bytesUnchanged:true,visualPreflight:'Top-down functionele vakken/boeken of vrij werkblad, geen evidente directionele slagschaduw/halo op meegeleverde alpha/reference sheets. Definitieve speelzoomcontrole in echte renderer volgt.'})
}
const manifest={schemaVersion:1,collection:{title:'Koningsboom — Bibliotheek & studie PQA',description:'Vijf productieconcepten, Work-accepted; integratie/fidelitybenchmark oktober 2026.'},assets}
files['mapweaver-assets.json']=strToU8(JSON.stringify(manifest,null,2))
fs.writeFileSync(path.join(out,'mapweaver-assets.json'),JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync(path.join(out,'eldric-bibliotheek-mapweaver-assets.zip'),zipSync(files,{level:6}))
fs.writeFileSync(path.join(out,'preflight.json'),JSON.stringify({assets:checks,blockers:[]},null,2))
fs.writeFileSync(path.join(out,'requirements.json'),JSON.stringify(requirements,null,2))
fs.writeFileSync(path.join(out,'reuse.json'),JSON.stringify(reuse,null,2))
fs.writeFileSync(path.join(out,'replacement-mapping.json'),JSON.stringify(mapping,null,2))
console.log(JSON.stringify({count:assets.length,blockers:[],output:out}))
