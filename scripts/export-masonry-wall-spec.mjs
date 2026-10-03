import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { zipSync } from 'fflate'

const destination=path.resolve('deliverables.local/Masonry-Wall-Production-Spec')
await fs.mkdir(path.join(destination,'reference-components'),{recursive:true})
const pack=JSON.parse(await fs.readFile('src/domain/masonryDressedPack.json','utf8'))
const components=[],entries={},composites=[]
for(const [index,c] of pack.components.entries()){
 const bytes=await fs.readFile(path.join('public',c.image)), image=sharp(bytes), meta=await image.metadata()
 const {data,info}=await image.ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=-1,bottom=-1
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*info.channels+info.channels-1]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
 const filename=c.id+'.png',reference='reference-components/'+filename
 await fs.writeFile(path.join(destination,reference),bytes);entries[reference]=bytes
 components.push({...c,image:undefined,filename,pixelWidth:meta.width,pixelHeight:meta.height,canvasLengthFt:c.nominalLengthFt,canvasWidthFt:c.nominalWidthFt,authoringDirection:'positive X, horizontal, exact orthographic 90-degree overhead',alpha:'RGBA PNG; transparent outside stone; opaque coherent stone top; no background or cast shadow',rotation:'arbitrary 0–360 degrees; no directional light',nominalLengthFt:c.nominalLengthFt,nominalWidthFt:c.nominalWidthFt,weight:c.weight,referenceAlphaBounds:{left,top,right,bottom},safeBounds:{left:2,top:2,right:meta.width-3,bottom:meta.height-3},sourceSHA256:crypto.createHash('sha256').update(bytes).digest('hex')})
 const w=Math.round(c.nominalLengthFt*150),h=75
 composites.push({input:await sharp(bytes).resize(w,h).png().toBuffer(),left:40+index%2*470,top:140+Math.floor(index/2)*175})
}
const labels=components.map((c,i)=>`<text x="${40+i%2*470}" y="${125+Math.floor(i/2)*175}" fill="#eeeeee" font-size="18">${c.id} — ${c.nominalLengthFt} × ${c.nominalWidthFt} ft</text>`).join('')
const layout=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="1000" height="700" fill="#303330"/><text x="40" y="38" fill="#ffffff" font-size="24">Masonry — technical footprints at 150 pixels/foot</text><text x="40" y="73" fill="#ffd370" font-size="17">DO NOT COPY VISUAL STYLE — DEVELOPMENT REFERENCE ONLY</text>${labels}<text x="40" y="665" fill="#ffffff" font-size="18">One consistent relative scale. No perspective, floor plane, cast shadow or vertical faces.</text></svg>`)
await sharp(layout).composite(composites).png().toFile(path.join(destination,'proof-layout.png'))
const spec=`# Masonry production component artwork specification

This self-contained handoff requires no application, code, manifests or database. Deliver **six PNGs** listed in masonry-components.json. The reference images and proof-layout show only technical footprints and relative scale.

**DO NOT COPY VISUAL STYLE — DEVELOPMENT REFERENCE ONLY.** The simple grey blocks are geometry fixtures, not the quality target. Create premium painted, semi-realistic battlemap stone tops: readable shaped silhouettes, believable surface wear and subtle material variation, crisp clean alpha, refined texture at play zoom. Exact orthographic 90° overhead: no perspective, front/side/vertical faces, bevel extrusion, floor/background, labels or baked directional/cast shadows. Ambient surface texture may suggest form without imposing a light direction.

## Required files and physical footprints

Two variants each: block-large (1.5 × 0.5 ft, 384 × 128 px), block-medium (1 × 0.5 ft, 256 × 128 px), block-small (0.5 × 0.5 ft, 128 × 128 px). All share 256 source pixels/foot. The whole transparent PNG canvas represents the listed physical footprint. Keep exactly the filenames and canvas sizes in the JSON; do not trim, resize or add padding. Do not bake several blocks or mortar courses into one image. Each PNG is one solid stone viewed from above.

Long direction is horizontal, left to right (+X). Center the mass. Make variants meaningfully different while preserving footprint. Stone body should fill approximately 94–98% of the canvas length and width, with a small transparent perimeter and organic chips. Keep every nontransparent pixel within the JSON safeBounds. Avoid holes, long wispy projections and very deep notches; adjoining stones must make a coherent wall. Alpha bounds of development references are informational; copying their exact alpha pixel pattern is **not** required. Consistent footprint coverage **is** required. PNG RGBA, sRGB, straight alpha; no white/black matte fringes, fully transparent RGB preferably zero. Opaque material interior; antialiasing only at silhouette.

## How artwork is used

Stones rotate through any angle along a wall; lighting must be rotationally neutral. Physical wall width chooses one or multiple staggered courses, each normally 0.5 ft deep. Mild width/rotation/offset variation makes Rough less aligned than Dressed. Artwork forms the outer silhouette, rather than being masked inside a rectangular wall strip. Small square stones also repack sharp corners, free ends and opening jambs. No dedicated end/corner/jamb role is required by the validated development benchmark.

Default component weight is 1 for every variant. Length/width metadata and this weight are the only per-component placement inputs. Safe bounds, pixel sizes and alpha requirements are authoring requirements, not alternative scaling metadata. The implementation adds small overlap (normally 2% along length and 8% course depth), so do not add extra art overscan. A short terminal remainder can crop a small stone along its horizontal axis; texture must remain coherent without a unique motif at the center. There is no horizontal mirroring requirement; all six must support arbitrary rotation.

## Material family and first commission

Start with **Pale / Palace Stone** for Koningsboom: pale warm limestone, dressed long blocks, restrained wear, polished professional painted detail. One component set can cover Pale and Palace using different regularity/variation defaults; separate sets only if their visual stone finish is intentionally different. Later Marble uses restrained neutral veining and modest wear; Rough uses irregular stone tops and stronger chips, but **the same six-file footprints and role contract**. Do not enlarge the vocabulary for artistic convenience or add corner sprites.

Rough default: regularity 25%, variation 70%. Dressed default: regularity 90%, variation 20%. Width presets: 0.5, 1, 2, 3 ft. These controls govern placement, not blur. Future material defaults remain data-driven and may vary without new geometry code.

## Delivery and acceptance

Return the six replacement PNGs and a short license/provenance note permitting application distribution. Include a contact sheet on a neutral/checkerboard backdrop as a separate preview, never inside the actual assets. Keep listed IDs/filenames/canvas dimensions; no application-specific file is required from you. Technical references are not replacement artwork. Application integration publishes a **new immutable production revision**; DEV resources are retained and existing user maps are not silently changed.

Review all stones together at consistent physical scale and 100% pixels, then with repeated rotated stones on curves, free ends, a corner and a doorway. Alpha should be clean on light and dark backdrops. No visible image rectangles, decorative plates, embossed borders, strong one-direction highlights, perspective or floor textures. Production-quality artistic fidelity still needs an actual production-art integration review; this handoff certifies geometry/footprints only.
`
const readme=`# WORK handoff — six masonry stone PNGs

Read masonry-component-spec.md and masonry-components.json. Use proof-layout.png and reference-components only as footprint references: **DO NOT COPY VISUAL STYLE — DEVELOPMENT REFERENCE ONLY**.

Deliver the six exact filenames/sizes from the JSON as individual transparent RGBA PNGs. First recommended set: Pale / Palace Stone. No Mapweaver access or code knowledge is needed. No renderer/database/manifest files must be authored. Source artwork stays yours under the supplied distribution license; include provenance and license.
`
for(const[name,value]of[['masonry-component-spec.md',spec],['README-WORK.md',readme],['masonry-components.json',JSON.stringify({version:1,status:'DEVELOPMENT FOOTPRINT CONTRACT; production artwork required',components},null,2)+'\n']]){const bytes=Buffer.from(value);await fs.writeFile(path.join(destination,name),bytes);entries[name]=bytes}
entries['proof-layout.png']=await fs.readFile(path.join(destination,'proof-layout.png'))
await fs.writeFile(destination+'.zip',zipSync(entries,{level:6}))
console.log(destination+'.zip')
