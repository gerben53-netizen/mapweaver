# Asset Library Quality & Taxonomy Audit

Afgerond: 3 oktober 2026. Binding: [Premium Asset Quality Standard](../mapweaver-premium-asset-quality-standard.md). Architectuur: [ADR-0053](../adr/0053-asset-library-quality-audit.md).

## Acceptatie en resultaat

- Inventaris en visuele classificatie vóór toepassing; geen nieuwe afbeeldingen of vervanging in kaarten.
- 589 geregistreerde assets onderzocht; 272 FIX, 317 REPLACE, 0 KEEP/REJECT/DUPLICATE. FIX omvat metadata-aanpassingen; het betekent geen generiek Premium-keurmerk voor andere assettypen.
- Van 577 actieve items naar 272: 242 stamps (198 battlemap-kandidaten en 44 atlasillustraties), 27 fill patterns en 3 achtergronden. De 12 reeds verwijderde items zijn niet opnieuw geactiveerd.
- Taxonomie van 61 naar 38 nodes, met 27 inhoudelijke categorie-/subcategoriepaden. Nederlandse objectcategorieën; oorsprong en gebruik als tags/collecties; aliases voor oude filters en zoektermen.
- Vijf Premium-referenties: Fruitmand, Groentemand, Kneedtafel, Kookplaats en Visplank. Echte rendererproef bij 40 × 30 ft en 10 px/ft, inclusief Living Root production walls, vloer en soft shadow; ook licht/donker, rotatie en spiegeling bekeken.
- Voor alle 198 resterende battlemap-kandidaten is een eigen scèneproef gerenderd. De volledige 589-iteminventaris heeft contact sheets; het vervangingsbacklog bevat 317 items.
- Alle 14 projectrecords, alle project-assetreferenties en alle 589 originele beeldhashes zijn bij toepassing exact behouden. Geen wijzigingen aan bestaande schaalwaarden of artwork.

## Validatie

51 gerichte servicetests voor kwaliteit, bibliotheek, generatorselectie, pack-authoring en illustrated assets; 16 frontendtests voor kwaliteitsmetadata en stampplaatsing; 11 map-effects-tests voor schaduw, serialisatie en undo/redo: allemaal geslaagd. Drie oudere map-effects-testverwachtingen zijn aangepast aan de reeds bestaande Campfire-revisions.

Typecheck, gerichte ESLint en productiebuild slagen. De build verifieert de canonieke, read-only Campfire-bron. De bestaande chunk-/dynamic-importwaarschuwingen blijven bestaan. Geen volledige testsuite.

Gerichte browsercontrole op uitsluitend de geïsoleerde dataset, via 48820/48821: echte referentie-PNG en PNG met een verborgen historische stamp blijven byte-identiek na save/reload; geen page errors. Alle eigen testprocessen zijn gesloten. De bestaande instance op 47836 is alleen gelezen en niet gewijzigd of gestopt.

## Rapport en bestanden

Het complete lokale rapport en machineleesbare inventaris, migratieplan, replacement backlog, contact sheets en 198 scèneproeven staan in `deliverables.local/asset-library-audit/`. Deze lokale gebruikersgegevens worden niet aan Git toegevoegd.

De kwaliteitsstandaard staat in `docs/mapweaver-premium-asset-quality-standard.md`; de runtimegrens in `src/domain/assetQuality.ts`; de metadata-migratie in `service/assetQualityAudit.ts`. Inventaris-, plan- en QA-scripts staan onder `scripts/`.

## Grenzen

De Premium-standaard richt zich op battlemap-stamps. Atlasillustraties, materiaaltexturen, achtergronden en 205 gebundelde tool-/downloadresources zijn afzonderlijk geregistreerd; daarvoor wordt geen battlemap-Premium-certificering geclaimd. De 12 assets van de aangetroffen aparte Campfire-QA-instance zijn alleen geïnventariseerd en niet opgeschoond.

Geen nieuwe Windows-package, artwork, UI-redesign, push, deploy of andere externe actie. SQLite-schema 10 vereist de bijgewerkte applicatie; oudere executables ondersteunen dit schema niet.
