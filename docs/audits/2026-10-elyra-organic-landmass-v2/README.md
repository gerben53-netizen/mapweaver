# Elyra — Organic Landmass Reproduction V2

[Native eindexport](elyra-landmass-v2-export.png) · [bewerkbaar project](elyra-landmass-v2.mapweaver) · [editor](editor-screenshot.png) · [Preview](preview-screenshot.png) · [vergelijking](comparison/reference-vs-v1-vs-v2.png) · [kwaliteitsbeoordeling](quality-assessment.md) · [toolgebruik](tool-usage.md).

V2 is een nieuwe **land-/zeebasis**, geen nieuwe volledige Elyra-kaart. De hoofdgeografie is opnieuw geauthoriseerd en met bestaande organische Land-bewerkingen verfijnd. Geen stamps, biomes, labels, rivieren, decoratie of bitmapachtergrond. De technische productieproef is geslaagd; de visuele uitkomst is nog een vereenvoudigde benadering, **geen premium-geaccepteerde of exacte referentiereproductie**. Zie de expliciete resterende tekortkomingen en scores.

## Omgeving en herkomst

Uitgevoerd 16 oktober 2026, afzonderlijke branch `codex/elyra-organic-landmass-v2`, uitgangsrevisie `50b1d2e45b17457c03502e92ea1f7f7597b0da04`. Productcode blijft gelijk aan de voorafgaande audits. De voorgaande Elyra-reproductie, het Land Tool-onderzoek, de tien testprojecten/exports, de meegeleverde referentie en de actuele Area/Land/Freehand/contourimplementatie vormen de basis.

De oorspronkelijke referentie blijft ongewijzigd in `../2026-10-elyra-world-reproduction/elyra-reference.png`, SHA-256 `bdff92911f2bad5ead965a3ec8d5d3f4f3ed61df6e3ea03c65c188aeb4bc61fd`. Referentieposities zijn handmatig gelezen op de 1536×1024-afbeelding en met factor 1,5625 vertaald naar 2400×1600 kaartpixels. Geen beeldsegmentatie, gerecyclede referentiepixels of nieuwe artworkbestanden in het project.

De eigen QA-service draait op 49551, de frontend op 49552, met profiel `qa` en root `.qa.local/organic-v2/data`. Voor starten zijn bestaande instances en vrije poorten gecontroleerd. De kleine QA-campagnedatabase is consistent gekopieerd van de vorige geïsoleerde QA-proef; Primary Development is niet geopend of beschreven. Geen Campfire-contract gebruikt of gewijzigd. De vooraf bestaande ongetrackte audit-ZIP is behouden en niet meegestaged.

## Productie en controles

Ronde 1: acht opnieuw geauthoriseerde Freehand-hoofdvormen en grotere eilandgroepen, 53 Areas / 1779 punten. De globale geografie is in de echte App geëxporteerd zonder kustlijnstroke, halo, textuur of andere afwerking: [stage-1-global-shapes.png](stage-1-global-shapes.png).

Ronde 2: echte Land Add/Remove op drie schaalniveaus, gerichte Smooth Coast en fijne canonieke Roughen Coast. Uit de visuele controles volgden correcties: geërfde brush-coast-styling verwijderd; uitsnijdingen vanaf de waterzijde gezet; te ronde sleutelgatbaaien en eilandstaarten teruggenomen; oversmoothing verminderd; oriëntatie en footprint van eilanden gevarieerd. Alleen de definitieve recepten en geaccepteerde projecten worden geleverd, geen verworpen proefafbeeldingen als eindresultaat.

Definitief: **144 native Landmass-Areas, 3349 geometriepunten, 0 gaten, 0 assets**. Het grootste ringpuntental is 281 (limiet 512). De totale landfractie is 40,87% tegenover 40,25% in ronde 1. Dit is geen pixelmeting van overeenkomst met de referentie. De totale kustperimeter stijgt van circa 17399 naar 24668 kaartpixels, mede door extra eilanden; meer perimeter is op zichzelf geen kwaliteitsbewijs.

301 geometrisch effectieve Land-acties: 180 Add, 88 Remove, 16 Smooth, 17 Roughen. Daarnaast twee geaccepteerde no-ops. Eén brede Roughen-poging werd door de bestaande veilige-geometriecontrole geweigerd; kortere, zachtere deelstreken zijn vervolgens gebruikt. Zie [tool-log.json](tool-log.json), inclusief de weigering. Geen ongeldige geometrie opgeslagen, geen validator omzeild.

Beide rondes gebruiken dezelfde effen kleuren: land `#c7bb8d`, zee `#214e5a`. **Stroke width = 0; Coastline Roughness = 0; geen appearance/halo.** Alle zichtbare kustvariatie is echte geometrie. [Stage 2](stage-2-organic-coastlines.png) is byte-identiek aan de eindexport.

## Native export en bewerkbaarheid

Alle PNG-kaarten komen uit de ongewijzigde App via **Export PNG → Download PNG**, 1×, ARL OFF, grid uit, corner scale bar uit, opaque. Het audit-only harnas bewaart de ongewijzigde Blob URL van het echte downloadanker via een lokale receiver. Het genereert geen vervangende rendereruitvoer en leest geen screenshot terug als kaart. De overeenkomst van deze transportmethode met een gewone browserdownload is in de vorige audit bewezen. De finale PNG is 2400×1600, SHA-256 `e55249b05170d2898084df00753d047d79afdd521de43c6be470b2de0b233f6a`.

De echte editor en Preview zijn visueel gecontroleerd. `Sunveil` is geselecteerd en de native Edit points-modus met 160 punten is geopend; zie [bewijs](details/editable-native-points.png). Er zijn geen punten verschoven en geen ongewenste databasewrites uitgelokt. De definitieve mapidentiteit is `elyra-organic-elyra-landmass-v2`. De noordwestelijke hoofdvorm en Eldergrove zijn via een native Add-strook verbonden en blijven samen één bewerkbare Area; eilanden blijven afzonderlijke Areas waar zij niet geometrisch verbonden zijn.

De bestaande `gatherProject` / `encodeProject` / `decodeProject`-route is in de browser doorlopen. Objecten en kaartinstellingen komen exact terug. Twee controlerenders vóór/na reopen zijn byte-identiek en hebben dezelfde hash als de UI-eindexport. [Roundtripbewijs](roundtrip.json), [validatie](validation.json). Het archive bevat uitsluitend `project.json`, geen verborgen referentiebestand. Dit bewijst portable archive-persistentie; het is geen claim dat deze kaart in Primary Development is opgeslagen.

De PNG in `comparison/reference-vs-v1-vs-v2.png` is **uitsluitend vergelijkingsmontage**: een screenshot van de gelabelde HTML-rapportpagina met het originele referentiebestand en de echte V1-/V2-exports. De uitsneden zijn browseruitsneden uit precies die afbeeldingen. Er is geen PNG-eindexport nabewerkt. V1 bevat nog de oude terrein-/decoratielagen; V2 is bewust land-only. Beoordeel de kustgeometrie, niet die afwezige lagen.

## Heropenen en reproduceren

Open `elyra-landmass-v2.mapweaver` met de bestaande Mapweaver-projectimport/openactie. Gebruik voor eventuele eigen proefbewerkingen een QA-kopie. Kies Fit en controleer de afzonderlijke Areas in Scene. Exporteer met de bovengenoemde opties. Geen externe assets of oorspronkelijke userdatabase nodig.

Voor volledige authoringprovenance staan `build.mjs`, het App-harnas en de Vite-config in `reproduction/`. Kopieer deze naar `.qa.local/organic-v2/`. `node .qa.local/organic-v2/build.mjs --stage-one` maakt alleen ronde 1; zonder argument ook de definitieve ronde. De geschreven project-UUID's van Areas worden opnieuw gemaakt, de hoofdkaartidentiteit blijft gelijk. De recipe bepaalt de geometrie; `tool-log.json` legt de uitgevoerde seeds, punten en parameters vast. `report.mjs` verwacht de echte UI-exports en de browser-roundtrip vóór rapportopbouw.

QA starten, uitsluitend met een eigen geïsoleerde dataroot:

```powershell
$env:MAPWEAVER_RUNTIME_PROFILE='qa'
$env:MAPWEAVER_DATA_DIR=(Join-Path $PWD '.qa.local/organic-v2/data')
$env:MAPWEAVER_PORT='49551'
$env:MAPWEAVER_DEV_ORIGIN='http://127.0.0.1:49552'
node dist-service/main.js
# aparte terminal
node node_modules/vite/bin/vite.js --config .qa.local/organic-v2/vite.config.mjs
```

Het aangeleverde seed-script is alleen de provenance van de gebruikte consistente QA-backup. Het is niet nodig voor het heropenen van het zelfstandige archive. Het harnas gebruikt een tijdelijke sessierevision voor bestaande editorbediening; gewone Save naar een niet-geregistreerd archive is niet onderdeel van de proef. Gebruik bij eigen QA-opslag de gewone import of Save as separate project.

## Validatie en Git

27/27 bestaande gerichte tests geslaagd in `src/domain/landBrush.test.ts` en `src/projects/archive.test.ts`; centrale projectvalidatie en Area-/landbudgetcontroles slagen. Geen typecheck/lint/build of brede suite opnieuw gedraaid: productcode en projectconfiguratie zijn niet gewijzigd. De drie eerder gemelde `landBrushActions`-snapshotasserties rond `campfireRevision` zijn niet opnieuw gedraaid of gerepareerd; deze audit claimt geen groene volledige suite.

Alleen deze nieuwe auditfolder wordt vastgelegd in één eigen lokale commit. Geen push, Windows-package, publicatie, contractwijziging, assetswijziging of wijziging van bestaande projecten.
