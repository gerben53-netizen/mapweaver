import sharp from 'sharp';import fs from 'node:fs/promises';
const dir='public/generated-walls/living-root-dev-1',components=[];
for(const [role,count] of [['root-long',7],['root-medium',5],['root-small',4],['knot',3],['root-end',3],['moss',3],['leaves',3]])for(let i=0;i<count;i++){
 const id=role+'-'+(i+1),w=role==='knot'||role==='moss'?160:480,h=160;
 let body='';const color=['#775238','#856143','#6c4b34','#96704b'][i%4];
 if(role==='moss'||role==='leaves')for(let j=0;j<17;j++){const x=25+(j*59+i*17)%(w-50),y=45+Math.sin(j*2+i)*34;body+=`<ellipse cx="${x}" cy="${y+30}" rx="${8+j%7}" ry="${4+j%5}" transform="rotate(${j*33} ${x} ${y+30})" fill="${['#596239','#6c7645','#879354'][j%3]}" stroke="#455333" stroke-width="2"/>`}
 else if(role==='knot'){body=`<path d="M8 95 C30 40 65 130 97 75 S140 35 153 79 M15 55 C50 5 125 30 130 87 S50 142 30 91 S75 28 110 74" fill="none" stroke="#3f3024" stroke-width="24" stroke-linecap="round"/><path d="M8 95 C30 40 65 130 97 75 S140 35 153 79 M15 55 C50 5 125 30 130 87 S50 142 30 91 S75 28 110 74" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round"/>`}
 else {
 const d=i*5,tip=role==='root-end'?475:460;
 body=`<path d="M8 85 C70 ${38+d} 145 ${108-d} 225 79 S370 ${45+d} ${tip} 78 C385 ${87+d} 337 ${122-d} 225 103 S76 ${85+d} 8 85Z" fill="${color}" stroke="#403023" stroke-width="3"/>`;
 for(let j=0;j<4;j++){const y=78+j*5;body+=`<path d="M${20+j*13} ${y} C100 ${51+d+j*7} 168 ${110-d+j*3} 240 ${y+8} S375 ${54+d+j*6} ${tip-12} 79" fill="none" stroke="${j%2?'#503a29':'#ab8156'}" stroke-width="${j%2?2:1.5}" opacity=".65"/>`}
 for(let j=0;j<3;j++){const x=110+j*105,sign=(j+i)%2?1:-1;body+=`<path d="M${x} 87 Q${x+24} ${80+sign*24} ${x+82} ${80+sign*(48-j*5)} Q${x+34} ${80+sign*12} ${x+18} 94Z" fill="${color}" stroke="#503a29" stroke-width="2"/>`}
 }
 await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`)).png().toFile(`${dir}/${id}.png`);
 components.push({id,role,image:`/generated-walls/living-root-dev-1/${id}.png`,nominalLengthFt:w/160,nominalWidthFt:1,weight:1+(i%3)*.2});
}
const pack={id:'living-root',revision:'dev-1',name:'Living Root',renderingMode:'generated',generatorType:'living-root',components,defaults:{width:1,organic:.55,growth:.45,overgrowth:.15}};
await fs.writeFile('src/domain/livingRootPack.json',JSON.stringify(pack,null,2)+'\n');
