import fs from 'node:fs/promises'
import sharp from 'sharp'
const root='deliverables.local/Velanth-BrushTextureQuality'
const {crops}=JSON.parse(await fs.readFile(root+'/recipe.json','utf8'))
for(const c of crops){
  const region={left:c.x,top:c.y,width:c.width,height:c.height}
  const before=await sharp(root+'/baseline-1x.png').extract(region).png().toBuffer()
  const after=await sharp(root+'/after-1x.png').extract(region).png().toBuffer()
  await fs.writeFile(root+'/'+c.name+'-before.png',before);await fs.writeFile(root+'/'+c.name+'-after.png',after)
  const title=Buffer.from(`<svg width="${c.width*2}" height="34"><rect width="100%" height="100%" fill="#202728"/><text x="12" y="23" font-family="sans-serif" font-size="15" fill="white">Before — ${c.name}</text><text x="${c.width+12}" y="23" font-family="sans-serif" font-size="15" fill="white">After — premium brush only</text></svg>`)
  await sharp({create:{width:c.width*2,height:c.height+34,channels:3,background:'#202728'}}).composite([{input:title,left:0,top:0},{input:before,left:0,top:34},{input:after,left:c.width,top:34}]).png().toFile(root+'/'+c.name+'-comparison.png')
}
console.log('Five identical-coordinate comparisons written; no resize or changes to reference images.')
