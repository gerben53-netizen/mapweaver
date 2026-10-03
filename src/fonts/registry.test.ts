import { expect,it } from 'vitest'
import { FONT_LIBRARY,fontCSS,fontMetrics,variant,defaultFont,validFont,textBaseline } from './registry'
import { DEFAULT_TEXT,createLabel,restyleLabel,textWidth,validateAnnotation } from '../domain/annotations'
import { createMapElement,panelLayout } from '../domain/decorations'
import { defaultMapStyle } from '../domain/mapSettings'
import { readFileSync,existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import manifest from '../../public/fonts/manifest.json'
const map={width:1600,height:1000,...defaultMapStyle(),background:null,mapType:'world-map' as const}
it('registers eight licensed families, unique IDs, real variants and unmodified resources',()=>{
 expect(FONT_LIBRARY).toHaveLength(9);expect(new Set(FONT_LIBRARY.map(f=>f.id)).size).toBe(9)
 const notices=readFileSync('THIRD_PARTY_FONTS.md','utf8')
 for(const f of FONT_LIBRARY){expect(['serif','sans-serif']).toContain(f.fallback);expect(f.category).toBeTruthy();expect(f.variants.Regular).toBeTruthy();for(const v of Object.values(f.variants))expect(existsSync('public'+v.file)).toBe(true)}
 for(const f of manifest){expect(notices).toContain(f.name);expect(readFileSync(`public/fonts/${f.id}/OFL.txt`,'utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1');for(const file of f.files)expect(createHash('sha256').update(readFileSync(`public/fonts/${f.id}/${file.file}`)).digest('hex')).toBe(file.sha256)}
 expect(readFileSync('scripts/package-windows.mjs','utf8')).toContain("checkFontResources('dist')")
})
it.each(['cinzel','cormorantgaramond','ebgaramond','sourcesans3','imfellenglish'])('uses %s metrics across native labels, titles, banners and legends',font=>{
 const style={...DEFAULT_TEXT,font,size:36,strokeWidth:2,italic:true}
 expect(fontCSS(style)).toContain('Mapweaver');expect(fontMetrics(style)['65']).toBeGreaterThan(0);expect(textBaseline(style)).toBeGreaterThan(0)
 const label=restyleLabel(createLabel({x:300,y:300},'The Silver Coast'),style);expect(validateAnnotation({...label,rotation:23,opacity:.7})).toBeTruthy()
 for(const preset of ['simple','ribbon'] as const){const title=createMapElement('title',{x:500,y:500},map,[],preset);if(title.kind!=='title')throw Error();title.style=style;expect(panelLayout(title).width).toBeGreaterThan(0);expect(validateAnnotation(title)).toBeTruthy()}
 const legend=createMapElement('legend',{x:500,y:500},map);if(legend.kind!=='legend')throw Error();legend.font=font;expect(validateAnnotation(legend)).toBeTruthy()
})
it('preserves legacy values, supplies safe fallbacks and avoids synthesized unavailable variants',()=>{
 for(const font of ['liberation-sans','Arial','Missing Local Font','Georgia, serif']){const l=restyleLabel(createLabel({x:300,y:300},'Legacy'),{...DEFAULT_TEXT,font});expect(validateAnnotation(l)).toEqual(l);expect(fontCSS(l.style)).toContain('Mapweaver')}
 expect(validFont('url(https://example.com/font)')).toBe(false);expect(variant({...DEFAULT_TEXT,font:'marcellussc',bold:true,italic:true})).toBe('Regular')
 expect(textWidth('Silver Coast',{...DEFAULT_TEXT,font:'cinzel'})).not.toBe(textWidth('Silver Coast',{...DEFAULT_TEXT,font:'sourcesans3'}))
 expect(defaultFont('battlemap','label')).toBe('sourcesans3');expect(defaultFont('world-map','title')).toBe('cinzel')
})

