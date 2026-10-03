import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {zipSync} from 'fflate'
const destination=path.resolve('deliverables.local/Rock-Cave-Wall-Production-Spec'),pack=JSON.parse(await fs.readFile('src/domain/caveRockPack.json','utf8')),entries={},components=[],art=[]
await fs.mkdir(path.join(destination,'reference-components'),{recursive:true})
for(const [i,c]of pack.components.entries()){
 const bytes=await fs.readFile(path.join('public',c.image)),m=await sharp(bytes).metadata(),filename=c.id+'.png'
 await fs.writeFile(path.join(destination,'reference-components',filename),bytes);entries['reference-components/'+filename]=bytes
 components.push({...c,image:undefined,filename,canvas:{width:m.width,height:m.height,unit:'pixels'},physicalFootprint:{lengthFt:c.nominalLengthFt,widthFt:c.nominalWidthFt},safeBounds:{left:2,top:2,right:m.width-3,bottom:m.height-3},orientation:'90-degree orthographic overhead; square radial mass, no front face',anchor:{x:m.width/2,y:m.height/2,meaning:'center of full untrimmed canvas'},allowedRotationDegrees:[0,360],allowedScaling:'Uniform only, no mirroring or anisotropic stretch. Typical actual diameter 0.576–1.665 ft (core) or 0.52–1.28 ft (edge); tiny terminal intervals may uniformly shrink further. Canvas footprint is nominal reference, not a mandatory output size.',coverage:{opaqueCenteredDiskRadiusPixels:m.width*.39,maximumOpaqueSilhouetteRadiusPixels:m.width*.47,antialiasFringePixels:1,alphaInsideCore:255},alpha:'8-bit straight-alpha sRGB RGBA; no holes through coverage disk; transparent outside bounded silhouette; no matte, background, floor, baked shadow, vertical faces; silhouette AA only',selection:'Weighted seed-indexed choice within role; weight is consumed. All three variants equally likely.'})
 const size=Math.round(c.nominalWidthFt*180);art.push({input:await sharp(bytes).resize(size,size).png().toBuffer(),left:55+i%3*330+Math.round((180-size)/2),top:170+Math.floor(i/3)*240+Math.round((180-size)/2)})
}
const labels=components.map((c,i)=>`<text x="${55+i%3*330}" y="${150+Math.floor(i/3)*240}" fill="#eee" font-size="17">${c.id} · ${c.nominalWidthFt} ft</text>`).join('')
// A footprint assembly diagram, not a Mapweaver production-quality proof.
for(let i=0;i<10;i++){const bytes=entries['reference-components/rock-large-'+(i%3+1)+'.png'],rotated=await sharp(bytes).resize(180,180).rotate(i*73,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),m=await sharp(rotated).metadata();art.push({input:rotated,left:Math.round(170+i*54-m.width/2),top:Math.round(1210-m.height/2)})}
const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="1420"><rect width="1060" height="1420" fill="#303534"/><text x="35" y="40" fill="#fff" font-size="25">Natural Cave Rock: 9 technical mass references</text><text x="35" y="77" fill="#ffd078" font-size="18">DO NOT COPY VISUAL STYLE — DEVELOPMENT REFERENCE ONLY</text>${labels}<text x="35" y="938" fill="#fff" font-size="18">180 px/ft · all roles shown at the same physical scale</text><text x="35" y="977" fill="#fff" font-size="18">Rotated overlapping masses cover the route; edge masses vary the silhouette.</text><text x="35" y="1017" fill="#fff" font-size="18">Wide walls add masses. Curves/corners use the same components; no courses.</text><text x="35" y="1057" fill="#fff" font-size="18">Opaque center disk: radius 39%; opaque outline at most 47%, plus 1px AA.</text><text x="35" y="1390" fill="#fff" font-size="18">Assembly diagram: ordinary rotated overlapping masses; no special end/corner images.</text></svg>`)
await sharp(svg).composite(art).png().toFile(path.join(destination,'proof-layout.png'))
const spec=`# Natural Cave Rock — Production Artwork Specification

**DO NOT COPY VISUAL STYLE — DEVELOPMENT REFERENCE ONLY.** This is a standalone commission for nine transparent rock-mass PNGs. No application, source code, database or manifest knowledge is needed. References prove technical footprints only; their plain colors and simple cracks are NOT Premium quality.

## Deliverables

Exactly nine files, filenames and pixel dimensions in rock-cave-components.json: three rock-large (256 × 256 px, nominal 1 × 1 ft), three rock-medium (192 × 192 px, nominal 0.75 × 0.75 ft), three rock-small (128 × 128 px, nominal 0.5 × 0.5 ft). 256 source pixels per foot. Keep full square canvases, filenames and centered anchors; no trimming, added padding, resampling or renamed assets. Do not reproduce reference alpha bounds pixel-for-pixel: the coverage disk and safe bounds below are mandatory. Production integration creates a new immutable material revision; these development images are not silently replaced in existing maps.

## Visual direction: Natural Cave Rock

Exact orthographic 90° overhead. Each asset is a coherent geological rock mass/cluster forming the physical cave boundary, NOT a cave-floor swatch, brick, rectangular wall strip or perspective cliff. Restrained gray/brown/earth mineral palette, richly painted believable cracks and strata, refined local texture and readable mass hierarchy at play zoom. All lighting must remain neutral under arbitrary full rotation. No directional highlight, baked cast shadow, visible vertical/front/side face, floor, ground plane, border plate, labels or decoration. No vegetation for this first pack. Cracks describe opaque material: never cut transparent cracks through the core. Variants must differ meaningfully in contour and internal geology without introducing a recurring central motif.

## Mandatory alpha and coverage

8-bit sRGB RGBA PNG with straight alpha. Whole canvas represents the physical footprint. Center is the full-canvas midpoint. Every pixel within a disk of radius **39% of canvas width** centered there must be fully opaque (alpha 255). Artwork may have irregular lobes beyond that disk but opaque artwork must stay within radius **47% of canvas width**; a maximum one-source-pixel antialias fringe is allowed beyond that radial boundary. Every nontransparent pixel must stay within the two-pixel inset safeBounds. No internal transparent holes, floaters, deep cuts through the core or long wisps. Fully transparent pixels should have zero RGB; no white/black matte fringes. Antialias only the exterior edge. The centered opaque disk is essential: overlapping masses must never create accidental gameplay holes. It may be visually subdivided by cracks and texture while remaining opaque. References and proof-layout show required relative scale, not final drawing style.

## How masses assemble

Masses overlap densely with additional scattered surface masses across a native open or closed wall route. No separate corner, endpoint, jamb or elongated sprite is needed. A wall normally uses large/medium core masses and smaller edge masses. All images rotate 0–360° without mirroring. Uniform scaling only: no stretching to create a wall strip. Representative core diameter is 0.576–1.665 ft, edge diameter 0.52–1.28 ft; narrower/shorter terminal segments uniformly shrink. Wider walls add overlapping masses across the route rather than widening individual rocks indefinitely. Core opaque disks overlap; their exterior geological outlines remain visible and form the actual silhouette. Ordinary masses also round abrupt corners, closed seams and free ends. Passages remove the appropriate interval and retain a wide safety cutout; don't bake doors or rectangular end caps into artwork.

Width presets: 0.5, 1, 2, 3 ft. Roughness varies edge protrusions and edge-mass size within bounds; Variation changes local choice, full rotation, restrained center jitter and ±4% uniform scale. Defaults: Standard 1 ft, Roughness 55%, Variation 70%. Seed explicitly randomizes repeatable arrangements. All component weights are 1; only ID/role/image, nominal footprint and weight are technical component metadata. No Density or special artwork-driven lighting is required.

## Producer checklist

Deliver exactly the nine individual PNGs, separate neutral/checkerboard contact sheet and distribution license/provenance note. Never bake contact sheet background into PNGs. Review dark and light backdrops, rotation, overlaps, free ends, S-curves, passage breaks and repeated long walls at one consistent physical scale. Small roles are coherent rock masses/fillers, not dust or floor decals. Production visuals should look natural and premium; this engineering handoff certifies footprint/coverage, not final art quality. The eventual product pack is **Natural Cave Rock**, separate from Cave Floor material.
`
const readme=`# WORK — Natural Cave Rock

Create nine premium transparent PNGs using rock-cave-component-spec.md and rock-cave-components.json. Exact filenames/canvases and opaque center disk are mandatory. No Mapweaver access, code, manifests or database work is required.

**DO NOT COPY VISUAL STYLE — DEVELOPMENT REFERENCE ONLY.** reference-components and proof-layout are footprint/relative-scale references. They are not desired visual quality. Deliver original production art plus license/provenance. Read the full spec before drawing.
`
for(const[name,value]of [['rock-cave-component-spec.md',spec],['README-WORK.md',readme],['rock-cave-components.json',JSON.stringify({version:1,status:'DEVELOPMENT REFERENCE ONLY; production commission: Natural Cave Rock',components},null,2)+'\n']]){entries[name]=Buffer.from(value);await fs.writeFile(path.join(destination,name),entries[name])}
entries['proof-layout.png']=await fs.readFile(path.join(destination,'proof-layout.png'))
await fs.writeFile(destination+'.zip',zipSync(entries,{level:6}));console.log(destination+'.zip')
