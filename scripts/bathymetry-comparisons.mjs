import sharp from 'sharp'
import fs from 'node:fs/promises'
const out='deliverables.local/Bathymetry-Study'
const crops={ocean:[1280,450,300,260],coast:[675,20,385,250],island:[1000,100,400,310],bay:[575,165,480,300],mouth:[510,260,300,190],shallow:[980,620,420,240],deep:[730,505,350,220],lake:[210,565,335,285]}
for(const [name,[left,top,width,height]] of Object.entries(crops)){
 const images=[]
 for(const phase of ['baseline','after']){const png=await sharp(out+'/'+phase+'-1x.png').extract({left,top,width,height}).png().toBuffer();await fs.writeFile(out+'/'+name+'-'+phase+'.png',png);images.push(png)}
 const label=Buffer.from(`<svg width="${width*2+12}" height="30"><rect width="100%" height="100%" fill="#20282d"/><g fill="#eee" font-family="sans-serif" font-size="14"><text x="8" y="21">Before — ${name}</text><text x="${width+20}" y="21">After — bathymetry</text></g></svg>`)
 await sharp({create:{width:width*2+12,height:height+30,channels:4,background:'#20282d'}}).composite([{input:label,left:0,top:0},{input:images[0],left:0,top:30},{input:images[1],left:width+12,top:30}]).png().toFile(out+'/'+name+'-comparison.png')
}
await fs.writeFile(out+'/crops.json',JSON.stringify(crops,null,2))
