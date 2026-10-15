# Uitgevoerde controles

- git status --short; git branch --show-current; git rev-parse HEAD: schoon develop, db4117e3d4109560b52392b15d2af93a22c513ba.
- netstat -ano -p tcp: bestaande listeners gecontroleerd; audit gebruikt eigen49521/49522, geen standaardpoort of Primary-start.
- SQLite read-only backup/inventaris: .qa.local/production-audit/seed.mjs; volledige originals/previews-kopie; geen Primary-write.
- node .qa.local/production-audit/build.mjs en refine.mjs: bestaande SSR-domeinfuncties, parseProject-validatie, nativearchives. Vite dependency scanning initieel uitgeschakeld in auditrunner; twee mappingfouten in auditcode (lockAspectRatio/font-ID/markerconfig) hersteld vóór bewijs. Geen productfix.
- node .qa.local/production-audit/inventory.mjs: SHA-256 alle727, API-paginering, decodeerbare67 huidige generated components. familyMember is een string-ID, niet JSON; auditreader gecorrigeerd.
- npm run validate-asset-pack -- public/pqa-premium-stamps/mapweaver-pqa-wave-two.zip: geldig69; informatieve tag-normalisatie.
- npx vitest run src/world/generate.test.ts src/world/scatterWorld.test.ts src/world/geographyNetwork.test.ts src/domain/rendering.test.ts src/domain/walls.test.ts src/domain/openings.test.ts src/domain/stampFamilies.test.ts src/export/renderRequest.test.ts src/export/renderCache.test.ts --reporter=json --outputFile=docs/audits/2026-10-map-types-production-assessment/test-results.json:76 pass /7 fail /83, bestaande normalisatieverwachtingen. Eerste smallere selectie55 pass /6 fail; definitieve machineleesbare run is leidend.
- Echte browser: vier archives openen, Fit, editorbeelden/detail, battle Preview ARL C op100/75/50%, vier native Download PNG-acties, bestaande archive/render-roundtrip. Bronbeelden van referenties bekeken via publieke websites.
- Niet uitgevoerd: volledige suite, typecheck/lint/build (geen productcodewijziging), browser-mutatie-/autosave-/crash-/maximumresolutiesuite, Campfire-publicatie, Windows-package, nieuwe artworkgeneratie.
- Voor commit: diffcontrole, uitsluitend auditmap stagen; één lokale auditcommit; geen push.

Laatste authoringcontrole: node .qa.local/production-audit/scale-battle.mjs. Battlemap ingesteld op 100px/5ft (70×50ft canvas), zodat kamers en openingen plausibele speelafmetingen hebben. Alleen auditproject gewijzigd.
