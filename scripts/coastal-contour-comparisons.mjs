import sharp from 'sharp'
const out='deliverables.local/Coastal-Contours'
const crops={coast:{left:580,top:120,width:420,height:380},islands:{left:1050,top:100,width:460,height:350},bay:{left:700,top:350,width:350,height:340},strait:{left:1030,top:455,width:270,height:255},mouth:{left:550,top:245,width:240,height:200},lake:{left:225,top:580,width:300,height:265}}
for(const [name,rect] of Object.entries(crops)){
 const images=await Promise.all(['baseline','after'].map(async label=>({input:await sharp(out+'/'+label+'-1x.png').extract(rect).png().toBuffer(),left:label==='baseline'?0:rect.width,top:0})))
 await sharp({create:{width:rect.width*2,height:rect.height,channels:4,background:'#171a17'}}).composite(images).png().toFile(out+'/comparison-'+name+'.png')
}
