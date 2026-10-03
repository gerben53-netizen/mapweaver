// Development-only packs: reuse existing artwork bytes; this does not generate graphics.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { zipSync, unzipSync, strToU8 } from 'fflate'
const output='deliverables.local/Wall-Materials'
mkdirSync(output,{recursive:true})
for(const [source,id,title,category,widths,defaults] of [
  ['timber','living-root-dev','Living Root — development fixture','Organic',{thin:1.5,standard:3.5,heavy:6,massive:10},{variation:.7,organic:.65,growth:.3,overgrowth:0}],
  ['masonry','pale-stone-dev','Pale Stone — development fixture','Masonry',{thin:1,standard:2,heavy:4,massive:6},{variation:.25,organic:.05,growth:0,overgrowth:0}],
]){
  const files=unzipSync(readFileSync(`public/wall-sets/${source}.zip`)),manifest=JSON.parse(new TextDecoder().decode(files['wall-set.json']))
  const all=manifest.bodyVariants.map((_,i)=>i)
  Object.assign(manifest,{id,title,version:'1.0.0-dev',description:`Renderer validation fixture reusing unchanged ${source} artwork. Not final ${category.toLowerCase()} art.`,renderingMode:'continuous',continuous:{
    version:1,category,sources:{fill:all,variation:all,growth:all,overgrowth:all},
    scale:{unit:'ft',textureLength:6,textureWidth:3,organicWavelength:5,edgeWidth:.2},widths,supported:['variation','organic','growth','overgrowth'],defaults,
    presets:[{name:'Clean',values:{variation:.15,organic:0,growth:0,overgrowth:0}},{name:'Natural',values:defaults},{name:'Ancient',values:{variation:.85,organic:.8,growth:.7,overgrowth:.2}},{name:'Overgrown',values:{variation:.8,organic:.8,growth:.6,overgrowth:.9}}],
    options:[{id:'textureScale',label:'Texture scale',target:'textureScale',min:.25,max:4,default:1},{id:'edgeStrength',label:'Contact edge',target:'edgeStrength',min:.05,max:2,default:1}]
  }})
  files['wall-set.json']=strToU8(JSON.stringify(manifest,null,2))
  writeFileSync(`${output}/${id}.zip`,zipSync(files,{level:6}))
  writeFileSync(`${output}/${id}.json`,JSON.stringify(manifest,null,2))
  console.log(`${output}/${id}.zip (original artwork bytes unchanged)`)
}
