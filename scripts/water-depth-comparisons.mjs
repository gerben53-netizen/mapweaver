import fs from 'node:fs/promises'
import sharp from 'sharp'
const root='deliverables.local/WaterDepth-Study'
const crops=[{name:'coastal-shallows',x:720,y:360,width:390,height:330},{name:'open-water',x:970,y:510,width:530,height:360},{name:'river-mouth',x:535,y:235,width:310,height:230},{name:'inland-lake',x:200,y:570,width:340,height:285}]
await fs.writeFile(root+'/crops.json',JSON.stringify(crops,null,2))
for(const c of crops){
  const region={left:c.x,top:c.y,width:c.width,height:c.height}
  const before=await sharp(root+'/baseline-1x.png').extract(region).png().toBuffer()
  const after=await sharp(root+'/after-1x.png').extract(region).png().toBuffer()
  await fs.writeFile(root+'/'+c.name+'-before.png',before);await fs.writeFile(root+'/'+c.name+'-after.png',after)
  const title=Buffer.from(`<svg width="${c.width*2}" height="34"><rect width="100%" height="100%" fill="#202728"/><text x="12" y="23" font-family="sans-serif" font-size="15" fill="white">Before — ${c.name}</text><text x="${c.width+12}" y="23" font-family="sans-serif" font-size="15" fill="white">After — Water Depth</text></svg>`)
  await sharp({create:{width:c.width*2,height:c.height+34,channels:3,background:'#202728'}}).composite([{input:title,left:0,top:0},{input:before,left:0,top:34},{input:after,left:c.width,top:34}]).png().toFile(root+'/'+c.name+'-comparison.png')
}
console.log('Four identical-coordinate comparisons written; no resize or changes to reference images.')
