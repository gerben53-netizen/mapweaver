import {afterEach,expect,it} from 'vitest'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import {Storage} from './storage'
import {previewPack,commitPack,exportLibrary} from './libraryPacks'
import {libraryQuery} from './library'
import {parseAssetManifest} from '../src/domain/assetManifest'
import {markerCandidates} from '../src/domain/illustratedMarkers'
const root='public/settlement-assets-painterly/',stores:Storage[]=[]
const store=()=>{const s=new Storage(mkdtempSync(path.join(os.tmpdir(),'mw-settlements-')));stores.push(s);return s}
afterEach(()=>{for(const s of stores.splice(0)){s.close();rmSync(s.root,{recursive:true,force:true})}})
async function install(s:Storage,b:Uint8Array){const p=await previewPack(s,b);expect(p.errors).toEqual([]);return commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})}
it('ships 31 unique transparent assets with exact hashes and validated authorable semantics',async()=>{
 const {manifest,warnings}=parseAssetManifest(JSON.parse(readFileSync(root+'mapweaver-assets.json','utf8')))
 expect(warnings).toEqual([]);expect(manifest.assets).toHaveLength(31);expect(new Set(manifest.assets.map(a=>a.sha256)).size).toBe(31)
 const counts:Record<string,number>={}
 for(const a of manifest.assets){const type=a.tags!.find(t=>t.startsWith('marker:'))!;counts[type]=(counts[type]??0)+1;expect(a.tags).toContain('style:painterly');expect(a.tags).toContain('theme:painterly-fantasy');expect(a.applicableMapTypes).toEqual(['world-map','regional-map']);expect(a.defaultSize).toMatchObject({mode:'world',unit:'m'})
  const bytes=readFileSync(root+a.file);expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.sha256);const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});expect(info.channels).toBe(4);expect(Math.max(info.width,info.height)).toBeLessThanOrEqual(384);expect(data[3]).toBe(0);const alpha=Array.from({length:info.width*info.height},(_,i)=>data[i*4+3]);expect(alpha.some(n=>n===255)).toBe(true);expect(alpha.filter(n=>n===0).length).toBeGreaterThan(alpha.length*.15)
 }
 expect(counts).toEqual({'marker:capital':3,'marker:city':4,'marker:town':4,'marker:village':3,'marker:fort':4,'marker:harbor':3,'marker:ruin':3,'marker:tower':2,'marker:temple':2,'marker:landmark':3})
},30000)
it('imports, filters, exports and reimports marker metadata without duplicating shared sources',async()=>{
 const s=store(),pack=readFileSync(root+'mapweaver-settlements-painterly.zip');await install(s,pack);await install(s,pack)
 const a=libraryQuery(s,{limit:'200'});expect(a.total).toBe(31)
 const candidates=a.assets.map(a=>({...a,source:'library' as const}))
 expect(markerCandidates(candidates,'capital','world-map')).toHaveLength(3);expect(markerCandidates(candidates,'harbor','regional-map',{family:'painterly',theme:'painterly-fantasy'})).toHaveLength(3);expect(markerCandidates(candidates,'city','battlemap')).toHaveLength(0)
 const other=store();await install(other,exportLibrary(s,a.assets.map(a=>a.id)));const b=libraryQuery(other,{limit:'200'})
 const metadata=(assets:typeof a.assets)=>assets.map(a=>[a.name,a.sha256,a.tags,a.applicableMapTypes,a.defaultSize]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))
 expect(metadata(b.assets)).toEqual(metadata(a.assets));expect(b.total).toBe(31)
},30000)
