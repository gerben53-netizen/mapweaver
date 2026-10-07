import {expect,it} from 'vitest'
import {buildPlacements} from '../../scripts/wall-contrast/fixtures'
import {generatedPlacements} from '../domain/generatedWallGeometry'
it('freezes all ten native audit wall cases for five sets without seed-only approximation',()=>{
 const first=buildPlacements();expect(first).toEqual(buildPlacements());expect(first).toHaveLength(5)
 for(const material of first){expect(material.walls).toHaveLength(10);expect(new Set(material.walls.map(w=>w.shape)).size).toBe(5);expect(new Set(material.walls.map(w=>w.widthFt))).toEqual(new Set([1,2]));for(const f of material.walls){expect(f.ratio).toBe(2);expect(f.wall.closed).toBe(false);expect(f.wall.wall?.pixelsPerUnit).toBe(10);expect(f.placements.map(p=>p.order)).toEqual(f.placements.map((_,i)=>i));const again=generatedPlacements(JSON.parse(JSON.stringify(f.wall)),JSON.parse(JSON.stringify(f.openings)));expect(f.placements.map(p=>[p.componentId,p.x,p.y,p.width,p.height,p.angle,p.sourceFraction])).toEqual(again.map(p=>[p.component.id,p.x,p.y,p.width,p.height,p.angle,p.sourceFraction]));expect(f.placements.every(p=>Number.isFinite(p.angle)&&p.width>0&&p.height>0)).toBe(true);if(f.shape==='long-opening-endpoints'){expect(f.openings).toHaveLength(1);expect(f.openings[0].openingWidth).toBe(30)}}}
})
