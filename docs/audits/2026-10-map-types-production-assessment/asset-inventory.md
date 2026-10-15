# Actuele assetinventaris

Bron: read-only Primary-snapshot, daarna uitsluitend QA-readqueries. Alle **727** geregistreerde originals fysiek gevonden, **727 unieke bestanden** en **727 SHA-256 matches**. Database: 683 stamprecords, 40 fill-patternrecords, 4 backgrounds. 13 soft-deleted records blijven bewaard. Deze fysieke aantallen zijn nadrukkelijk niet het aantal pickeritems.

| PQA-metadata | Alle records | Niet soft-deleted |
|---|---:|---:|
| KEEP |104|104|
| FIX |260|260|
| REPLACE |329|317|
| Niet beoordeeld |34|33|

Actieve API-resultaten (volledig gepagineerd; lifecycle en family-collapse toegepast):

| Filter | Stamps | Families daarin | Fill patterns |
|---|---:|---:|---:|
| Alle |307|27|24|
| Battlemap |230|27|24|
| Regional |77|0|13|
| World |77|0|13|

Battlemap-items: 32 KEEP en 198 FIX. Atlasitems: 44 FIX en 33 niet beoordeeld. **FIX is beschikbaar voor plaatsing, geen production-quality-goedkeuring.** Maptypefilter en category/search zijn afzonderlijke dimensies. Geen City-filter of City-assetscope bestaat. Atlasmarkers met een hele stad zijn niet afzonderlijke City-gebouwen.

27 familyrecords verwijzen naar **90 unieke concrete variantassets**, alle aanwezig. Daarvan zijn 63 aparte familyMember-rijen; de overige covers zijn ook familyrecords. Geen ontbrekende variant-ID's. Geen actieve runtimeprefabs. 45 actieve generator-assets: 41 zonder expliciete hierarchy-tier, 2 support, 2 detail. Ontbrekende tier gebruikt bestaande fallback-semantiek, maar complete Hero/Primary/Support/Detail-dekking is hiermee niet bewezen.

## Gebundelde content, afzonderlijk van database-items

Huidige authoringkeuzes Generated Wall: 7 families, **67 component-PNG's**, allemaal decodeerbaar: Living Root 28 production-1; Pale Palace Stone 6 production-2; Marble 6, Rough Stone 6, Natural Cave Rock 9, Refined Timber 6, Rustic Heavy Timber 6 (alle production-1). Immutable historische revisions en uitgesloten Sung Wood zijn geen extra geaccepteerde keuzes. Alleen paleissteen wordt in dit voorbeeld daadwerkelijk gerenderd; overige families alleen register/file-verificatie, geen nieuwe volledige visuele acceptatie.

32 terrain-textures uit terrain-library.json; 11 Environmental Detail-presets met 44 production-1 componenten volgens de aanwezige provenance (PASS WITH NOTE). Deze worden aanvullend op bestanden gecontroleerd; zij zijn geen stamp-pickerrecords en geen in deze vier kaarten uitgevoerde volledige paintacceptatie.

Default-content.json noemt packs: World hierarchy 46, Illustrated settlements 31, Premium interieurmaterialen 9, PQA Wave 2 69 concrete bestanden. Dit zijn **packaantallen**, geen optelbare runtime-pickeritems. PQA Wave 2 met bestaande validator opnieuw gecontroleerd: geldig, 69 assets, informatieve tag-normalisatie. In de runtime zijn de families/varianten aanwezig en gebruikt. Dit bewijst import/gebruik van het gekozen subset; geen herimport/revisionconflict-acceptatie van alle packs.

Bestaande auditdocs zijn historisch: de eerdere 589-record audit is niet de actuele inventaris. Bronbewijzen: asset-inventory.json; public/pqa-premium-stamps/provenance.json; docs/distribution/default-content.json; src/domain/generatedWalls.ts; docs/wall-sets/*provenance.json; public/terrain-textures-painterly/terrain-library.json en public/environmental-detail/production-1/provenance.json. Bestaande manifeststatus is niet gelijkgesteld aan nieuwe visuele kwaliteitsbeoordeling.

Aanvullende fysieke controle: alle 32 terrain-texturen decodeerbaar; alle 44 Environmental Detail-componenten decodeerbaar én hun SHA-256 gelijk aan provenance. Zie bundled-resource-validation.json.

De volledige Primary-snapshot bevat tevens43 categorieën,12 campagnes,33 collectiondefs en614 membershiprelaties. Voor/na zijn alle volledige rowhashes identiek (primary-safety.json).
