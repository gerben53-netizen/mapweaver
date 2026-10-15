# Elyra — native reproductie en capability-proef

Het primaire resultaat is [de onbewerkte native UI-export](elyra-mapweaver-native-export.png), met [het bewerkbare project](elyra-world.mapweaver) en [de echte editor](editor-screenshot.png). [Vergelijking naast elkaar](index.html) en [kritische beoordeling](comparison-and-gap-analysis.md).

**Technische proef geslaagd; visuele referentiekwaliteit niet bereikt.** De compositie en klimaatzones zijn herkenbaar, maar dit is een vereenvoudigde reconstructie, geen premium of pixel-perfect reproductie. De beoordeling onderscheidt beperkingen van het resultaat van bewezen productgaps.

## Herkomst en omgeving

- Uitvoering 15 oktober 2026, branch `codex/elyra-world-reproduction`.
- Exacte uitgangsrevisie `7df6cea1565efe8897f6771cf7090bd24528cb04`; productcode ongewijzigd ten opzichte van `db4117e3d4109560b52392b15d2af93a22c513ba`.
- Originele opdracht en referentie rechtstreeks uit de gebruikers-ZIP; referentie SHA-256 `bdff92911f2bad5ead965a3ec8d5d3f4f3ed61df6e3ea03c65c188aeb4bc61fd`.
- Geïsoleerde SQLite/assetkopie `.qa.local/elyra/data`. Backend 49531; frontend 49532. Vooraf gecontroleerd dat deze poorten vrij waren. Primary Development niet gestart, geen imports daarin.
- `reproduction/author-native.mjs` bevat de handmatig overgenomen geografische coördinaten en gebruikt bestaande Mapweaver-domeinconstructors. Dit bespaart honderden repetitieve plaatsingsklikken. Geen nieuwe renderer, artwork, feature of assetmanifest.
- 2400×1600 px, 18000 km breed. De factor 1,5625 vertaalt handmatig gekozen referentieposities naar kaartcoördinaten. Dit is geen automatische pixeltracing. De schaalbalk is fysiek berekend; de waarden verschillen van de referentie.

De referentie staat uitsluitend in dit rapport. Het project heeft geen bitmapachtergrond; de 20 ingebedde afbeeldingen zijn ongewijzigde bestaande bibliotheekstamps. Geen referentiepixels, nieuwe afbeeldingen, externe kaartcompositie of nabewerking van de export.

## Reproduceren in normale Mapweaver

1. Open Mapweaver en importeer/open `elyra-world.mapweaver` via de bestaande projectactie. Gebruik voor eigen validatie een aparte kopie, niet bestaande kaarten overschrijven.
2. Controleer wereldkaart, 2400×1600, raster uit, ARL OFF. Fit toont de volledige kaart.
3. Scene bevat zeven lagen en 700 afzonderlijke objecten. Selecteer bijvoorbeeld `Northreach and Westmere`, `Westmere river`, `WESTMERE` of een `Painterly Broadleaf Interior 01`.
4. Kies **Export PNG → 1×**, ARL OFF, Include grid uit, Include corner scale bar uit, Transparent background uit, daarna **Download PNG**. Een gewone native Scale bar is al aanwezig in de kaart.
5. De uitvoer moet overeenkomen met `elyra-mapweaver-native-export.png`. De bestaande codec encode/decode en twee renders met dezelfde opties produceerden exact dezelfde SHA-256 als deze download; zie `archive-roundtrip.json` en `validation.json`.

## Authoring en QA-harnas

De meegeleverde `reproduction/`-bestanden zijn uitsluitend auditgereedschap. Kopieer `editor.tsx`, `index.html` en `vite.config.mjs` naar `.qa.local/elyra/`, en `author-native.mjs` naar `.qa.local/elyra/build.mjs` om de vastgelegde QA-setup te herstellen. Het harnas importeert de echte App en bestaande archive/exportfuncties; het voegt alleen expliciete load-, detailviewport- en roundtripknoppen toe. Het past geen productiecode aan. De write-receiver accepteert uitsluitend audit-PNG/JSON/archivebestanden in deze auditfolder.

Een herbouw met `node .qa.local/elyra/build.mjs` vereist de geïsoleerde bronassets en `assets.json` van de inventaris; die persoonlijke databasekopie is bewust niet meegecommit. Het script is geleverd als authoringprovenance, niet als zelfstandig assetpakket. Voor bekijken/bewerken/exporteren is alleen het geleverde archive nodig: alle 20 gebruikte PNG's zijn ingebed. Herbouw maakt nieuwe UUID's; het geleverde archive heeft een vaste identiteit.

De daadwerkelijke QA-startcommando's waren:

```powershell
$env:MAPWEAVER_RUNTIME_PROFILE='qa'
$env:MAPWEAVER_DATA_DIR=(Join-Path $PWD '.qa.local/elyra/data')
$env:MAPWEAVER_PORT='49531'
$env:MAPWEAVER_DEV_ORIGIN='http://127.0.0.1:49532'
node dist-service/main.js
# aparte terminal
node node_modules/vite/bin/vite.js --config .qa.local/elyra/vite.config.mjs
```

Na startup de Elyra-loadknop gebruiken. Het harnas gebruikt `applyPrepared` en een tijdelijke sessierevision. Daardoor leidde de eerste autosave na een labelbewerking terecht tot een save conflict: het archive was nog niet geregistreerd als databaseproject. De echte UI-actie **Save as separate project** registreerde een veilige kopie in de QA-database. Daarin zijn bewerking, undo, redo en Save uitgevoerd. Dit is een harnasbeperking en geen bewijs van een multi-tab-productfout. De definitieve archive/export behielden de oorspronkelijke identiteit en inhoud; de QA-kopie is geen extra deliverable.

## Validatie en grenzen

79/79 tests geslaagd in zes gerichte suites: archive, routes, annotations, terrainPaint, landBrush, terrainStyles. Geen typecheck/lint/build opnieuw uitgevoerd: er is geen productiecode of configuratie gewijzigd. Geen brede suite, Windows-package, push of Campfire-publicatie.

Werkelijke UI-selectie gecontroleerd voor land-Area, rivier, label en stamp. Label gewijzigd naar `WESTMERE — EDIT PROOF`; in de geregistreerde QA-kopie is `WESTMERE` via Undo/Redo geverifieerd en opgeslagen. Paint is opgeslagen als 49 native maskertegels; vijf gestures zijn authoringprovenance, geen vijf achteraf afzonderlijk selecteerbare sceneobjecten.

Primary-rijhashes vóór/na zijn identiek voor projects (27), assets (727), categories (43), campaigns (12), collections (33) en memberships (614). Dit is een controle op deze tabellen, geen hash van ieder gebruikersbestand. De gekoppelde Campfire-contractdirectory is niet gebruikt of gewijzigd. Het vooraf bestaande ZIP-bestand van de vorige audit is ongemoeid gelaten.

De native downloadaanroep nam circa 4567 seconden in beslag, inclusief wachten op de browser/downloadconnector. Dat is **geen geïnstrumenteerde rendertijd**. De latere roundtripcontroles kwamen wel terug met gelijke PNG-hashes. De oorzaak van de lange wachttijd is niet vastgesteld; geen algemene performanceclaim op basis hiervan.

Totale verstreken auditperiode circa 20:52–22:30 lokale tijd, inclusief de lange downloadwacht; er is geen betrouwbare afzonderlijke meting van actieve authoringtijd. Detailscreenshots zijn gewone editorbeelden op 80%, geen uitgesneden of bewerkte exportbeelden. De in-app editorviewport was 1280×720.
