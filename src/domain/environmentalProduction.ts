import manifest from '../content/environmental-components.json'

export const ENVIRONMENTAL_PRODUCTION = manifest
export const PRODUCTION_DETAIL_PRESETS = Array.from(new Set(manifest.components.map(c=>c.familyId))).map(id=>{
  const components=manifest.components.filter(c=>c.familyId===id),first=components[0]
  const names:Record<string,string>={dirt:'Dirt',damp:'Damp',wear:'Wear',moss:'Moss Wash',cracks:'Cracks',rubble:'Rubble',gravel:'Gravel',leaves:'Leaves / Organic Litter',roots:'Small Roots','moss-clumps':'Moss Clumps','wall-edge-debris':'Wall-edge Debris'}
  return {id,name:names[first.role],mode:first.mode as 'surface'|'decals',blend:first.blend,tier:first.renderTier,variants:components.length,components,opacity:first.mode==='surface'?.25:.8}
})
export function productionDetailPreset(id:string){return PRODUCTION_DETAIL_PRESETS.find(p=>p.id===id)}
/** Admission of the bundled immutable artwork, never a normal Stamp import. */
export function validateEnvironmentalProduction(value:unknown){
  if(JSON.stringify(value)!==JSON.stringify(manifest))throw Error('Unsupported environmental artwork metadata or revision.')
  if(manifest.components.length!==44||PRODUCTION_DETAIL_PRESETS.length!==11||new Set(manifest.components.map(c=>c.id)).size!==44)throw Error('Invalid environmental production inventory.')
  for(const p of PRODUCTION_DETAIL_PRESETS){if(p.variants!==4)throw Error('Invalid environmental family.');for(const c of p.components)if(c.anchor.x!==.5||c.anchor.y!==.5||c.weight!==1||c.revision!==1||c.contentType!=='environmental-detail'||c.rotationDegrees.min!==-180||c.rotationDegrees.max!==180||c.scaleRange.min!==.5||c.scaleRange.max!==2)throw Error('Invalid environmental production geometry.')}
  return manifest
}
validateEnvironmentalProduction(manifest)
