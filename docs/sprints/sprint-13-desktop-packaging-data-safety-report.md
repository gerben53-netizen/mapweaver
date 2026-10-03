# Sprint 13 — Desktop packaging en dataveiligheid

23 september 2026. **Niet volledig afgerond.** De portable Windows-package en automatische restore zijn gebouwd en gericht gevalideerd. De installerbouw is geblokkeerd doordat ISCC.exe ontbreekt. Automatische opening van de standaardbrowser viel in deze uitvoeromgeving terug op het gedocumenteerde handmatig openen; dit is geen geslaagde default-browseracceptatie. De visuele controle daarvan is bovendien door automatische goedkeuringscontrole geweigerd wegens mogelijke blootstelling van andere Chrome-venstertitels. Er is geen systeeminstelling aangepast om dat te omzeilen.

## Inventarisatie en acceptatiebasis

AGENTS, ADR-0001/0005, README, het Sprint 12-verslag, actuele opslag-/back-up-/migratiecode en relevante release-/securityrapporten zijn geïnspecteerd. Het genoemde `docs/architecture/0002-persistent-storage-architecture.md` is in deze repository ADR-0005; het apart genoemde Sprint 12-planbestand bestaat niet. De bestaande implementatie had SQLite-schema 2, native asset sizing, een volledige back-up in geheugen met 512 MiB grens, handmatige restore en definitieve projectverwijdering.

Acceptatiecriteria voor dit werk: transactionele vervanging en rollback, behoud van project-ID/revisie/assets/schaalmetadata, streaming zonder datasetbuffer, veilige oude-clientafwijzing, volledige loopbackbeveiliging, aparte programma/dataopslag, launcher single instance, Trash, integriteit en privé diagnosepakket. Installer/default-browserbeperkingen worden niet als geslaagd geboekt.

## Implementatie en keuzes

- Native .NET Framework-launcher met gebundelde **Node 24.17.0 x64**, bestaande better-sqlite3/Sharp-layout en normale browserkeuze. Geen Electron, verplichte ingebedde browser, npm-installatie voor eindgebruikers, administratorrechten of permanente Windows-service. Node single-executable is verworpen wegens extra native-module-extractiecomplexiteit. Zie ADR-0006.
- `Mapweaver.exe` wacht op health, controleert de padvrije datamapfingerprint, hergebruikt een gezonde instantie, opent de standaardbrowser of toont een lokale URL als dat niet lukt. Named mutex serialiseert launchers; een kernel-owned loopback lease op de canonieke datamap verhindert twee productie-schrijvers, ook bij verschillende API-poorten. Een hash-/poortbotsing weigert veilig; geen stille datamapwissel.
- `Create shortcuts.exe` maakt op expliciet verzoek Open/Stop-desktopsnelkoppelingen. Deze systeemactie is niet op de gebruikersdesktop uitgevoerd. Stop via UI of `--stop`; idle shutdown na 15 minuten alleen zonder pending writes/actieve of wachtende storagejob. Open editorclients sturen heartbeats.
- Schema **3** voegt Trash toe. Verwijderde projecten houden inhoud/ID/assetreferenties; terugzetten is expliciet en definitief verwijderen apart bevestigd. Automatisch legen staat uit.
- Back-up: **yazl 3.3.1 / yauzl 3.4.0**, ZIP64 STORE, SQLite backup-API, 256 KiB hashingbuffers, lazy streams, vaste veiligheidslimieten en vrije-ruimtecontroles. Eerst tijdelijk bestand, dan volledige gestreamde verificatie met read-only SQLite en werkelijke beelddecodering, daarna rename. Manifest bevat versies, datum, generation, aantallen, bron-/archiefgrootte en hashes. De normale 512 MiB-grens is verwijderd; standaard veiligheidsgrens 256 GiB.
- Restore leest eerst manifest/structuur en controleert paden, aantallen, groottes, ratio en SHA-256. Daarna staging op hetzelfde volume; schema, relaties, projectdocumenten, MIME/beelden en schaalmetadata worden gevalideerd. Na expliciete bevestiging: maintenance, SQLite-checkpoint/close, oude directory naar rollback, staging naar actief, heropenen/eindcontrole, commit. Een duurzaam journal herstelt bij onderbreking de oude set. Windows heeft geen atomische uitwisseling van twee volle directories: individuele renames plus journal zorgen voor herstelbaarheid.
- Dataset generation naast projectrevisies voorkomt late autosaves uit oude tabs, ook na wachten in de schrijfqueue. Oude herstelkopieën kunnen niet automatisch de nieuwe dataset overschrijven. Reload is expliciet, met exportmogelijkheid voor unsynced werk.
- Herstelpunten blijven onbeperkt bewaard; automatische rotatie/verwijdering is uitgeschakeld. Opslaglocatie wijzigen gebeurt via een gedocumenteerde volledige backup/restore-route, geen losse databaseverplaatsing.
- Storage toont ruimte per onderdeel, back-updatum, jobs/progress/cancel, restore, integriteit en diagnose. Diagnose bevat alleen versies, OS/runtime, counts, ruimte en generieke status; geen namen, persoonlijke paden, documenten, afbeeldingen, browserdata of database.

## Veiligheid en foutpaden

Host/origin/Fetch Metadata/custom-header-controles blijven actief. Willekeurige externe origins krijgen geen lees-/schrijftoegang. Geen willekeurige bestandspaden via API. ZIP-slip, duplicates, onbekende entries, compressiebommen, size/hash mismatch, ongeldige schema's en rasterinhoud worden geweigerd. Staging activeert geen uitvoerbare bestanden. Restore verandert de actieve data pas na verificatie; fouten bij close, renames, reopen of eindcontrole behouden/herstellen de oude set. Als OS-rechten/locks ook rollback verhinderen, blijft materiaal behouden en mag health geen gezonde status melden; handmatige hulp is dan nodig.

Annuleren kan vóór de omschakeling. Tijdens commit wordt afronden of rollback afgewacht. Niet-afgeronde uploads/staging/journals worden gemeld; controle verwijdert niets. FAT-/browserdoelbeperkingen zijn vooraf uitgelegd; een niet te inspecteren browserdoel kan nog een schrijf-/bestandsgroottefout geven, nooit een geclaimde succesvolle doelwrite.

## Validatie en bewijs

- Gerichte service-/integratietests: **35/35 geslaagd**, inclusief 34 reguliere cases en één grote streamingcase. Ze dekken lege en gedeelde datasets, Sprint 12-formaat, restore over andere data, volledige recordbehoud, vijf omschakelfouten, corrupt/missing candidate assets, close-fout, journal-crashherstel, stale generation, malformed/missing/duplicate/unsafe ZIP, compressiebom, entrycount, annuleren/free-space rejection, lease, Trash en privacy.
- Gerichte clienttests: **14/14 geslaagd**, waaronder save-state/recoverygenerations en gestreamde filepicker-write/abort.
- Grote streamingproef: **567.070.720 bronbytes**, **567.071.478 archiefbytes**. Baseline RSS **123.895.808**, piek **178.065.408 bytes** (circa 51,7 MiB extra). Dit gebruikt een grote SQLite-fixture; geen claim dat alle bibliotheken of 256 GiB datasets zijn gebenchmarkt. Resultaat lokaal `.sprint13-large-result.local`.
- TypeScript client/service, gerichte ESLint, productiebuilds en C# launchercompilatie geslaagd. De launcher is C#, dus gecontroleerd door csc; een aparte TypeScriptlauncher bestaat niet.
- Portable packagebuild plus SHA256SUMS geslaagd. Geïnstalleerde npm-dependencyaudit (volledig en productie) meldt **0 bekende kwetsbaarheden**. Runtime/dependencies/licenties zijn lokaal gebundeld; geen signing/publicatie.
- **Chrome 153.0.8010.53 en Edge 153.0.4234.48**: geïsoleerde UI-flows op 1280×720, stamps/fill/background, volledige back-up in zelfgekozen testpad buiten Downloads, wijziging daarna, UI-restore met bevestiging, verdwenen latere wijziging, gelijk model/revisie/assetmetadata/hashes, geweigerde oude-clientwrite, corrupte ZIP laat model intact, integriteit/diagnose en volledige procesherstart. Geen browserruntimefouten. Screenshot gecontroleerd. Dit is geautomatiseerde muis/DOM-bediening, geen verzonnen menselijke handmatige proef.
- Packagepad met spaties/é, dubbel launch, bezette poort, ontbrekende native SQLite-module, Stop, programma-upgrade en portable uninstall met behouden testdataset zijn gericht getest. Alleen test-owned kopieën/data gebruikt. Scripts: `tests/persistence/sprint13.mjs`, `launcher.mjs`.
- Installer: **Blocked** — `npm run package:installer` faalt omdat ISCC.exe ontbreekt. Inno Setup-configuratie is geleverd maar niet gecompileerd/geïnstalleerd/getest.
- Standaardbrowser: launcher startte de service gezond; automatische browseropening mislukte in deze omgeving en gaf de bedoelde handmatige fallback. Visuele inspectie bleef zonder toestemming geblokkeerd. Geen Pass.

Tijdens implementatie traden echte failures op: csc interpreteerde een relatief pad verkeerd (absolute bronpad gefixt), een test zocht de oude native-modulelocatie (huidige prebuild gebruikt), en een te korte health-timeout gaf een vals poortprobleem (verruimd en launchertests herhaald). De eerste default-browserproef bleef in de fallbackdialoog; uitsluitend die eigen testlauncher en eigen service zijn beëindigd. Eerdere mislukte runs worden niet als succesvolle acceptatie geteld.

## Niet getest / beperkingen

Geen installerinstall/upgrade/uninstall, codesigning/SmartScreen, volledige OS-/stroomuitval, fysieke volle schijf of OS-ACL-experiment, FAT32-doel, >4 GiB archief, native save-dialog via Windows-UI, daadwerkelijke desktopsnelkoppelingcreatie of 15 minuten idle-duurproef. Wel: gerichte failure injection, vrije-ruimteregels, write/abort-contract, journalherstel en echte procesherstart. Firefox en macOS/Linux zijn niet opnieuw getest. Projectexport/PNG en overige editorfunctionaliteit zijn niet ongericht volledig opnieuw getest.

Een parallel lokaal proces met dezelfde OS-gebruikersrechten valt niet onder een malwarebeveiligingsclaim. Herstelpunten en geverifieerde lokale back-ups gebruiken diskruimte tot expliciete opschoning. Er is geen complexe repair/merge of preview-rebuildinterface. Browserdoelvoltooiing is alleen aantoonbaar bij succesvolle native writer-close of gecontroleerde testdownload.

## Hoofdonderdelen en grenzen

Nieuw: `service/archives.ts`, `safety.ts`, `jobs.ts`, data-safety tests, `StorageBackups`, native launcher/installerconfig/licentie, package/checksum scripts, package/browsertests, backup-/troubleshootingdocumentatie en ADR-0006. Aangepast: service/router/schema/lifecycle, API-client en herstelgenerations, Storage/Projects met Trash, scripts/lockfile, README en opslag/securitydocumentatie.

**Geen push, merge, release, upload, publicatie, deployment, cloudwijziging, signing of distributie buiten de workspace. Geen installer of permanente systeemservice geregistreerd.** Publieke dependencies/licentie zijn alleen gedownload voor lokale builds. Geen echte gebruikersdatamap gebruikt of gemigreerd. Testprocessen worden gecontroleerd gestopt; testmateriaal blijft lokaal ter inspectie.
