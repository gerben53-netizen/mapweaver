import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { zipSync, strToU8 } from 'fflate'
const root='public/wall-sets';mkdirSync(root,{recursive:true})
let state=173;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}
const svg=(width,height,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
const polygon=(points,fill,stroke='#373b38',width=1.5)=>`<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`
const line=(d,color,width=1)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`
function stone(seed,cap=false){state=seed;let body='';const w=cap?96:128,h=96
  const outline=cap?[[10,28],[21,15],[68,12],[84,25],[88,65],[76,81],[22,82],[10,69]]:[[0,17],[18,15],[35,18],[56,15],[81,18],[102,15],[128,17],[128,79],[104,82],[79,78],[60,81],[37,78],[17,81],[0,79]]
  body+=polygon(outline,'#474943','#30332f',2)
  for(let row=0;row<3;row++)for(let col=-1;col<4;col++){
    const x=col*43+(row%2)*21,y=19+row*20,pts=[[x+2,y+1],[x+39,y],[x+41,y+15],[x+35,y+18],[x+3,y+17]]
    body+=polygon(pts,['#929487','#a0a092','#818679','#aaa99a'][Math.floor(random()*4)],'#52574e',1.5)
    body+=line(`M${x+5},${y+4} L${x+35},${y+3}`,'#c7c6b4',.9)
    for(let k=0;k<9;k++)body+=`<circle cx="${x+4+random()*32}" cy="${y+4+random()*10}" r="${.3+random()*.6}" fill="${random()>.5?'#d7d3c0':'#626c60'}" opacity=".4"/>`
    if(random()>.45)body+=line(`M${x+13},${y+2} l3,4 -2,5 4,5`,'#61685d',.6)
  }
  return svg(w,h,`<defs><clipPath id="stone">${polygon(outline,'white','none',0)}</clipPath></defs><g clip-path="url(#stone)">${body}</g>`)
}
function timber(cap=false){state=391;let body='';const w=cap?96:128,h=96
  const outline=cap?[[15,22],[23,16],[78,18],[85,27],[83,72],[75,80],[21,79],[14,68]]:[[0,18],[28,17],[31,20],[57,17],[85,18],[89,21],[105,18],[128,18],[128,78],[92,79],[90,76],[52,79],[26,77],[0,78]]
  body+=polygon(outline,'#6d492b','#34281f',2)
  for(let row=0;row<3;row++){
    const y=20+row*19;body+=`<rect x="0" y="${y}" width="128" height="17" rx="2" fill="${['#9d7544','#b28a52','#8d693c'][row]}"/>`
    for(let k=0;k<8;k++){const yy=y+2+random()*13;body+=line(`M0,${yy} C25,${yy+random()*4-2} 41,${yy-2} 64,${yy} S102,${yy+2} 128,${yy}`,k%2?'#5f442a':'#d0aa68',.5+random()*.35)}
    body+=line(`M0,${y+1} H128`,'#dfbc7e',1)
    body+=`<ellipse cx="${33+row*24}" cy="${y+9}" rx="7" ry="2.5" fill="none" stroke="#66462b" stroke-width="1"/><ellipse cx="${33+row*24}" cy="${y+9}" rx="2" ry=".8" fill="#61452b"/>`
  }
  if(cap)for(let k=0;k<4;k++)body+=line(`M${72+k*2},22 v52`,'#513c2a',.7)
  return svg(w,h,`<defs><clipPath id="wood">${polygon(outline,'white','none',0)}</clipPath></defs><g clip-path="url(#wood)">${body}</g>`)
}
function cave(seed,cap=false){state=seed;let body=cap?'':polygon([[35,35],[89,35],[95,48],[92,93],[36,94],[31,63]],'#667168','#3b433f',1);const rocks=cap?[[64,64,44,44]]:[[36,59,31,40],[83,49,34,31],[78,83,36,29]]
  for(const [x,y,rx,ry] of rocks){const points=Array.from({length:11},(_,i)=>{const a=i*Math.PI*2/11,r=.83+random()*.17;return [x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r]})
    body+=polygon(points,'#626966','#303937',2)
    const inner=points.map(([px,py])=>[x+(px-x)*.89,y+(py-y)*.89]);body+=polygon(inner,['#90958a','#828b83','#9c9d8e'][Math.floor(random()*3)],'#b2b4a5',.8)
    for(let i=0;i<5;i++){const a=points[i*2];body+=polygon([[x+random()*9-4,y+random()*9-4],a,points[(i*2+1)%11]],i%2?'#778177':'#a3a699','none',0)}
    body+=line(`M${x-rx*.6},${y-ry*.2} l${rx*.55},${ry*.15} ${rx*.2},${ry*.4} ${rx*.25},${ry*.14}`,'#444e47',1.6)
    body+=line(`M${x-rx*.05},${y-ry*.05} l${rx*.1},${-ry*.35} ${rx*.3},${-ry*.17}`,'#535d52',1)
    for(let i=0;i<55;i++)body+=`<circle cx="${x+(random()-.5)*rx*1.25}" cy="${y+(random()-.5)*ry*1.25}" r="${.3+random()*.7}" fill="${i%2?'#d0ccba':'#454f47'}" opacity=".24"/>`
  }
  return svg(128,128,body)
}
const art=(name,width,height,anchor,weight=1,rotation=0,scaleVariation=0)=>({file:`assets/${name}.png`,width,height,anchor,weight,rotation,scaleVariation})
const metadata={schemaVersion:1,version:'1.0',author:'Mapweaver project',source:'Procedural SVG artwork in scripts/create-wall-examples.mjs',license:'Project-authored; no separate artwork license specified.'}
const sets=[
 { ...metadata,id:'masonry',title:'Masonry',description:'Dressed limestone blocks with fine joints and chipped edges.',renderingMode:'strip',nominalWidthPx:60,defaultThickness:40,repeatLengthPx:128,overlapPx:0,coreColor:'#63685e',roughnessLimits:{max:0,default:0,maxProtrusionPx:8},bodyVariants:[art('masonry',128,96,{x:0,y:48})],cap:art('masonry-cap',96,96,{x:48,y:48}),join:art('masonry-cap',96,96,{x:48,y:48}) },
 { ...metadata,id:'timber',title:'Timber',description:'Three warm timber courses with flowing grain, knots and notched edges.',renderingMode:'strip',nominalWidthPx:60,defaultThickness:32,repeatLengthPx:128,overlapPx:0,coreColor:'#795633',roughnessLimits:{max:0,default:0,maxProtrusionPx:8},bodyVariants:[art('timber',128,96,{x:0,y:48})],cap:art('timber-cap',96,96,{x:48,y:48}),join:art('timber-cap',96,96,{x:48,y:48}) },
 { ...metadata,id:'cave-rock',title:'Cave rock',description:'Overlapping fractured rock clusters with three irregular silhouettes.',renderingMode:'segments',nominalWidthPx:80,defaultThickness:56,repeatLengthPx:96,overlapPx:44,coreColor:'#667168',roughnessLimits:{max:1,default:.65,maxProtrusionPx:24},bodyVariants:[1,2,3].map(i=>art(`cave-${i}`,128,128,{x:64,y:64},1,8,.06)),cap:art('cave-cap',128,128,{x:64,y:64}),join:art('cave-cap',128,128,{x:64,y:64}) }
]
const artwork={'masonry':stone(15),'masonry-cap':stone(51,true),'timber':timber(),'timber-cap':timber(true),'cave-1':cave(345),'cave-2':cave(785),'cave-3':cave(234),'cave-cap':cave(532,true)}
for(const set of sets){
  const folder=`${root}/${set.id}`;mkdirSync(`${folder}/assets`,{recursive:true})
  const files={'wall-set.json':strToU8(JSON.stringify(set,null,2))};writeFileSync(`${folder}/wall-set.json`,files['wall-set.json'])
  for(const a of [...set.bodyVariants,set.cap,set.join])if(!files[a.file]){const name=a.file.slice(7,-4),png=await sharp(Buffer.from(artwork[name])).png().toBuffer();files[a.file]=png;writeFileSync(`${folder}/${a.file}`,png);writeFileSync(`${folder}/assets/${name}.svg`,artwork[name])}
  writeFileSync(`${root}/${set.id}.zip`,zipSync(files,{level:0}));writeFileSync(`${root}/${set.id}-preview.png`,files[set.bodyVariants[0].file])
}
writeFileSync(`${root}/catalog.json`,JSON.stringify(sets.map(s=>({id:s.id,title:s.title,version:s.version,defaultThickness:s.defaultThickness})),null,2))
console.log('Created three authored wall sets, transparent components and standalone ZIP packages.')
