import fs from 'node:fs/promises';
import sharp from 'sharp';
const directory='public/generated-walls/sung-wood-dev-1';await fs.mkdir(directory,{recursive:true});
const components=[];
for(const [id,role,width,length] of [['grown-body-long-1','root-long',480,3],['grown-body-medium-1','root-medium',320,2],['grown-body-small-1','root-small',160,1],['grown-join-1','knot',160,1],['grown-end-1','root-end',320,2]]){
 const h=160,join=role==='knot',pad=10,mid=width/2;
 const shape=join?'M18 80 C12 51 40 31 79 36 C117 28 145 51 143 83 C147 111 121 126 84 123 C42 130 15 107 18 80Z':`M${pad} 80 C${pad} 52 ${mid*.35} 40 ${mid} 44 C${mid*1.35} 43 ${width-pad} 45 ${width-pad} 80 C${width-pad} 111 ${mid*1.4} 119 ${mid} 116 C${mid*.6} 123 ${pad} 111 ${pad} 80Z`;
 const grain=join?'<path d="M32 70 C50 44 102 46 128 70 M30 89 C63 68 104 76 126 96 M47 108 C70 91 101 94 117 104"/>':`<path d="M22 71 C${mid*.65} 54 ${mid*1.25} 80 ${width-23} 64 M21 86 C${mid*.65} 96 ${mid*1.35} 69 ${width-25} 87 M34 103 C${mid*.75} 88 ${mid*1.4} 111 ${width-33} 97"/>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}"><defs><linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a58257"/><stop offset=".45" stop-color="#b28e60"/><stop offset="1" stop-color="#a58257"/></linearGradient><clipPath id="body"><path d="${shape}"/></clipPath></defs><path d="${shape}" fill="url(#wood)" stroke="none"/><g clip-path="url(#body)" fill="none" stroke="#785d40" stroke-width="1.5" opacity=".12">${grain}</g></svg>`;
 await sharp(Buffer.from(svg)).png().toFile(`${directory}/${id}.png`);
 components.push({id,role,image:`/generated-walls/sung-wood-dev-1/${id}.png`,nominalLengthFt:length,nominalWidthFt:1,weight:1});
}
const definition={id:'sung-wood',revision:'dev-1',name:'Gezongen hout — DEV',renderingMode:'generated',generatorType:'living-root',components,defaults:{width:1,organic:.08,growth:0,overgrowth:0}};
await fs.writeFile('src/domain/sungWoodPack.json',JSON.stringify(definition,null,2)+'\n');
await fs.writeFile(directory+'/README.txt','DEVELOPMENT ONLY — NOT PRODUCTION ARTWORK\nDo not copy visual style. Technical shape/footprint references only.\n');
console.log('Created five deterministic DEV components; production assets unchanged.');
