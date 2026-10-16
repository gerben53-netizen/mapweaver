# Northreach — Premium Coastline Proof

[Native PNG](northreach-native-export.png) · [Bewerkbare kaart](northreach-premium.mapweaver) · [Vier versies naast elkaar](comparison/reference-v1-v2-premium.png) · [Interactief rapport](index.html) · [Kwaliteitsbeoordeling](quality-assessment.md).

**Technisch geslaagd; visuele premiumlat niet gehaald.** Northreach is duidelijk herkenbaarder dan in V1/V2, vooral door de noordelijke vertakkingen en de Westmere/Golden Marches-baai. De resterende lange facetten en vereenvoudigde microkust maken dit nog geen professioneel geaccepteerde referentiereproductie. Meer punten of een werkende export gelden niet als artistieke acceptatie.

## Resultaat

Zoals door de gebruiker bevestigd: de noordwestelijke landmassa met Northreach, Westmere en Golden Marches, zonder Eldergrove. Vaste referentiecrop x=90, y=20, 650×570, noorden boven. Nieuw canvas 1625×1425, factor 2,5. Alleen land en zee; nul assets, stamps, labels, decoratie of achtergrondbitmap. Geen Coastline Roughness/halo of verbergende stroke.

36 native Landmass-Areas, 622 punten totaal, hoofdcontour 267 punten, nul gaten en nul pairwise landoverlaps. Mapidentiteit: `northreach-premium-proof-2026-10`. Het zelfstandige archive bevat uitsluitend `project.json`.

Drie **echte ongewijzigde Mapweaver-exports**:

- [Macro](stages/macro-native-export.png): 8 Areas / 325 punten; hoofdgeografie vóór detaillering.
- [Meso](stages/meso-native-export.png): 8 Areas / 374 punten; gerichte Land Add/Remove en bescheiden contour-Smooth.
- [Final](stages/final-native-export.png): 36 Areas / 622 punten; specifieke eilanden, vijf gerichte eiland-outlinecorrecties en lokale Land Smooth. Byte-identiek aan `northreach-native-export.png`.

De echte App is gebruikt voor Export PNG → Download PNG, 1×, ARL OFF, grid/scale bar uit, opaque. Het audit-only harnas kopieert de ongewijzigde Blob URL van het native downloadanker naar de auditfolder. Geen alternatieve renderer, canvasscreenshot als export of PNG-nabewerking. Vergelijkings-PNG's zijn uitsluitend screenshots van gelabelde HTML-rapporten met de originele referentie en native exports, geen kaartexports.

[Editorbewijs](editor-screenshot.png): native Edit points met 267 hoofdcontourpunten. [Preview](preview-screenshot.png). [Roundtrip](roundtrip.json): bestaande gather/encode/decode, exacte kaart-/objectgelijkheid en dezelfde PNG-hash vóór/na heropening. Dit bewijst archive-persistentie; er wordt geen Primary-databasesave geclaimd.

## Geografie en productie

[Referentieanalyse](reference-analysis.md) bevat de vooraf gekozen landmarks en macro-gate. [Productiemetingen](production-metrics.json) scheiden de werkelijk gemeten agentwerkwindows, automatische rekentijd en onbekende menselijke tekentijd. Gemeten window 19:57:52–20:16:06 UTC, circa 18 minuten, inclusief analyse, authoringrecepten, browserhandelingen, correcties en toolwachttijd. Rapportage en Gitcontrole daarna. **Dit is geen menselijke performancebenchmark.**

Definitieve artistieke recipe: 36 Freehand-creaties; vijf gehele eiland-outlinepuntcorrecties met behoud van IDs; zes Land Add/Remove-pogingen (vijf effectief); acht globale contour-Smooth-acties; tien effectieve lokale Land Smooth-streken. Geen Roughen. De vijf outlinecorrecties zijn niet vijf individuele muisklikken. Seeds, stroke-coördinaten, aantallen en rekentijden staan in `macro-operations.json`, `meso-operations.json`, `final-operations.json`.

De geometrie is geautomatiseerd via bestaande Mapweaver-domeinfuncties. Referentieposities en visuele beoordeling zijn door de agent bepaald; geen automatische pixeltracing. Herhaalde scriptuitvoering na correcties telt niet als extra handmatig artistiek werk. Afgewezen eerste meso-export en eerdere logs blijven expliciet bewaard. [Workflowbevindingen](workflow-findings.md) bespreken de ronde brushbaaien, de te ondiepe macrobaai, twee gerepareerde eilandverbindingen en een auditpreset die Smooth eerst uitschakelde.

De zeven gevraagde conclusies en geclassificeerde voorstellen staan in [quality-assessment.md](quality-assessment.md). Grootste winst kwam van nauwkeuriger geografisch kijken en gerichte native authoring. Een nieuwe renderer is niet nodig om deze geometriefouten op te lossen. Efficiënte premiumproductie voor een hele wereld is hiermee nog niet bewezen.

## Vergelijkingen

Alle beelden gebruiken dezelfde oriëntatie/crop en uniforme schaal. V1 bevat oudere terrein-/decoratielagen; dat is geen kustgeometrievoordeel. V2 en de nieuwe proef zijn land-only.

- [Referentie / V1 / V2 / nieuw](comparison/reference-v1-v2-premium.png)
- [Complexe baai](comparison/complex-bay.png)
- [Noordelijk schiereiland](comparison/peninsula.png)
- [Skjold-eilanden](comparison/islands.png)
- [Rustige kust](comparison/quiet-coast.png)

## Heropenen en reproduceren

Open `northreach-premium.mapweaver` via de normale Mapweaver-projectactie, bij voorkeur in een QA-kopie. Selecteer land in Scene, gebruik Properties → Geometry → Edit points. Exporteer met de bovenstaande instellingen. Geen externe assets nodig.

`reproduction/build.mjs` bevat het volledige handmatig geobserveerde recept. Voer vanaf repositoryroot achtereenvolgens uit:

```powershell
node docs/audits/2026-10-northreach-premium-coastline-proof/reproduction/build.mjs macro
# Open en beoordeel de macrokaart; native export voordat je doorgaat.
node docs/audits/2026-10-northreach-premium-coastline-proof/reproduction/build.mjs meso
# Open en beoordeel meso; native export voordat je doorgaat.
node docs/audits/2026-10-northreach-premium-coastline-proof/reproduction/build.mjs final
```

Herbouw maakt nieuwe Area-UUID's; geometrie en hoofdkaart-ID blijven uit hetzelfde recept afgeleid. Geleverde archives behouden hun opgeslagen IDs. Bestaande Elyra-projecten worden niet beschreven.

Het QA-harnas staat in `reproduction/`; kopieer editor.tsx, index.html en vite.config.mjs naar `.qa.local/northreach/`. Gebruik uitsluitend een expliciet geïsoleerde QA-root. Het seed-script documenteert de gebruikte consistente kopie van de eerdere lege QA-campagnedatabase; die persoonlijke tijdelijke database is niet meegecommit. Voor zelfstandig heropenen van het archive is die niet nodig.

```powershell
$env:MAPWEAVER_RUNTIME_PROFILE='qa'
$env:MAPWEAVER_DATA_DIR=(Join-Path $PWD '.qa.local/northreach/data')
$env:MAPWEAVER_PORT='49561'
$env:MAPWEAVER_DEV_ORIGIN='http://127.0.0.1:49562'
node dist-service/main.js
# aparte terminal; controleer eerst bestaande instances en vrije poorten
node node_modules/vite/bin/vite.js --config .qa.local/northreach/vite.config.mjs
```

Na startup de Macro/Meso/Final-loadknoppen gebruiken. Iedere PNG via de echte exportactie maken. De roundtripknop gebruikt dezelfde bestaande archive-/renderfuncties als de App. `reproduction/comparisons.mjs` maakt alleen HTML-vergelijkingen; de browser bewaart hun screenshots. `reproduction/validate.mjs` controleert geleverde bestanden, hashes, archive-inhoud, overlaps en meetgegevens. Het bevat geen vervangende renderer.

## Validatie, isolatie en Git

27/27 tests geslaagd, twee suites: `npx vitest run src/domain/landBrush.test.ts src/projects/archive.test.ts`, duur 5,26 seconden. Centrale project- en Area-/landbudgetvalidatie slagen. Extra artifactasserties en roundtrip slagen; zie [validation.json](validation.json). Geen typecheck/lint/build/brede suite: alleen auditbestanden, geen productcode of applicatieconfiguratie gewijzigd. Eerdere elders gemelde revision-snapshotfailures zijn niet gerepareerd of opnieuw gedraaid; geen claim van een volledig groene suite.

Branch `codex/northreach-premium-coastline-proof`, basis `0f74c1af805d73221f329868f2a414ac93c6b300`; actuele schone productcode gelijk aan develop bij aanvang, eerdere auditcommits behouden. Het al bestaande ongetrackte `2026-10-map-types-production-assessment.zip` is ongemoeid gelaten. Precies één eigen lokale auditcommit, geen push.

QA draaide op 49561/49562 na instance-/poortcontrole. Primary Development niet geopend of gewijzigd; productieassets, bestaande audits/projecten en Campfire-contracten ongewijzigd. Geen Windows-package of publicatie.
