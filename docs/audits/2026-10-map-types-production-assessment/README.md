# Production Quality Audit — vier kaarttypen

Nulmeting op **15 oktober 2026**, broncode **db4117e3d4109560b52392b15d2af93a22c513ba**, aanvankelijk schone branch develop. Auditbranch: **codex/map-types-production-audit**. Geen productcode, artwork, manifest, migratie of Campfire-contract gewijzigd. Alleen nieuwe auditbestanden. Dit is geen feature-implementatiesprint.

Begin bij [summary.md](summary.md), [feature-matrix.md](feature-matrix.md), [asset-inventory.md](asset-inventory.md), [asset-gap-analysis.md](asset-gap-analysis.md), [feature-gap-analysis.md](feature-gap-analysis.md) en [prioritized-recommendations.md](prioritized-recommendations.md). De aanbevelingen zijn beoordelingsinput, geen goedgekeurd implementatieplan.

| Voorbeeld | Echte editor | Native PNG-export | Bewerkbaar project |
|---|---|---|---|
| World — Elyra |[screenshot](world-map/editor-screenshot.png)|[export](world-map/export.png)|[project](world-map/example.mapweaver)|
| Regional — Varen Coast |[screenshot](regional-map/editor-screenshot.png)|[export](regional-map/export.png)|[project](regional-map/example.mapweaver)|
| City — Brackenford |[screenshot](city-map/editor-screenshot.png)|[export](city-map/export.png)|[project](city-map/example.mapweaver)|
| Battle — Amber Archive |[screenshot](battle-map/editor-screenshot.png)|[export](battle-map/export.png)|[project](battle-map/example.mapweaver)|

Acceptatie van de audit: vier eigen samenhangende full-colour voorbeelden, uitsluitend ondersteunde native objecten; echte editorbeelden, native exportdownloads, detailbeelden, bewerkbare archives; battle op 100/75/50%; actuele inventaris, bronverwijzingen, gerichte testresultaten en expliciete onzekerheden. Geen claim dat één voorbeeld het theoretische maximum of een volledige productcertificering bewijst.

## Herkomst en bewijs

De kaarten zijn technisch geautoriseerd met bestaande domeinfuncties (generateWorld v2, themeWorld, scatterWorld, createArea/Path/Wall/Opening/Label/Place, native families). Daarna geopend via decodeProject/applyPrepared in de **ongewijzigde App**, met gewone MapCanvas/MapPreview. Een duidelijk gemarkeerde QA-bedienstrip laadt uitsluitend auditarchives en kiest viewportzoom. Dat is geen nagebouwde editor. De voorbeeldinhoud is fictief; geen referentie-artwork gebruikt of gegenereerd, geen externe beeldgenerator, compositing of nabewerking.

Elke export.png is werkelijk via **Export PNG → Download PNG** gemaakt. Daarnaast controleert de QA-knop de bestaande exportPng + gatherProject/encodeProject/decodeProject-keten; zie per map validation.json. Reproductie vereist die auditstrip niet: open example.mapweaver via Project, kies Preview, exporteer 1×. Projectdata staat ook in project.json; PNG-bronnen zijn ingebed in het archive. Generated Wall-revisions blijven gebundelde Mapweaver-resources. Geen private volledige database in Git.

QA gebruikt een consistente SQLite-backup plus gekopieerde originals/previews op eigen poorten 49521/49522. Er was vóór start geen Mapweaver-listener op de gecontroleerde standaard- of auditpoorten. Primary Development is niet gestart of beschreven. Bestaande 27 projectrecords en volledige library/project-rowhashes worden vóór/na vergeleken; zie primary-safety.json. De header 'Saved' in de echte App komt uit de gekopieerde startupsessie; die tekst is geen bewijs van een nieuwe database-save. Archive-roundtrip is het concrete save/reload-bewijs. Autosave, crashherstel en runtimeherstart zijn in deze audit niet gecertificeerd.

## Referenties

- World: [Jared Blando — Faerun Lore & Legends](https://jaredblando.com/dragon-magazine-encounter-maps/p/faerunloreandlegendsmap): samenhang van terrein, topografische symbolen, hiërarchische labels en cartografisch kader.
- Regional: [Jared Blando — Sword Coast revised](https://jaredblando.com/prints/p/the-sword-coast-a-campaign-map-of-northwest-faerun-revised): reisstructuur en duidelijke verhouding reliëf/nederzettingen/labels.
- City: [Borough Bound — Crabwell](https://www.boroughbound.com/maps/crabwell): gebouwen, straten, fortificatie, groen en rivier als samenhangend stadsweefsel. De publieke pagina vermeldt 74×66 tiles en 10360×9240 pixels. Die productafmeting is geen vereiste dat onze audit dezelfde resolutie heeft.
- Battle: [Dyson Logos — Colour Portfolio](https://dysonlogos.blog/colour-portfolio/): full-colour top-down leesbaarheid, o.a. Pillared Vault / Vault of Echoes; geen schuin perspectief overnemen. Alle publieke previews zijn daadwerkelijk in de browser bekeken. Geen betaalde downloads aangeschaft of auteursrechtelijke bestanden herverdeeld.

## Bestanden en controles

composition.json bevat actuele IDs, dimensies en objectaantallen. asset-inventory.json bevat echte runtime-ID's, lifecycle/PQA-metadata, familyreferenties en fysieke controle. test-results.json bevat de bestaande tests, inclusief failures. native-export-hashes.json registreert de oorspronkelijke UI-downloads. Reproductiebron staat onder reproduction/; scripts zijn auditmateriaal en wijzigen geen productcode.

Geen push, Windows-package, Campfire-publicatie of externe datawrite uitgevoerd. Typecheck/lint/build niet opnieuw uitgevoerd: uitsluitend auditdocumenten/projecten en QA-hulpmiddelen, geen wijziging van productcode. De bestaande gerichte tests zijn wel gedraaid. Zie commands.md.

Let op E3: Battlemap heeft een aangetroffen native/technische renderafwijking; zie summary.md en battle-map/render-path-comparison.json. De eind-PNG is altijd de daadwerkelijke UI-download. Geen universele pariteitsclaim.
