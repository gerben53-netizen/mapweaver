import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { visualDecision, premiumReferences, REVIEWED_INVENTORY_HASH } from './asset-quality-decisions.mjs'
const output = process.argv[2] || 'deliverables.local/asset-library-audit'
const inventory = JSON.parse(readFileSync(path.join(output, 'inventory.json')))
if(createHash('sha256').update(JSON.stringify(inventory.assets.map(a=>[a.id,a.sha256,a.name,a.originalName]))).digest('hex')!==REVIEWED_INVENTORY_HASH)throw Error('This is not the visually reviewed inventory. New assets require a new review, not automatic classification.')
const aliases = { palace:'paleis', library:'bibliotheek', study:'studie', bedrooms:'slaapvertrekken', bedroom:'slaapvertrekken', reception:'ontvangst', 'royal private':'koninklijk privé', 'throne room':'troonzaal', 'general furniture':'meubilair', roots:'wortels', clues:'aanwijzingen', 'hidden chambers':'verborgen kamers', transitions:'overgangen', textures:'texturen', furniture:'meubilair', wood:'hout', livingwood:'levend hout', 'living wood':'levend hout', plants:'planten', plant:'planten', kitchen:'keuken', storage:'opslag', bookshelf:'boekenkast', bookshelves:'boekenkast', bookcase:'boekenkast', topdown:'bovenaanzicht', 'top-down':'bovenaanzicht', forest:'bos', mountain:'bergen', mountains:'bergen', swamp:'moeras', snow:'sneeuw', alpine:'alpien', conifer:'naaldbos', broadleaf:'loofbos', landmark:'landmark', landmarks:'landmark', valmyria:'Valmyria', eryndor:'Eryndor', koningsboom:'Koningsboom', sylvenglen:'Sylvenglen', líorna:'Líorna', eldric:'Eldric', maelyra:'Maelyra', theron:'Theron' }
Object.assign(aliases, {
  administration:'hofbestuur',alcove:'nis',audience:'audiëntie',bed:'bed',bedframe:'bedframe','bedside-table':'nachtkastje',bench:'bank',book:'boek','book-bin':'boekenkist','book-cluster':'boekenstapel','book-rack':'boekenrek','book-stack':'boekenstapel',border:'rand',botanical:'botanisch','botanical-book':'botanisch boek','botanical-research':'botanisch onderzoek','botanical-specimens':'botanische monsters',bowl:'schaal',branches:'takken','broadleaf forest':'loofbos',ceremonial:'ceremonieel',chair:'stoel',chest:'kist',clue:'aanwijzing',composition:'compositie','conifer forest':'naaldbos','conversation-composition':'gespreksgroep','corner-bookcase':'hoekboekenkast','corner-desk':'hoekbureau',corridor:'gang',cot:'brits',court:'hof','curved-book-rack':'gebogen boekenrek','curved-bookcase':'gebogen boekenkast',dais:'podium',damaged:'beschadigd','damaged-book':'beschadigd boek',daybed:'dagbed',decoration:'decoratie',desk:'bureau',diplomacy:'diplomatie','document-cabinet':'documentenkast',documents:'documenten',door:'deur','double-bed':'tweepersoonsbed','fallen-book':'gevallen boek',fixture:'vaste inrichting',floor:'vloer','floor-ornament':'vloerornament',general:'algemeen',gift:'geschenk',grooming:'verzorging','guard-marker':'wachtmarkering',heartwood:'kernhout','hills & rocks':'heuvels & rotsen',inkwell:'inktpot',investigation:'onderzoek',keepsake:'herinneringsobject',lectern:'lessenaar',liorna:'Líorna','locked-chest':'afgesloten kist',magnifier:'vergrootglas',manuscript:'manuscript','manuscript-press':'manuscriptpers','manuscript-stack':'manuscriptstapel',manuscripts:'manuscripten',map:'kaart','map-compass':'kaartkompas','map-table':'kaarttafel',maps:'kaarten','measuring-tools':'meetgereedschap',mechanism:'mechanisme',minerals:'mineralen',mirror:'spiegel',mushrooms:'paddenstoelen','natural-specimens':'natuurmonsters',northern:'noordelijk','northwest-light':'licht uit noordwesten',notes:'notities',obstruction:'obstakel','office-prop':'kantoorvoorwerp',ornament:'ornament',overlay:'overlay',painterly:'geschilderd',planter:'plantenbak',platform:'platform','pressed-fern':'geperste varen',private:'privé','protective-case':'beschermkist','reading-lectern':'leeslessenaar','rolled-maps':'opgerolde kaarten',root:'wortel','root-specimen':'wortelmonster',royal:'koninklijk','scattered-documents':'verspreide documenten',scholar:'geleerde','scholar-desk':'geleerdenbureau',scroll:'rol','scroll-bundle':'rollenbundel','scroll-chest':'rollenkist','scroll-rack':'rollenrek',scrolls:'rollen','sealed-documents':'verzegelde documenten',seating:'zitmeubilair','secret passage':'geheime gang','secure-box':'beveiligde doos','secure-coffer':'beveiligde kist',serving:'serveren','serving-tray':'dienblad','sliding-lid-box':'schuifdekseldoos','snow & alpine':'sneeuw & alpien','specimen-box':'monsterkist',standard:'standaard','star-chart':'sterrenkaart',stool:'kruk',table:'tafel',temperate:'gematigd',texture:'textuur',throne:'troon',tome:'boekwerk','torn-pages':'gescheurde bladen',transition:'overgang',unlit:'onverlicht','unlit-candle':'onverlichte kaars','unlit-candles':'onverlichte kaarsen','unmade-bed':'beslapen bed',utility:'praktisch',vegetation:'vegetatie',volcanic:'vulkanisch',wall:'muur',wardrobe:'garderobe',washbasin:'waskom',washstand:'wasmeubel',worktable:'werktafel','writing-desk':'schrijfbureau',pqa:'PQA'
})
const key = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('nl-NL')
const tag = value => aliases[key(value)] || key(value)
function taxonomy(a) {
  const n = key(a.name)
  // Individually reviewed exceptions: object kind, never origin-room taxonomy.
  const explicit = [
    [[38,41,281,287,292,296,462,470,479],['Architectonische objecten','Bouwonderdelen'],'large_fixture'],
    [[48,51,52,53,54,55,57],['Architectonische objecten','Vloerovergangen'],'floor_decal'],
    [[88,323,331],['Decoratie','Ornamenten'],'decoration'],
    [[119,125,133,193],['Werk & ambacht','Boeken & documenten'],'tabletop_prop'],
    [[172],['Werk & ambacht','Gereedschap & studie'],'tabletop_prop'],
    [[239,517,546],['Natuur & vegetatie','Hout & brandstof'],'large_fixture'],
    [[357,494],['Opslag','Kasten & kisten'],'storage'],
    [[407,410],['Keuken & voedsel','Vaten & vaatwerk'],'tabletop_prop'],
    [[518,519],['Textiel','Stoffen & touw'],'floor_decal'],
    [[530],['Decoratie','Vloersporen'],'floor_decal'],
  ].find(([ids])=>ids.includes(a.auditIndex))
  if(explicit)return {path:explicit[1],semanticClass:explicit[2],softShadowDefault:explicit[2]!=='floor_decal'}
  if (a.type === 'background') return { path:['Diversen','Kaartachtergronden'], semanticClass:null, softShadowDefault:false }
  if (a.type === 'fill-pattern') return { path:['Architectonische objecten','Vloermaterialen'], semanticClass:'floor_decal', softShadowDefault:false }
  if (a.name.startsWith('Painterly ') || [585,588].includes(a.auditIndex)) {
    const family = /mountain|peak|ridge|connector|foothill|cliff|hill|rock/.test(n) ? 'Bergen & rotsen' : /forest|broadleaf|conifer|grove|tree/.test(n) ? 'Bossen' : /swamp|marsh/.test(n) ? 'Moerassen' : /volcan/.test(n) ? 'Vulkanen' : 'Atlaslandmarks'
    return { path:['Natuur & vegetatie',family], semanticClass:null, softShadowDefault:false }
  }
  const rules = [
    [/boekenkast|boekenwand|boekenrek|rollenrek|rollenopslag/,['Opslag','Boekenkasten'],'storage'],
    [/kist|kast|garderobe|berging|documenthouder|documentendoos|rollenkist|rollenhouder|mand met deksel/,['Opslag','Kasten & kisten'],'storage'],
    [/bed|bedrol|brits|slaap/,['Meubilair','Bedden'],'furniture'],
    [/stoel|bank|sofa|fauteuil|kruk|zitting/,['Meubilair','Zitmeubilair'],'furniture'],
    [/tapijt|vloerkleed|loper/,['Textiel','Tapijten'],'floor_decal'],
    [/kook|oven|haard|spoelbak/,['Keuken & voedsel','Keukenvoorzieningen'],'large_fixture'],
    [/fruit|groent|graan|meel|kaas|vlees|visplank|specerij|brood|soep|kruidenrek|kneed|voorbereiding/,['Keuken & voedsel','Voedsel & bereiding'],'tabletop_prop'],
    [/vat|ketel|pot|servies|schaal|dienblad|drink|thee|wasmeubel|waskom/,['Keuken & voedsel','Vaten & vaatwerk'],'tabletop_prop'],
    [/bureau|tafel|balie|lessenaar|werkbank/,['Meubilair','Tafels & bureaus'],'furniture'],
    [/kaars|kandelaar|lantaarn|lamp/,['Verlichting','Lampen & kandelaars'],'decoration'],
    [/plant|varen|bloem|kruid|botanische tak|decoratieve tak/,['Natuur & vegetatie','Planten'],'vegetation'],
    [/wortel|boomschors|houtsplit|houtstuk|stalagmiet|rots/,['Natuur & vegetatie','Wortels & rotsen'],'large_fixture'],
    [/muur|wand|deur|poort|luik|trap|drempel|gang|nis|kamer|pilaar|brug|kruising|bocht|afscheiding|balustrade/,['Architectonische objecten','Bouwonderdelen'],'large_fixture'],
    [/stof|bloed|modder|voetspoor|kerf|kras|markering/,['Decoratie','Vloersporen'],'floor_decal'],
    [/boek|folio|manuscript|perkament|document|brief|correspondentie|papier|rol|kaart/,['Werk & ambacht','Boeken & documenten'],'tabletop_prop'],
    [/gereedschap|meetlat|passer|zegel|schrij|inkt|vergroot|mineralen|specimen/,['Werk & ambacht','Gereedschap & studie'],'tabletop_prop'],
    [/podium|troon|embleem|wapenteken|ornament|medaillon|bladdecoratie|spiegel|geschenk/,['Decoratie','Ornamenten'],'decoration'],
  ]
  const rule = rules.find(([regex]) => regex.test(n))
  return rule ? { path:rule[1],semanticClass:rule[2],softShadowDefault:rule[2]!=='floor_decal' } : { path:a.categoryPath.length?a.categoryPath:['Diversen'],semanticClass:null,softShadowDefault:null,manualReview:true }
}
const entries = inventory.assets.map(a => {
  const decision = visualDecision(a), proposed = taxonomy(a)
  const contextTags = a.categoryPath.filter(c => /eryndor|valmyria|paleis|palace|bibliotheek|study|studie|slaap|bedroom|koningsboom|sylvenglen|theron|eldric|maelyra|líorna|reception|troon|throne|kitchen|keuken|geheim|cult|grot/i.test(c))
  const tags = [...new Set([...a.tags,...contextTags].map(tag))].slice(0,30)
  return { id:a.id,sha256:a.sha256,auditIndex:a.auditIndex,name:a.name,originalName:a.originalName,classification:decision.classification,reason:decision.reason,scope:decision.scope||'battlemap',premiumReference:premiumReferences.includes(a.auditIndex),previouslyActive:a.active,active:a.active&&['KEEP','FIX'].includes(decision.classification),categoryBefore:a.categoryPath,categoryAfter:proposed.path,tagsBefore:a.tags,tagsAfter:tags,semanticClass:proposed.semanticClass,softShadowDefault:proposed.softShadowDefault,defaultSize:{mode:a.sizingMode,width:a.defaultWidth,height:a.defaultHeight,unit:a.sizingUnit,lockAspectRatio:!!a.aspectRatioLocked},references:a.references,technicalIssues:a.issues,manualReview:!!proposed.manualReview,sourceCollections:a.collections.map(c=>c.name),replacementPack:decision.classification==='REPLACE'?`PQA — ${proposed.path.join(' / ')}`:null }
})
const oldAncestors = id => {const result=[];while(id){result.push(id);id=inventory.categories.find(c=>c.id===id)?.parentId}return result}
const migration = { schemaVersion:1, generatedAt:new Date().toISOString(), sourceRoot:inventory.sourceRoot, sourceSnapshot:inventory.sourceSnapshot, sourceDatabaseHash:null, standard:'docs/mapweaver-premium-asset-quality-standard.md', entries, tagAliases:aliases, categoryMappings:inventory.categories.map(c=>{const affected=entries.filter(e=>oldAncestors(inventory.assets.find(a=>a.id===e.id).categoryId).includes(c.id));return {id:c.id,name:c.name,targets:[...new Set(affected.map(e=>e.categoryAfter.join(' / ')))],assetIds:affected.map(e=>e.id)}}), canonicalTaxonomy:[...new Set(entries.map(e=>e.categoryAfter.join(' / ')))].sort(), counts:Object.fromEntries(['KEEP','FIX','REPLACE','REJECT','DUPLICATE'].map(c=>[c,entries.filter(e=>e.classification===c).length])), compatibility:'IDs, immutable original/preview bytes, default sizes, project documents and references are unchanged. Inactive is separate from deletedAt. Existing deleted assets never become active.' }
writeFileSync(path.join(output,'migration-plan.json'),JSON.stringify(migration,null,2)+'\n')
writeFileSync(path.join(output,'replacement-backlog.json'),JSON.stringify(entries.filter(e=>e.classification==='REPLACE'),null,2)+'\n')
// Review sheets at original display size plus actual 10 px/ft battlemap footprint.
for (const [group, selected] of Object.entries({ 'premium-reference':entries.filter(e=>e.premiumReference), 'replace':entries.filter(e=>e.classification==='REPLACE'), 'fix':entries.filter(e=>e.classification==='FIX'), 'reject':entries.filter(e=>e.classification==='REJECT'), 'duplicates':entries.filter(e=>e.classification==='DUPLICATE') })) {
  mkdirSync(path.join(output,'contact-sheets',group),{recursive:true})
  for(let start=0;start<selected.length;start+=40){const slice=selected.slice(start,start+40),height=Math.ceil(slice.length/5)*160,parts=[]
    for(const [i,e] of slice.entries()){const a=inventory.assets.find(a=>a.id===e.id),x=i%5*200,y=Math.floor(i/5)*160;const bytes=readFileSync(path.join(inventory.sourceRoot,a.originalPath)),thumb=await sharp(bytes).resize(170,115,{fit:'inside'}).png().toBuffer();parts.push({input:thumb,left:x+8,top:y+4}); const safe=e.name.replaceAll('&','&amp;').replaceAll('<','&lt;').slice(0,27);parts.push({input:Buffer.from(`<svg width="200" height="160"><text x="6" y="137" fill="white" font-size="11">${e.auditIndex}: ${safe}</text><text x="6" y="154" fill="white" font-size="10">${e.classification} · ${e.defaultSize.width||'?'} ${e.defaultSize.unit||'native'}</text></svg>`),left:x,top:y})}
    await sharp({create:{width:1000,height,channels:4,background:'#353a3d'}}).composite(parts).png().toFile(path.join(output,'contact-sheets',group,`${start/40+1}.png`))
  }
}
console.log(JSON.stringify({counts:migration.counts,activeAfter:entries.filter(e=>e.active).length,manualReview:entries.filter(e=>e.manualReview).length}))
