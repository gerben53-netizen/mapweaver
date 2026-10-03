// Explicit visual review of inventory-01 through inventory-15 (2026-10-03).
// Indices refer to the immutable audit snapshot; application binds ID + SHA-256.
export const REVIEWED_INVENTORY_HASH = '3335f55e1f6da4b2a9488f2bae1bd9388c6d41fe6f066ce581bc6b30773089ae'
export const premiumReferences = [241, 244, 247, 248, 256]
const ranges = (n, pairs) => pairs.some(([a, b]) => n >= a && n <= b)
export function visualDecision(a) {
  if (a.issues.includes('missing-or-corrupt-image') || a.issues.includes('empty-alpha')) return { classification: 'REJECT', reason: 'Ontbrekende, onleesbare of volledig lege afbeelding.' }
  if (a.name.startsWith('Painterly ') || [585,588].includes(a.auditIndex)) return { classification: 'FIX', scope: 'atlas', reason: 'Geschilderde atlasillustratie; schuine projectie is functioneel. Geen certificering volgens de battlemapstandaard. Alleen taxonomie aanpassen.' }
  if (a.type === 'background') return { classification: 'FIX', scope: 'background', reason: 'Samengestelde achtergrond, geen afzonderlijke battlemap-stamp. Niet-destructief behouden; alleen taxonomie aanpassen.' }
  if (a.type === 'fill-pattern') {
    if ([581,586,587,589].includes(a.auditIndex)) return { classification: 'REPLACE', reason: 'Legacy materiaalstrook/iconische arcering; geen overtuigend premium vloermateriaal. Referenties behouden.' }
    return { classification: 'FIX', scope: 'texture', reason: 'Materiaaltextuur; dekkende alpha is passend. Alleen taxonomie aanpassen; tegelnaden en fysieke textuurschaal blijven afzonderlijke aandachtspunten.' }
  }
  if ([420,421,422,261,232,233,5].includes(a.auditIndex)) return { classification: 'REPLACE', reason: 'Zichtbare front-/zijvlakken of schuine meubelprojectie; onvoldoende 90° bovenaanzicht voor de canonieke battlemapstandaard.' }
  if (ranges(a.auditIndex, [[11,42],[81,145],[303,336],[340,419],[468,514]])) return { classification: 'REPLACE', reason: 'Vlakke illustratie, zware contouren en/of onvoldoende functionele informatie; sluit niet aan op de geschilderde premium referenties.' }
  if ([436,437,438,439,440,441,442,443,444,445,446,447,448,449,450,451].includes(a.auditIndex)) return { classification: 'REPLACE', reason: 'Slaapfunctie herkenbaar, maar visuele celmarges en opgeslagen aspectratio leveren onvoldoende geloofwaardige bedmaat; context op actuele schaal voldoet niet. Nieuwe productievariant nodig.' }
  if (ranges(a.auditIndex, [[452,467]])) return { classification: 'REPLACE', reason: 'Samengestelde kamerstamp met dominante vlakke bodem en kleine props; afzonderlijke functies verliezen leesbaarheid op de opgeslagen speelmaat.' }
  if ([86,104,122,127,128,138,166,180,200,213].includes(a.auditIndex)) return { classification: 'REPLACE', reason: 'Boekenkast toont vooral een houten bovenvlak; opslagfunctie/boeken onvoldoende leesbaar op speelschaal.' }
  if (!a.active) return { classification: 'REPLACE', reason: 'Reeds verwijderde legacy-variant; niet opnieuw activeren. Onzekere projectie/cohesie; historische verwijzingen blijven beschikbaar.' }
  return { classification: 'FIX', scope: 'battlemap', reason: 'Geschilderde functionele kandidaat met bruikbaar bovenaanzicht; veilige metadata/taxonomiecorrectie. Geen ongecontroleerde kwaliteitspercentages. Randgevallen blijven expliciet in de review.' }
}
