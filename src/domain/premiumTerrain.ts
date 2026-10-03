import type { TerrainStyleId } from './terrainStyles'

export const TERRAIN_FAMILIES = ['Grassland', 'Rocky upland', 'Foothills', 'Alpine & snow', 'Forest floor', 'Swamp & marsh', 'Arid & dry', 'Coast & shore', 'Volcanic', 'Neutral blends', 'Underground & cavern'] as const
export interface PremiumTerrain {
  id: string; title: string; family: typeof TERRAIN_FAMILIES[number]; style: TerrainStyleId
  file: string; theme: 'painterlyFantasy'; mapTypes: readonly ['regional-map', 'world-map']
  categoryPath: string[]; collection: string; tags: string[]; notes: string
  preset: string; scale: number; softness: number; strength: number
}
const entries: [string, string, PremiumTerrain['family'], TerrainStyleId, string, number, number, number, string, string?][] = [
  ['grass-lush', 'Lush Atlas Grassland', 'Grassland', 'grassland', 'Plains soft enrichment', .6, .8, .45, 'Organic meadow relief; enrich open plains beneath symbols.'],
  ['grass-dry', 'Dry Grassland Breakup', 'Grassland', 'grassland', 'Dry meadow variation', .65, .8, .4, 'Warm soil glimpses and straw patches for transitional plains.'],
  ['rock-light', 'Light Limestone Scree', 'Rocky upland', 'rocky', 'Rocky slope detailing', .55, .75, .5, 'Broken pale slabs and scree; ground mountain edges.'],
  ['rock-dark', 'Dark Slate Upland', 'Rocky upland', 'rocky', 'Dark upland detailing', .65, .8, .4, 'Cool weathered rock and earthy seams; use lightly under labels.'],
  ['foothill', 'Foothill Scree', 'Foothills', 'rocky', 'Foothill roughening', .7, .85, .5, 'Grassy low relief with mineral tongues beneath mountain bases.'],
  ['alpine', 'Patchy Alpine Snow', 'Alpine & snow', 'snow', 'Alpine snow break-up', .6, .8, .5, 'Interlocking exposed rock and snow tongues at the snowline.'],
  ['forest-temperate', 'Temperate Forest Floor', 'Forest floor', 'forest', 'Forest floor darkening', .65, .85, .4, 'Muted humus and understory; supports forest cores without new trees.'],
  ['forest-moss', 'Mossy Woodland Floor', 'Forest floor', 'forest', 'Mossy woodland edge', .55, .85, .4, 'Soft moss cushions for damp woodland edges.'],
  ['swamp-wet', 'Mottled Wet Marsh', 'Swamp & marsh', 'swamp', 'Marsh wet edge', .6, .85, .45, 'Wet silt islands, pooled hollows and muted reed-like marks.'],
  ['swamp-bog', 'Dark Peat Bog', 'Swamp & marsh', 'swamp', 'Bog depth pass', .6, .85, .35, 'Dark peat and low hummocks; restrained use beneath marsh symbols.'],
  ['arid', 'Dusty Broken Earth', 'Arid & dry', 'desert', 'Dry patch variation', .65, .8, .45, 'Dry clay and muted scrub tone without a photographic crack pattern.'],
  ['shore', 'Coastal Silt and Shallows', 'Coast & shore', 'shallow', 'Coastal shallows transition', .55, .9, .35, 'Silt and shallow water; paint narrow bands without covering coastline ink.'],
  ['volcanic', 'Weathered Volcanic Ash', 'Volcanic', 'volcanic', 'Volcanic ash pass', .6, .8, .4, 'Basalt and ash, without glowing lava or competing landmarks.'],
  ['neutral', 'Soft Atlas Earth', 'Neutral blends', 'land', 'Neutral terrain enrichment', .7, .9, .3, 'Low-contrast material between other families; not the Blend operation.'],
  ['sand-soft', 'Soft Sand Desert', 'Arid & dry', 'desert', 'Soft Sand Desert pass', 0.65, 0.9, 0.4, 'Quiet fine sand for broad desert washes.', 'sand sandy desert arid'],
  ['dunes', 'Wind-Swept Dunes', 'Arid & dry', 'desert', 'Wind-Swept Dunes pass', 0.55, 0.85, 0.4, 'Broken crescent dunes with quiet sandy intervals.', 'dune dunes wind sand desert arid'],
  ['desert-stone', 'Stony Desert', 'Arid & dry', 'desert', 'Stony Desert pass', 0.55, 0.8, 0.45, 'Low desert pavement and gravel for rugged dry transitions.', 'rocky stony desert gravel arid'],
  ['dry-basin', 'Cracked Dry Basin', 'Arid & dry', 'desert', 'Cracked Dry Basin pass', 0.6, 0.85, 0.4, 'Pale clay fissures for dried lakes and arid basins.', 'cracked dry basin clay desert arid'],
  ['cave-damp', 'Damp Cavern Floor', 'Underground & cavern', 'rocky', 'Damp Cavern Floor pass', 0.55, 0.85, 0.4, 'Dark mineral earth for humid caves and dungeon underlayers.', 'cave cavern underground damp wet tunnel'],
  ['cave-moss', 'Mossy Cave Ground', 'Underground & cavern', 'forest', 'Mossy Cave Ground pass', 0.5, 0.9, 0.4, 'Low olive moss on humid limestone soil, without canopy.', 'cave cavern underground damp moss mossy humid'],
  ['cave-wet-stone', 'Wet Stone Floor', 'Underground & cavern', 'rocky', 'Wet Stone Floor pass', 0.5, 0.85, 0.4, 'Cool damp stone with restrained mineral seams and no gloss.', 'cave cavern underground damp wet stone tunnel'],
  ['cave-mud', 'Moist Cavern Earth', 'Underground & cavern', 'swamp', 'Moist Cavern Earth pass', 0.6, 0.9, 0.4, 'Soft damp umber mud for natural subterranean chambers.', 'cave cavern underground damp wet mud muddy earth soil tunnel'],
  ['cave-broken', 'Broken Cave Floor', 'Underground & cavern', 'rocky', 'Broken Cave Floor pass', 0.5, 0.8, 0.45, 'Fractured limestone plates embedded in fine cave dust.', 'cave cavern underground broken uneven rough'],
  ['cave-rubble', 'Rubble-Strewn Cavern', 'Underground & cavern', 'rocky', 'Rubble-Strewn Cavern pass', 0.45, 0.8, 0.45, 'Scattered small angular debris for collapsed passages.', 'cave cavern underground rubble uneven collapsed tunnel'],
  ['cave-jagged', 'Jagged Stone Ground', 'Underground & cavern', 'rocky', 'Jagged Stone Ground pass', 0.45, 0.8, 0.4, 'Fine slate splinters and shallow fractures, without giant rocks.', 'cave cavern underground jagged uneven rocky rough'],
  ['cave-uneven', 'Uneven Rocky Underground', 'Underground & cavern', 'rocky', 'Uneven Rocky Underground pass', 0.55, 0.85, 0.4, 'Weathered mineral humps and dusty hollows for rough ground.', 'cave cavern underground uneven rocky rough tunnel'],
  ['salt-flats', 'Salt-Worn Flats', 'Arid & dry', 'desert', 'Salt-Worn Flats pass', 0.7, 0.9, 0.35, 'Chalky salt crust and faint mineral islands for dry flats.', 'salt flats desert arid basin'],
  ['leaf-litter', 'Leaf-Litter Forest Floor', 'Forest floor', 'forest', 'Leaf-Litter Forest Floor pass', 0.5, 0.9, 0.4, 'Subdued fallen leaves over dark humus beneath woodland.', 'leaf leaves litter forest woodland autumn'],
  ['rooty-floor', 'Rooty Woodland Floor', 'Forest floor', 'forest', 'Rooty Woodland Floor pass', 0.5, 0.85, 0.4, 'Fine weathered root threads in muted woodland earth.', 'root roots rooty forest woodland floor'],
  ['clay-earth', 'Soft Clay Earth', 'Neutral blends', 'land', 'Soft Clay Earth pass', 0.65, 0.9, 0.35, 'Quiet terracotta earth for gentle soil transitions.', 'clay soil earth dirt neutral transition'],
  ['gravel-ground', 'Gravel Path Ground', 'Rocky upland', 'rocky', 'Gravel Path Ground pass', 0.45, 0.85, 0.4, 'Small worn gravel in warm grey dust for paths and margins.', 'gravel path pebble rocky transition'],
  ['cavern-lichen', 'Cavern Lichen Ground', 'Underground & cavern', 'rocky', 'Cavern Lichen Ground pass', 0.5, 0.9, 0.35, 'Pale sage lichen flecks across cool cave stone.', 'cave cavern underground lichen damp rocky tunnel'],
]
/** Immutable v1 resources. Never replace pixels under an existing persisted ID. */
export const PREMIUM_TERRAIN: readonly PremiumTerrain[] = entries.map(([key, title, family, style, preset, scale, softness, strength, notes, aliases]) => ({
  id: `painterly.v1.${key}`, title, family, style, preset, scale, softness, strength, notes,
  file: `/terrain-textures-painterly/materials/${key}.png`, theme: 'painterlyFantasy', mapTypes: ['regional-map', 'world-map'],
  categoryPath: ['Painterly Terrain', family], collection: `Painterly Terrain — ${family}`,
  tags: ['painterly', 'terrain', family.toLowerCase(), key, style, ...(aliases?.split(' ')??[])],
}))
const byId = new Map(PREMIUM_TERRAIN.map(t => [t.id, t]))
export function premiumTerrain(id: unknown) { return typeof id === 'string' ? byId.get(id) : undefined }
export function findPremiumTerrain(search = '', family = '') {
  const q = search.normalize('NFKC').trim().toLocaleLowerCase('en-US')
  return PREMIUM_TERRAIN.filter(t => (!family || t.family === family) && [t.title, t.preset, t.notes, ...t.tags].join(' ').toLocaleLowerCase('en-US').includes(q))
}
export function premiumBrushPreset(id: string) {
  const t = premiumTerrain(id)
  if (!t) throw Error('Unknown premium terrain preset.')
  return { mode: 'paint' as const, style: t.style, textureId: t.id, textureScale: t.scale, softness: t.softness, strength: t.strength }
}
