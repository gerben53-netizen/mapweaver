import { expect,it } from 'vitest'
import { newMapSnapshot } from './newMap'
import { defaultMapTheme,themesForMap } from '../domain/worldThemes'
import { parseProject } from './format'
import { encodeProject,decodeProject } from './archive'
it('limits themes to supported types and defines explicit new-map defaults',()=>{
 expect(defaultMapTheme('world-map')).toBe('world.painterlyFantasy')
 expect(defaultMapTheme('regional-map')).toBe('world.painterlyFantasy')
 expect(defaultMapTheme('battlemap')).toBe('');expect(themesForMap('battlemap')).toEqual([])
 expect(()=>newMapSnapshot(800,500,'#ffffff','battlemap',undefined,'world.darkFantasy')).toThrow()
})
it.each(themesForMap('world-map'))('creates and roundtrips an empty $name map already themed',async t=>{
 const snapshot=newMapSnapshot(800,500,'#ffffff','world-map',3000,t.id)
 expect(snapshot.objects).toEqual([]);expect(snapshot.map.theme?.id).toBe(t.id);expect(snapshot.map.water?.style).toBe(t.water);expect(snapshot.map.grid.visible).toBe(false)
 const document=parseProject({formatVersion:12,id:'new-map',name:'Test',createdAt:'2026-09-26T00:00:00.000Z',modifiedAt:'2026-09-26T00:00:00.000Z',...snapshot,assets:[]})
 const decoded=await decodeProject(await encodeProject({document,assets:new Map()}));expect(decoded.document.map).toEqual(document.map)
})
