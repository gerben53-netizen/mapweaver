import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {ENVIRONMENTAL_PRODUCTION,PRODUCTION_DETAIL_PRESETS} from '../src/domain/environmentalProduction'
it('ships all 44 admitted PNGs via canonical default content without Stamp packs or categories',()=>{
 const defaults=JSON.parse(readFileSync('docs/distribution/default-content.json','utf8'))
 expect(defaults.publicDirectories).toContain('environmental-detail')
 expect(defaults.libraryPacks.some((p:{file:string})=>p.file.includes('environmental'))).toBe(false)
 expect(PRODUCTION_DETAIL_PRESETS).toHaveLength(11)
 for(const c of ENVIRONMENTAL_PRODUCTION.components){const bytes=readFileSync(`public/environmental-detail/production-1/${c.filename}`);expect(bytes.length).toBe(c.byteLength);expect(createHash('sha256').update(bytes).digest('hex')).toBe(c.sha256);expect(bytes.readUInt32BE(16)).toBe(c.pixelWidth);expect(bytes.readUInt32BE(20)).toBe(c.pixelHeight)}
})
