import { expect, it } from 'vitest'
import candidate from './sungWoodProductionPack.json'
import development from './sungWoodPack.json'
import { generatedDefinition, generatedWallChoices, generatedWallStyle, ROOT_WIDTHS, validateGeneratedDefinition } from './generatedWalls'
import { generatedPlacements } from './generatedWallGeometry'
import { createWall, SIMPLE_WALL } from './walls'
import { createOpening, openingPlacement } from './openings'
import { validatePath } from './paths'
import { defaultMapStyle } from './mapSettings'
const map={...defaultMapStyle(),width:1200,height:900,background:null}
const node=(id:string,x:number,y:number)=>({id,x,y,mode:'corner' as const})
const geometry={straight:[node('a',100,100),node('b',1000,100)],curve:[{...node('a',100,100),out:{x:240,y:120}},{...node('b',1000,100),in:{x:-240,y:120}}],S:[{...node('a',100,100),out:{x:240,y:120}},{...node('b',1000,100),in:{x:-240,y:-120}}],corner:[node('a',100,100),node('b',600,100),node('c',600,500)]}
it('admits byte-preserved supplier components with exact legacy roles and restrained unchanged defaults',()=>{
 const definition=generatedDefinition({id:'sung-wood',revision:'production-1'});expect(validateGeneratedDefinition(candidate)).toEqual(definition);expect(definition.name).toBe('Gezongen hout');expect(definition.generatorType).toBe('living-root');expect(definition.defaults).toEqual({width:1,organic:.08,growth:0,overgrowth:0});expect(definition.components.map(({image,...metadata})=>{expect(image).toContain('sung-wood-production-1');return metadata})).toEqual(development.components.map(({image,...metadata})=>{void image;return metadata}));expect(()=>validateGeneratedDefinition({...candidate,catalogVisibility:'published'})).toThrow('catalog visibility')
})
it('holds unapproved artwork out of normal production choices while resolving saved benchmark revisions',()=>{
 expect(generatedWallChoices().some(d=>d.id==='sung-wood')).toBe(false);expect(generatedWallChoices({id:'sung-wood',revision:'production-1'}).some(d=>d.id==='sung-wood'&&d.revision==='production-1')).toBe(true);expect(generatedWallChoices().find(d=>d.id==='living-root')?.defaults).toEqual({width:1,organic:.55,growth:.45,overgrowth:.15});expect(generatedWallChoices().find(d=>d.id==='refined-timber')?.generatorType).toBe('linear')
})
it.each(Object.entries(geometry))('keeps deterministic %s placement, widths, controls and native opening geometry',(_,nodes)=>{
 for(const width of Object.values(ROOT_WIDTHS)){const style=generatedWallStyle(SIMPLE_WALL,map,'sung-wood','production-1'),wall=createWall(nodes,false,{...style,strokeWidth:width*10}),a=generatedPlacements(wall);expect(a.length).toBeGreaterThan(1);expect(a).toEqual(generatedPlacements(validatePath(JSON.parse(JSON.stringify(wall)))));expect(generatedPlacements({...wall,wall:{...wall.wall!,generated:{...wall.wall!.generated!,seed:99}}})).not.toEqual(a);expect(generatedPlacements({...wall,wall:{...wall.wall!,generated:{...wall.wall!.generated!,organic:.5,growth:.5}}})).not.toEqual(a);const opening=createOpening(wall,.5,'door',20),cut=openingPlacement(opening,wall);expect(generatedPlacements(wall,[opening]).every(p=>p.distance<cut.start||p.distance>cut.end)).toBe(true);expect(wall.wall!.generated).toMatchObject({id:'sung-wood',revision:'production-1',organic:.08,growth:0,overgrowth:0})}
})
