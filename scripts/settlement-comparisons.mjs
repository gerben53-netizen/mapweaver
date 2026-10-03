import sharp from 'sharp'
const root='deliverables.local/Illustrated-Markers'
for(const [id,box] of [['capital-city',{left:120,top:290,width:540,height:280}],['town-village',{left:60,top:70,width:240,height:840}],['fort-harbor',{left:650,top:65,width:320,height:510}],['ruin-landmark',{left:370,top:60,width:310,height:850}]]){
 const before=await sharp(root+'/baseline-1x.png').extract(box).png().toBuffer(),after=await sharp(root+'/after-1x.png').extract(box).png().toBuffer()
 await sharp({create:{width:box.width*2,height:box.height,channels:4,background:'#d4d6bf'}}).composite([{input:before,left:0,top:0},{input:after,left:box.width,top:0}]).png().toFile(root+'/comparison-'+id+'.png')
}
