# Onafhankelijke kwaliteitsbeoordeling — Mapweaver 1.0.0

Datum: 23 september 2026. Advies: **GO voor de geteste desktopworkflow in Chromium**, met de expliciete beperkingen in [RELEASE-READINESS](RELEASE-READINESS.md). Geen claim van Firefox-certificering of vloeiende bediening op iedere kaartgrootte.

## Scope, methode en baseline

AGENTS.md, ADR 0001–0004, sprintverslagen 2–10, de Sprint 1-opdracht, README, CHANGELOG en formaat v1/v2 zijn gelezen. Bestaande verslagen zijn gecontroleerd tegen broncode, de volledige suite, gegenereerde bestanden, geïsoleerde browsers en screenshots. Geen persoonlijke kaartbestanden gebruikt. Alle browserprofielen zijn tijdelijke testprofielen; applicatieverzoeken blijven lokaal.

Windows; Node 24.17.0; npm 11.13.0; app 1.0.0; Dexie-package 4.4.6 / databaseschema 3; schrijven formaat 2, lezen 1–2. Branch `master`, één worktree, nog geen commit. De oorspronkelijke projectbestanden waren al untracked. Er is niets gestaged, gecommit of teruggedraaid. Oorspronkelijke hashes staan lokaal in `.audit.local/baseline-sha256.json`.

[BASELINE.md](BASELINE.md) legt de oorspronkelijke bevindingen vast. Eerste volledige Vitest-ronde: **123 geslaagd, 26 mislukt, 0 overgeslagen, totaal 149**. Typecheck en build slaagden; lint gaf 19 fouten in lokale gegenereerde scripts. npm audit: 0 kwetsbaarheden. Regressies voor ongeldige geometrie en vertraagde achtergrondimport faalden vóór reparatie. Aanvullende browserbevindingen zijn vóór hun reparatie aan de baseline toegevoegd. De audit en hercontrole verliepen iteratief; oorspronkelijke fouten zijn niet uit de rapportage verwijderd.

## Requirementsmatrix

Pass betekent concreet bewijs voor de genoemde functionaliteit, niet alle denkbare combinaties. Browserhandelingen zijn met Playwright uitgevoerd. De handmatige kolom betreft eigen visuele inspectie van echte screenshots; er is geen niet-uitgevoerde menselijke muisproef als geslaagd geboekt. Testbestanden hieronder staan onder `src/`, browsertests onder `tests/e2e/`.

| Requirement / bron | Implementatie | Geautomatiseerd bewijs | Visueel/handmatig bewijs | Status |
|---|---|---|---|---|
| S1 viewport, pointerzoom, begrenzing, beide pans, Fit | canvas/viewport, useCanvasNavigation, MapCanvas; editorStore | viewport/navigation-tests; performance + additional E2E; viewport verandert model niet | 01, 13–15: kaart begrensd, canvas dominant | Pass |
| S2 achtergrondimport | imports/importBackground, readImage, BackgroundImport | importtests; imports E2E PNG, undo/redo, download; generatie-regressie | 19 achtergrond | Pass |
| S2/10 bibliotheek, zoeken, categorieën | library/LibraryWorkspace, storage/libraryRepository | repository/importtests; release/additional E2E: 200 assets, 20 categorieën, lange naam | 02, 03, 16, 21 | Pass |
| S10 stamp/fill-typen en migratie | models, projects/format/migrateAssets, storage/database | sprint10-assets: gemengd v1→v2, gedeelde bytes, DB2→3, heropenen en rollback | Type-specifieke lijsten/pickers | Pass |
| S10 assetpickers en plaatsing | AssetPicker, chooseAsset, useStampPlacement | workspace/placement-tests; herhaald plaatsen en pattern draw; lege bibliotheek na openen | 04, 06, 17, 22 | Pass |
| S3 selectie, verplaatsen, schalen, draaien, spiegelen, numeriek | EditableStamp, transforms, ObjectProperties | canvasEditing/objectEdits/transforms; release E2E echte hoekgreep, numerieke rotatie, spiegeling | 05, 07 zichtbare selectie | Pass |
| S4 lagen, volgorde, multiselect, groep verplaatsen | domain/layers, projectStore, LayersPanel | objectManagement; additional E2E Shift-selectie/groepssleep/undo; release laagvolgorde/hide/lock; 256 lagen | 08, 18 | Pass |
| S5 grid, snap/Alt, resize/clipping | mapSettings, MapGrid, MapSettingsPanel | mapSettings/placement-tests; release Alt-plaatsing; additional resize annuleren/accepteren/undo | 09 instellingen; resizebevestiging automatisch gecontroleerd | Pass |
| S6 rechthoekig repeat/stretch patroon | patterns, PatternFillImage, usePatternDrawing | patterns/patternDrawing; release repeat→stretch; fixturepatronen met interne rotatie/offset | 07 plus export | Pass |
| S7 history, dirty/clean point | store/history, objectEdits | history-tests; ≥10 wijzigingen volledig undo/redo, nieuwe tak, tekstveld-undo | Status en herstelweergave | Pass |
| S8 New/Open/Download/autosave/recovery | projects/session/recovery/repositories | recovery + release/additional E2E: expliciet resume, New/Open annuleren, schoon profiel; autosave-revisieregressie | 10, 11 herstel/zelfstandig project | Pass |
| S8/10 archiefvalidatie en projectassets | format, zip, archive, assets | archive + sprint10-assets: semantische roundtrip, deduplicatie, hash/type/ref/prototype/path-afwijzing; runtime onveilig bestand blijft atomair | 12 foutmelding, werk intact | Pass |
| S9 PNG en Roll20 | export/scene/render/roll20, ExportControls | export-tests + echte 1×/2× PNG, afmetingen, alpha, grid, Roll20-tekst, geschiedenis ongewijzigd | PNG's bekeken: geen editor-UI/selectie, patronen/stamps zichtbaar | Pass |
| S10 workspaces/inspector/contextacties | App, Tabs, ToolRail, ObjectProperties | workspace-tests; alle inspector-tabs, kopiëren/plakken/dupliceren/verwijderen in E2E | 01–11 rustige shell, eigen paneelscroll | Pass |
| Keyboard/focus, modal Escape, labels | Modal, Tabs, shortcuts, navigation | gevulde zoekinput Escape+focus; Space-release, tekst-undo; axe editor/picker 0 overtredingen | Focusringen zichtbaar; één Tab blijft binnen modal | Partial: geen screenreader-/volledige Tab-audit |
| Empty/loading/disabled/error/busy | app/library/project controls | lege editor; geblokkeerde import/export; corrupte bestanden; partiële import; debounce/quota-fout | 01, 04, 12, 20; meldingen naast werk | Pass voor geteste staten |
| 1280×720, 1920×1080, 200% | CSS Modules/variabelen | viewportchecks; 640×360 CSS als 200%-reflowproxy, export bereikbaar, documentbreedte 640 | 11, 13–15 | Partial: native browserzoom niet bediend |

## Architectuur

De scheiding is bruikbaar voor versie 1: domeingeometrie is puur; React/Konva zit in canvas/app; projectStore bevat map/objecten/lagen, editorStore bevat selectie/viewport/clipboard/pickers. History bewaart model-snapshots, geen Blob, URL of Konva-node. Lagen bevatten uitsluitend IDs en paint-volgorde; objectgegevens hebben één opslaglocatie. Parser en mutatiegrenzen bewaken referenties en typen. ZIP serialiseert geen tijdelijke editorstatus.

Projectassets gaan vóór algemene bibliotheekassets. Hashes delen bronbytes, terwijl stamp/fillPattern afzonderlijke logische typen blijven. Repository- en importfuncties verzorgen bestands-/opslagwerk buiten componenten. Export bouwt een aparte scene op kaartcoördinaten en leest geen actuele Stage/viewport. De historylaag bundelt afgeronde transacties; componenten mogen previews tonen zonder pointermove-autosaves.

Lichte importanalyse: 69 productiebronbestanden; grootste store 231 regels, overige grootste bestanden 80–118 regels. Een wederzijdse afhankelijkheid tussen projectStore en editorStore blijft bestaan (MW-AUD-012). Domeinbestanden gebruiken enkele type-only coördinaatimports uit canvas; dit bindt het domein niet aan Konva-runtime, maar verdient aandacht bij latere opsplitsing. Non-null assertions vooral rond gevalideerde refs/manifests; parser behandelt onbekende invoer als unknown. Optionele legacy `kind` wordt bij nieuwe repository-/picker-/formaatgrenzen afgedwongen. Geen nieuwe generieke pluginarchitectuur of breed designsysteem toegevoegd. Tests zijn aangepast aan actuele typen/scopes, beveiligingschecks zijn niet versoepeld.

## Bevindingenregister

Waarschijnlijkheid en impact zijn apart vermeld. Fixed is alleen gebruikt na hercontrole; Deferred blijft een niet-opgeloste beperking. MW-AUD-007 is expliciet een bewijsgat uit de baseline, geen nieuw productdefect.

| ID | Ernst / status | Reproductie en feitelijk versus verwacht | Impact / waarschijnlijkheid | Locatie, oplossing en hercontrole |
|---|---|---|---|---|
| MW-AUD-001 | High / Fixed | Volledige suite: 26 fouten door oude typen, formaatverwachtingen, DnD-contract en shortcutdoelen; verwacht actuele groene regressies | Releasebewijs onbetrouwbaar / hoog | tests in canvas/store/projects/storage; fixtures en testdoelen bijgewerkt met behoud van checks; eindronde groen |
| MW-AUD-002 | Medium / Fixed | `npm run lint` lintte genegeerde lokale generators en gaf 19 no-undef-fouten | Niet-reproduceerbare kwaliteitscheck / hoog | eslint.config: lokale output uitgesloten, Node/browser-globals voor testtools; volledige lint groen |
| MW-AUD-003 | High / Fixed | X=1000000001, teveel lagen/objecten of 10.000 precieze patronen konden een niet-opslagbaar document maken; verwacht afwijzing vóór commit | Backup/herstel geblokkeerd / middel | documentLimits, projectStore, transforms, patterns, history; gedeelde limieten + metadatareserve; regressies voor grenzen en atomair terugzetten |
| MW-AUD-004 | High / Fixed | Start achtergronddecode, wissel project, laat decode afronden: oude import belandde in nieuw project | Onbedoelde cross-projectwijziging / laag-middel | importBackground generatiecontrole na async werk; vertraagde-decoderregressie |
| MW-AUD-005 | Medium / Fixed | 640 CSS px: essentiële headerknoppen afgesneden; verwacht bereikbare bediening | Gebruik bij vergrote UI / hoog op smalle breedte | App/MapCanvas CSS: horizontale controls-scroll, begrensd paneel en footer; reflowproxy en screenshot 15, native zoom niet afzonderlijk bewezen |
| MW-AUD-006 | Low / Deferred | Teken patroon op fractionele schaal: invoervelden tonen lange decimalen | Leesbaarheid / hoog | PatternProperties: later display-only afronden, modelprecisie behouden; screenshot 07 |
| MW-AUD-007 | Medium / Fixed | Bestaande sprintverslagen bewezen echt herstel/PNG-pixels niet | Releasebewijs onvoldoende / zeker | Nieuwe geïsoleerde E2E, echte downloads, alpha/dimensies en clean-context-open; eindronde groen |
| MW-AUD-008 | Medium / Fixed | Zoek in picker, druk Escape: native searchgedrag kon modal sluiten/focusherstel hinderen | Toetsenbordcontinuïteit / middel-hoog | Modal behandelt Escape expliciet, sluit vóór DOM-verwijdering; gevulde-inputregressie en 3 browserherhalingen |
| MW-AUD-009 | High / Fixed | Nieuwe edit liet 'local copy saved' staan tijdens debounce; reload kon eerdere kaart herstellen | Verlies nieuwste werk ondanks status / middel | recovery markeert pending onmiddellijk en koppelt saved aan revisie; async oude-write-regressie en reloadvergelijking |
| MW-AUD-010 | High / Fixed | Vijf verschillende bronnen van elk 24 MP pasten individueel, samen niet in 96 MP opslagbudget | Geen duurzame backup/herstel / laag bij kleine assets | assets-resourceboekhouding op hash + admission; budget/deduplicatie/reset-test; source-byte-reserve gedocumenteerd |
| MW-AUD-011 | Medium / Deferred | 1.000-objectfixture: slepen en pan/zoom beduidend trager dan 20/100 | Interactiecomfort zware kaarten / hoog in stressfixture | canvas/store/history, oorzaak nog niet geprofileerd; meet eerst browser-main-thread en canvasdraw op doelhardware; zie performanceverslag |
| MW-AUD-012 | Low / Deferred | Importgraph bevat projectStore↔editorStore-cyclus | Onderhoud/init-volgorde / laag nu, risico bij uitbreiding | Stores; later smalle command-/coördinatiegrens, geen refactor tijdens release-audit |
| MW-AUD-013 | Informational / Open | Firefox Playwright-build 1543 start proces maar haalt launch-handshake niet binnen 15 s | Browsercompatibiliteit onbekend / zeker in deze omgeving | Tooling/omgeving, geen vastgesteld applicatiedefect; apart in betrouwbare Firefox-omgeving uitvoeren |

| MW-AUD-014 | Medium / Fixed | Playwright-trace-HTML in de auditmap veroorzaakte Vite-page-reloads tijdens tests; verwacht geen testartefactgestuurde navigatie | Instabiel browserbewijs / hoog tijdens audit | vite.config watch-ignores en apart beheerde testserver; 3 HTML-writes met 0 reloads; daarna volledige browserhercontrole. Betreft toegevoegde audittooling, geen productiegebruik. |

Totaal: 14 bevindingen; 10 Fixed, 3 Deferred, 1 Open. Niet opgelost inclusief Deferred: **0 Critical, 0 High, 1 Medium, 2 Low, 1 Informational**. Oorspronkelijk 5 High, 6 Medium, 2 Low, 1 Informational. Geen Critical gevonden.

## Wijzigingen en grenzen

Productfixes zijn beperkt tot de genoemde datagrenzen, importgeneratie, autosavestatus, modal Escape/focus en controlbereikbaarheid. Playwright en axe zijn uitsluitend devDependencies; bestaande dependencies zijn niet geüpgraded. Formaatversie en Dexie-schema bleven ongewijzigd. Documentatie beschrijft de conservatieve editorbudgetten. Geen push, merge, publicatie, deployment, upload of cloudwijziging uitgevoerd.

Ruwe logs, JSON, screenshots en exports staan onder genegeerde `.audit.local/`; ze zijn lokaal bewijs, geen automatisch meegedeelde repositoryartefacten. Scripts en tests reproduceren de controles. Details: [tests](TEST-REPORT.md), [security/data](SECURITY-AND-DATA-INTEGRITY-REPORT.md), [UX/performance](UX-ACCESSIBILITY-AND-PERFORMANCE-REPORT.md), [backlog](POST-V1-BACKLOG.md).
