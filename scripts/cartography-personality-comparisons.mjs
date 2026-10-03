import fs from 'node:fs/promises'
import sharp from 'sharp'
const out='deliverables.local/Cartography-Personality'
for(const name of ['active-tool','properties','campaign-explorer','asset-library','marker-wizard','brush-context']){
 const label=Buffer.from(`<svg width="2560" height="36"><rect width="100%" height="100%" fill="#20231f"/><g fill="#f1eee4" font-family="sans-serif" font-size="18"><text x="16" y="25">Before · ${name}</text><text x="1296" y="25">After · cartography personality</text></g></svg>`)
 await sharp({create:{width:2560,height:756,channels:4,background:'#20231f'}}).composite([{input:label,left:0,top:0},{input:out+'/before/'+name+'-1280.png',left:0,top:36},{input:out+'/after/'+name+'-1280.png',left:1280,top:36}]).png().toFile(out+'/'+name+'-comparison.png')
}
await fs.writeFile(out+'/README.md','# Cartography personality comparisons\n\nBefore/after directories contain matching 1280×720 and 1600×1000 screenshots of all six required views. Each has its browser/contrast results.json. Top-level comparison PNGs pair the full-size 1280 views without changing their pixels. The map file and library artwork are identical in both runs. Failed early harness captures are not evidence; final results.json records successful runs.\n')
