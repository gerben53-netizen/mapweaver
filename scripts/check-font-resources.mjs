import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
export function checkFontResources(root='dist') {
 const manifest=JSON.parse(readFileSync('public/fonts/manifest.json','utf8'))
 for(const f of manifest){
  const dir=path.join(root,'fonts',f.id)
  if(!readFileSync(path.join(dir,'OFL.txt'),'utf8').includes('SIL OPEN FONT LICENSE Version 1.1'))throw Error(`Missing font license: ${f.name}`)
  for(const file of f.files)if(createHash('sha256').update(readFileSync(path.join(dir,file.file))).digest('hex')!==file.sha256)throw Error(`Font changed or missing: ${file.file}`)
 }
 if(!existsSync(path.join(root,'fonts','THIRD_PARTY_FONTS.md'))||!existsSync(path.join(root,'fonts','LICENSE_LIBERATION')))throw Error('Font notices missing')
 return manifest.length
}
if(process.argv[1]?.endsWith('check-font-resources.mjs'))console.log(`Verified ${checkFontResources(process.argv[2])} font families and original licenses.`)
