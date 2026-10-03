import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { zipSync } from 'fflate'
const number=(minimum,maximum,description)=>({type:'number',minimum,maximum,description}),text=(maxLength,description)=>({type:'string',minLength:1,maxLength,pattern:'^[^\\u0000-\\u001f\\u007f]+$',description})
const object=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties})
const art=object({file:{type:'string',pattern:'^assets/[a-zA-Z0-9_-]{1,80}\\.(png|webp)$'},width:{type:'integer',minimum:8,maximum:2048},height:{type:'integer',minimum:8,maximum:2048},anchor:object({x:number(0,2048,'Source pixels from image left; runtime requires <= width.'),y:number(0,2048,'Source pixels from image top; runtime requires <= height.')}),weight:number(.01,100,'Relative deterministic selection weight.'),rotation:number(0,15,'Maximum allowed deviation in degrees, multiplied by roughness; never mirrored.'),scaleVariation:number(0,.15,'Maximum fractional variation, multiplied by roughness.')})
const schema={
  $schema:'http://json-schema.org/draft-07/schema#',$id:'urn:mapweaver:wall-set:1',title:'Mapweaver wall set v1',
  ...object({schemaVersion:{const:1},id:{type:'string',pattern:'^[a-zA-Z0-9_-]{1,80}$'},version:{type:'string',pattern:'^[a-zA-Z0-9_.-]{1,40}$'},title:text(120,'Picker name.'),description:text(500,'Brief material description.'),renderingMode:{enum:['strip','segments']},nominalWidthPx:number(8,1024,'Solid core width in source pixels.'),defaultThickness:number(1,1024,'Suggested map-pixel thickness; no implicit physical units.'),repeatLengthPx:number(8,2048,'Source-space repeat length.'),overlapPx:number(0,1536,'Segments spacing = repeatLengthPx - overlapPx. Runtime requires <= 75% repeat length. Strip uses contiguous slices.'),coreColor:{type:'string',pattern:'^#[a-fA-F0-9]{6}$'},roughnessLimits:object({max:number(0,1,'Zero disables the control.'),default:number(0,1,'Runtime requires <= max.'),maxProtrusionPx:number(0,1024,'Maximum source alpha extent beyond half nominalWidthPx; runtime requires <= nominalWidthPx.')}),bodyVariants:{type:'array',minItems:1,maxItems:16,items:{$ref:'#/definitions/art'}},author:text(120,'Known author or explicitly unknown.'),source:text(120,'Provenance text only; never downloaded.'),license:text(120,'Actual permission/license or explicitly unspecified.')}),definitions:{art}
}
schema.properties.cap={$ref:'#/definitions/art'};schema.properties.join={$ref:'#/definitions/art'}
mkdirSync('docs/wall-sets',{recursive:true});writeFileSync('docs/wall-sets/wall-set-v1.schema.json',JSON.stringify(schema,null,2)+'\n')
// Ajv is already present through the project's ESLint toolchain; no runtime dependency.
const Ajv=createRequire(import.meta.url)('ajv'),validate=new Ajv({allErrors:true}).compile(schema)
for(const id of ['masonry','timber','cave-rock']){const manifest=JSON.parse(readFileSync(`public/wall-sets/${id}/wall-set.json`,'utf8'));if(!validate(manifest))throw Error(JSON.stringify(validate.errors))}
const template=JSON.parse(readFileSync('public/wall-sets/masonry/wall-set.json','utf8'));template.id='my-wall-set';template.title='My wall set';template.description='Replace the sample components with your own top-down transparent artwork.';template.author='Replace with author';template.source='Replace with provenance';template.license='Replace with actual artwork permission';delete template.join
if(!validate(template))throw Error(JSON.stringify(validate.errors))
mkdirSync('docs/wall-sets/template/assets',{recursive:true});writeFileSync('docs/wall-sets/template/wall-set.json',JSON.stringify(template,null,2)+'\n')
const files={'wall-set.json':Buffer.from(JSON.stringify(template,null,2))}
for(const a of [...template.bodyVariants,template.cap]){copyFileSync(`public/wall-sets/masonry/${a.file}`,`docs/wall-sets/template/${a.file}`);files[a.file]=readFileSync(`docs/wall-sets/template/${a.file}`)}
writeFileSync('public/wall-sets/template.zip',zipSync(files,{level:0}));copyFileSync('docs/wall-sets/wall-set-v1.schema.json','public/wall-sets/wall-set-v1.schema.json')
console.log('Draft-07 schema compiled; three example manifests and template validate.')
