# Sprint 12 — Permanente lokale opslag

Datum: 23 september 2026. Scope: Windows, lokale Node-service en bestaande React-editor. **Implementatie en gerichte technische/browseracceptatie gereed**, met de hieronder expliciet toegestane uitgestelde restore- en packagingtaken. Geen algemene certificering van andere besturingssystemen, browsers, stroomuitval of onbeperkte datasetgroottes.

## Uitgangspunt en acceptatie

De volledige gebruikersopdracht, AGENTS.md, ADR-0001, de nieuwe opslag-ADR, formaat v2, Sprint 8–10 en het onafhankelijke Sprint 11-audit/testverslag zijn gelezen. Opslag-, project-, asset-, Dexie-, import/export- en autosavecode is geïnspecteerd. De bestaande repository had nog geen commit; oorspronkelijke bestanden waren al untracked. Geen bestanden gestaged, gecommit, gereset of gebruikerswijzigingen teruggedraaid.

De nieuwe aangeleverde ADR staat in deze repository als **`docs/adr/0005-persistent-storage-architecture.md`**; 0002 was al bezet door session history. De verwijzing `docs/architecture/0002-persistent-storage-architecture.md` in de opdracht is daarom naar ADR-0005 geïnterpreteerd, niet als aanleiding om het bestaande ADR-0002 te overschrijven. De nieuwe opdracht/ADR vervangen expliciet “zonder backend” en Dexie als primaire opslag. Dit conflict is vóór de implementatie gemeld en de uitzondering is in AGENTS.md verduidelijkt.

Acceptatiebasis: SQLite/filesystem als waarheid; normale Save/Open zonder download; browser/serviceherstart en twee browsers; cache-/testdownloadverwijdering zonder permanente dataverwijdering; gedeelde typed assets; veilige herhaalbare legacy-migratie; portable import/export; achtergrond verwijderen en duidelijke pattern-fillworkflow; gerichte integriteitstests, typechecks, lint en builds. Alleen synthetische testdata is gebruikt.

## Technologie en implementatie

- **Fastify 5.12.5 + @fastify/static 10.1.4**: één productie-origin voor frontend en API; expliciete loopbackbinding, host/origin/method-bescherming, begrensde bodies en gestructureerde fouten.
- **better-sqlite3 13.0.3**: directe, beperkte SQL-laag; geen ORM. Foreign keys, WAL/FULL, transacties, revisies, indexes, veilige backup-API en expliciete schemamigratie.
- **Sharp 0.35.4**: daadwerkelijke serverdecodering en previews naast de gedeelde header-, omvang- en projectvalidatie. EXIF-oriëntatie volgt browserdecodering; originele bytes blijven ongewijzigd.
- **Bestaande parser/fflate**: één v1/v2-projectvalidatie en dezelfde ZIP-integriteitsgrenzen. De pure codec is uit de client-gathering gescheiden zodat de service geen React/Zustand/DOM-code hoeft te initialiseren.
- **Vite/Rolldown** bouwt ook de Node-entry, met Node-dependencies extern. Een losse esbuild-build faalde op Windows-directorytoegang; de al werkende Vite-toolchain lost dit op. Tijdelijk toegevoegde esbuild/tsx zijn weer verwijderd. De gevraagde runtimekeuzes Fastify/better-sqlite3 zijn behouden.

`npm start` serveert de gebouwde applicatie op `http://127.0.0.1:47831`; `MAPWEAVER_PORT` is configureerbaar. Standaard Windows-data: `%LOCALAPPDATA%\Mapweaver`. Alleen expliciet `MAPWEAVER_DATA_DIR` wijzigt dit. Roots, symlink/junction-ouders en onveilige relatieve assetpaden worden geweigerd. Geen impliciete opslag in repository, Downloads of cwd. Ontwikkeling gebruikt een relatieve `/api/v1`-proxy en een expliciet toegestane lokale Vite-origin.

Definitief schema, paden, routes en resterende Dexie-tabellen staan in [local-storage.md](../architecture/local-storage.md). Tabellen: schema_migrations, projects, assets, categories, project_assets, settings en migration_items. Assets hebben aparte typen stamp/fill-pattern/background, typed-hash-uniciteit en gedeelde fysieke bronbytes. Projecten bewaren één volledig gevalideerd JSON-model met revision. Alleen relatieve, intern gegenereerde assetpaden worden opgeslagen.

De client gebruikt één API-laag en een RemoteLibrary-adapter. Actieve projecten hebben een database-ID/revisie en clean/dirty/saving/saved/conflict/error-status. Afgeronde modeltransacties plannen autosave. Een verouderde response mag geen nieuwere wijziging schoon verklaren. De tijdelijke herstelbuffer is **per tabblad én project**; een succesvolle save verwijdert geen andere tabkopie. Herstel verwijdert zijn bronkopie alleen wanneer die tijdens de operatie niet door een ander tabblad veranderd is.

Projects biedt create/open/rename/duplicate/export/confirmed delete en een neutrale previewplaceholder. Het geopende project wordt eerst gewisseld/gesloten voordat de lijst het kan verwijderen. Save/Ctrl+S schrijven SQLite. Actieve projectexport kan ook unsynced bewerkingen veilig als ZIP bewaren zonder die als opgeslagen te markeren. Conflicten bieden apart project, export van unsynced werk of bevestigd herladen. Alle geïmporteerde project-stamps/fills worden in het gedeelde register opgenomen; background-only afbeeldingen verschijnen niet ten onrechte als plaatsbare stamps.

Storage toont locatie, een expliciet beperkte omvangschatting, integriteitsmeldingen, Windows Open data folder, migratie en Back up all data. De folderactie start uitsluitend de absolute systeem-Explorer met het gevalideerde datapad, zonder shell of vrij invoerpad. Remove background is één undo/redo-transactie. Pattern fill heeft een ondubbelzinnige tooltip/tekst, een instructieregel boven het canvas, crosshair en live preview; Escape voegt geen object/history-item toe.

## Migratie en back-upresultaten

Migratie is expliciet per **browserprofiel én origin**. De nieuwe productie-origin kan oude Vite-IndexedDB niet rechtstreeks lezen. README beschrijft daarom het tijdelijk draaien van de bijgewerkte client op de oorspronkelijke hostname/poort, met de API-proxy naar de gewenste permanente opslag.

De wizard toont aantallen/bytes, shared blobs, achtergronden en actuele duplicate/ID-conflicten. Profielidentiteit wordt transactioneel vastgelegd, ook wanneer twee tabbladen tegelijk initialiseren. Per bounded item worden kopie en checkpoint geschreven. Assetbytes worden opnieuw gelezen en gehasht; ieder project wordt geëxporteerd, gedecodeerd en op volledige map/layer/object-betekenis vergeleken. Vrije UUID-project-ID's blijven behouden; conflicten hebben expliciete mappings. Dezelfde key met gewijzigde bron wordt niet overschreven. Brondata wordt nooit automatisch verwijderd.

- Integratietest: één legacy-libraryasset met gedeelde bron en één recoveryproject/achtergrond; onderbreken na een geverifieerd item; hervatten en opnieuw draaien zonder extra project; alle oorspronkelijke Dexie-rows/blobs behouden en hashes gelijk.
- Echte Chrome-wizard: geïsoleerd profiel gevuld met één legacy-libraryitem, één recoveryproject en drie ingebedde gebruikte afbeeldingen; verificatie en rerun slagen; oorspronkelijke assets/blobs/recoveryProjects blijven alle drie aanwezig; vrije project-UUID behouden.
- **Geen persoonlijke/bestaande gebruikersbibliotheek is automatisch gemigreerd.** De wizard en instructies zijn geleverd; de gebruiker start migratie vanuit het juiste oude profiel/origin.

Full backup gebruikt SQLite backup, leest de assetlijst uit de snapshot zelf, controleert SQLite-integriteit/foreign keys en verifieert alle manifestgroottes/SHA-256-hashes. Tijdelijke snapshot plus eventuele WAL/SHM worden alleen binnen de eigen snapshotnaam opgeruimd. Een test heeft de geverifieerde inhoud in een nieuwe tijdelijke datamap teruggezet: integriteit schoon, model gelijk, bronhash gelijk en een zelfstandige projectexport opnieuw succesvol gedecodeerd. De UI biedt een native doelbestandskiezer waar beschikbaar, anders een expliciete browserdownload. Mislukte targetwrites worden geaborteerd en niet succesvol genoemd.

## Gerichte validatie

Windows; Node **24.17.0**; npm **11.13.0**. Alleen testdirectories onder een door tests gemaakte tempmap of `.sprint12.local`; het productie-defaultpad is niet gebruikt.

| Controle | Resultaat |
|---|---|
| Dependency-installatie met lokale npm-cache | Geslaagd; benodigde native packages werken; installatie meldde 0 auditbevindingen |
| `npm run test:service` | **14/14**, 2 bestanden, 0 fail/skip; finale JSON-run 3,80 s |
| Gerichte client Vitest-run hieronder | **61/61**, 11 bestanden, 0 fail/skip; finale JSON-run 4,95 s |
| `npm run typecheck` | Client en service geslaagd, exit 0 |
| Gerichte ESLint voor service, gewijzigde client/opslag/canvascomponenten, browserproeven en configs | 0 fouten/waarschuwingen, exit 0 |
| `npm run build` | Client + service-typechecks en beide productiebuilds geslaagd, exit 0 |
| `npm start` met geïsoleerde data | Frontend en API via dezelfde lokale origin beschikbaar; normale stop/herstart gecontroleerd |
| Chrome EXIF-proef | createImageBitmap geeft voor orientation-6 JPEG dezelfde 24×32 als de service; originele 32×24 encoded bytes behouden |

De servicecases dekken lege/bestaande/future schema's, CRUD/rename/duplicate/delete, conflicten, typed-hash-deduplicatie, referentieblokkade, corrupte/onveilige bestanden en paden, geforceerde schrijffout met tempcleanup, SQLite lock/query-only, onbruikbare datadirectory, ontbrekende/beschadigde/orphan/temp-bestanden, host/origin/headerguards, begrensde folderactie, projectroundtrip, geverifieerde backup+isolated restore en onderbroken/idempotente Dexie-migratie.

De clientselectie:

```text
src/projects/localSession.test.ts
src/storage/backup.test.ts
src/projects/archive.test.ts
src/projects/sprint10-assets.test.ts
src/projects/recovery.test.ts
src/imports/readImage.test.ts
src/imports/importBackground.test.ts
src/canvas/patternDrawing.test.tsx
src/app/sprint10-workspaces.test.tsx
src/storage/libraryRepository.test.ts
src/export/export.test.ts
```

Inclusief save success/conflict/offline/error, oudere response versus nieuwe edit, tabgescheiden buffers en behoud van een nieuwere herstelbron; daarnaast background undo/redo, pattern cancel/pickers/shortcuts, bestaande parser/ZIP/image/budget/migratie- en exportsceneregels. Niet standaard de volledige oude unit- of Sprint 11-browsermatrix gedraaid. Historische browsercases verwachten de oude interface; `npm run test:e2e` wijst nu naar de nieuwe initiële opslagacceptatie. JSON-resultaten staan lokaal in `.sprint12.local/client-tests.json` en `service-tests.json`.

## Browseracceptatie en visuele controle

Bediening met Playwright in echte, geïsoleerde geïnstalleerde **Chrome 153.0.8010.53** en **Edge 153.0.4234.48**, 1280×720. Dit zijn uitgevoerde DOM/muis/toetsenbordflows plus eigen screenshotinspectie; er wordt geen niet-uitgevoerde menselijke muisproef geclaimd.

| Verplichte flow | Waarneming |
|---|---|
| Meerdere stamps en fills importeren in Chrome | Twee stamps en twee fill patterns beschikbaar; met achtergrond vijf geregistreerde assets |
| Project bewerken, browser sluiten, service stoppen en beide herstarten | Model en beelden komen terug vanuit dezelfde testdatabase |
| Tweede browser | Edge toont dezelfde projecten, beide librarytypen en beelden |
| Alleen testbrowseropslag wissen | Project/model/vijf assets komen opnieuw via service terug; screenshot toont stamp en patroon |
| Testdownloads verwijderen | Eigen `.sprint12.local/downloads/portable.mapweaver` verwijderd; databaseproject/assets ongewijzigd; echte Downloads onaangeroerd |
| Ctrl+S | Correcte lokale save-status, geen downloadevent |
| Export/import | ZIP als nieuw UUID-project; gebruikte afbeeldingen en twee objecten behouden |
| Remove background, undo/redo | Achtergrond verdwijnt/keert terug; alleen modeltransactie |
| Pattern draw / tweede poging Escape | Instructie zichtbaar, live rectangle; na Escape dezelfde objectlijst en geen extra modelwijziging |
| Wizard | Copy/verify/rerun in echte IndexedDB; source rows blijven bestaan |
| Twee tabs / conflict | Verouderde write niet gecommit; unsynced export verandert status niet; aparte kopie slaagt |
| Werkelijke servicestop tijdens bewerken | Save failed + recoverybuffer; herstart en Save committen huidige extra laag |
| Layout | Canvas/controls/inspector bij 1280×720 zichtbaar, geen documentoverflow; screenshots gecontroleerd |

Scripts: `tests/persistence/acceptance.mjs` (initial/restart/edge), `migration-conflict.mjs`, `outage.mjs`. De eerste twee weigeren een service die niet naar de afgesproken testdatamap wijst. De outageproef start en stopt alleen zijn eigen child-service op 47832 en gebruikt een unieke synthetische map. README geeft de reproduceerbare commando's, inclusief expliciete serviceherstart tussen initial en restart. Screenshots en test-IDs blijven lokaal onder `.sprint12.local`.

Tijdens ontwikkeling: een dubbele Recent/picker-selector en een ontbrekende wait op het sluiten van de picker veroorzaakten echte mislukte testinvocaties; de testinteracties zijn gecorrigeerd, assertions zijn behouden. De eerste Chrome-netwerkassertie faalde op door aanwezige antivirus geïnjecteerde Kaspersky-requests. Latere testcontexts blokkeren alle niet-loopbackrequests; systeembeveiliging is niet aangepast. Een backupcleanup-regressie vond tijdelijke WAL/SHM-restanten; die zijn binnen de eigen snapshotnaam gerepareerd en opnieuw getest. Tabgescheiden herstelbuffers, controle van een gewijzigde herstelbron en EXIF-dimensies zijn als regressies toegevoegd. Geen van deze eerdere failures wordt als geslaagd bewijs geboekt.

## Beperkingen en expliciete vervolgstappen

- **Deferred / High priority:** automatische herstel-UI met staging, vrije-ruimtecontrole, conflictkeuze en rollback. De huidige veilige handmatige herstelprocedure staat in README; test-only restore naar een lege map is bewezen. Dit is een uitgestelde productfunctie, geen bekende open fout die bestaande data stil overschrijft.
- Full-backup ZIP is voorlopig maximaal 512 MiB brondata in geheugen. Grotere sets worden afgewezen; README beschrijft volledige offline directorybackup. Streaming en automatische backuprotatie zijn uitgesteld.
- Installer, updater, permanente systeemservice, cloud en externe synchronisatie zijn bewust niet gebouwd.
- Projectpreviews zijn neutrale placeholders. Verwijderde/onvoltooide weesbestanden worden conservatief bewaard en gemeld; geen automatische garbage collection.
- **Not tested:** macOS/Linux, Firefox, Node 22 apart, fysieke disk-full/ACL-wijziging, volledige OS-/stroomuitval, native Windows bestandskiezer/Explorer visueel. Failure-injectie, SQLite query-only/lock, picker write/abort-contract en veilige folder-target worden gericht getest. Geen claim dat browserdownloads definitief op schijf zijn voltooid.
- Recovery is tijdelijk: wijzigingen vóór de debounce/bufferwrite kunnen bij een crash verloren gaan. Cache-/quota-/permissiefouten worden gemeld; de gebruiker moet de browser openhouden tot databaseopslag slaagt of een portable backup maken. Oude profiel/origin-data blijft staan tot expliciete migratie/verificatie.
- Eerdere grote-kaartperformance- en overige niet-opslaggerelateerde auditpunten zijn niet ongericht herwerkt.

Geen bekende open Critical/High-bevinding die binnen de uitgevoerde opslagflows stil dataverlies of een valse Saved-status veroorzaakt. De bovenstaande grenzen en niet-geteste platform-/hardwaregevallen blijven expliciet.

## Gewijzigde hoofdonderdelen en externe acties

Nieuw: `service/storage.ts`, `app.ts`, `main.ts`, `platform.ts` en integratietests; service TS/Vite/Vitest-configs; `storage/api.ts`, `remoteLibrary.ts`, `migration.ts`; `projects/localSession.ts`; `StorageDialog`; opslag-/beveiligingsdocs en browseracceptatiescripts.

Aangepast: package/scripts/lockfile, Vite proxy/watchers, ESLint-ignores, pure projectcodec, library/importadapters, actieve projectsessie en header, shortcuts, projectstore backgroundactie, canvasinstructie, README, formaat-v2-context en AGENTS-opslaguitzondering. Geen nieuwe formaatrevisie, ORM, ZIP-/canvasherontwerp of VTT-functionaliteit.

**Geen push, merge, release, publicatie, deployment, upload van projectdata of cloudwijziging uitgevoerd. Geen installer of permanente systeemservice geregistreerd.** Alleen lokale code/configuratie/documentatie en synthetische tests. Publieke dependency-installaties zijn noodzakelijk uitgevoerd; de genoemde antivirusinjectie is afzonderlijk beschreven. Eigen testservices worden na de controles gestopt; testbewijsmateriaal blijft lokaal beschikbaar.

## Aanvulling — standaard-schaalmetadata

De aanvullende eis uit de nieuw aangeleverde opdracht is geïmplementeerd: schema 2 reserveert native/grid/world, standaardbreedte/-hoogte, cells/ft/m, aspectratiovergrendeling en toepassingsbereik. Acceptatiecriteria: automatische upgrade van gevulde schema-1-databases met behoud van IDs, model, referenties en bytes; native defaults voor alle assettypen; consistente API-responses; behoud bij deduplicatie, metadatawijzigingen en volledige back-up; afwijzing van ongeldige kolomwaarden. UI en plaatsingsregels blijven ongewijzigd en verdere configuratie hoort bij Sprint 23.

Gerichte validatie van deze aanvulling: 16/16 service-/migratietests geslaagd, inclusief twee nieuwe regressietests voor upgrade en metadata/API/back-up. TypeScriptcontrole voor client/service en productiebuild geslaagd; ESLint voor service, API-types en gedeeld sizing-type geslaagd. De browsermatrix is niet opnieuw uitgevoerd voor deze opslag-/typewijziging. Tests gebruiken uitsluitend eigen tijdelijke databases; bestaande gebruikersopslag is niet geopend. De echte gebruikersdatabase migreert bij de eerstvolgende start van de bijgewerkte service. Geen externe acties uitgevoerd.
