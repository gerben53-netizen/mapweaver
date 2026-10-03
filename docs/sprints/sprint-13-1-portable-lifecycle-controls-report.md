# Sprint 13.1 — Portable lifecycle controls

23 september 2026. **Implementatie geleverd; niet volledig handmatig geaccepteerd.** Native Windows-systeemvakacceptatie en de drie gevraagde systeemvakscreenshots zijn niet uitgevoerd. Automatische service-, launcher- en browserbewijzen vervangen die controles niet.

## Voorbereiding en acceptatiebasis

AGENTS.md, README, actuele launcher/service/health/lease/jobs/restore/autosave/buildcode en het Sprint 13-rapport zijn gelezen. Het genoemde `docs/architecture/0002-persistent-storage-architecture.md` bestaat hier niet; het actuele besluit staat in `docs/adr/0005-persistent-storage-architecture.md` en is gelezen. Het afzonderlijke `sprint-13-desktop-packaging-data-safety.md`-planbestand ontbreekt; het bestaande rapport en ADR-0006 zijn gebruikt. Bestaande gebruikersbestanden en oudere packages zijn behouden. De repository is nog volledig untracked; niets is gestaged/gecommit.

Acceptatiebasis: blijvende zichtbare supervisor, één schrijver per datamap, tweede launch via beschermde IPC, veilige drain/flush/close, expliciete beslissing bij werk, generation-bescherming bij restart, privacyvriendelijke diagnose en een nieuwe lokale portable build. Geen wijziging aan kaarteditorfunctionaliteit of project-/assetmodel.

## Definitief procesmodel en implementatie

- WinForms ApplicationContext/NotifyIcon in de bestaande native .NET Framework-launcher; ingebed M-icoon. Open, Restart, Stop, Keep running, Diagnostics en expliciete herstelactie voor geblokkeerde browsertabs. Geen stabiele afzonderlijke Projects-route gevonden, dus geen schijnknop toegevoegd. `--debug` toont dezelfde status/menuacties in een diagnosevenster.
- Een lifetime-mutex per gebruikers-SID/datamap bezit de supervisor. De bestaande kernel-owned loopback lease blijft de enige productie-schrijverafscherming van Node/SQLite. Discoverypipe plus generation-specifieke commandpipe hebben een beschermde user-only ACL, deny-network-regel, allowlist, berichtlimiet en timeouts. Geen live/stale lockbestanden worden verwijderd.
- Node bezit database, bestanden, jobs en HTTP. Health moet application, datamapfingerprint, supervisor-ID en daadwerkelijke child-PID matchen. Een aparte runtime instance UUID weigert oude tabs na herstart, naast de bestaande dataset generation en projectrevisies.
- Stop blokkeert nieuw werk, inventariseert reeds toegelaten requests/streams/saves/imports/exports, jobs en browserwerk, wacht op een expliciete actieve-werkkeuze en laat daarna iedere tab zijn dirty state flushen. Tab-acknowledgements zijn aan het stop-ticket gebonden. Daarna volgen WAL checkpoint, DB-close, HTTP-close, lease-release, child-exit en supervisor/tray-exit. Restart begint pas daarna.
- Een kritieke restore is niet annuleerbaar. Veilig annuleren gebruikt de bestaande jobcontroller en cleanup; geen tweede backup/restore-implementatie. Twee minuten timeout geeft error, geen kill. Een gesloten/gecrashte tab kan een wait-barrière achterlaten: uitsluitend na timeout, zonder actieve servicewerkzaamheden en na expliciete waarschuwing/bevestiging kan de gebruiker browserwaits vrijgeven. Dit slaat die verloren browserwijzigingen niet alsnog op en verwijdert geen herstelbuffer.
- Browser Stop gebruikt dezelfde service-state machine en geregistreerde sessie; de supervisor observeert die toestand. Na flush blokkeert de tab invoer en toont hij **Mapweaver has stopped**. Het sluiten van alleen een browser stopt Mapweaver niet; de oude idle-exit is verwijderd.
- ShellExecute opent een getypeerde loopback-URL na healthcheck, zonder shellstring. Bij failure blijft de service actief met een kopieerbare URL. De launcher leest geen privébrowservensters. Een servicecrash houdt de supervisor in foutstatus; een supervisorcrash laat de schrijver bestaan en wordt niet beantwoord met een onveilige overname. Browser Stop en opnieuw starten bieden gecontroleerd herstel waar die browser bereikbaar is.
- Diagnose bevat begrensde, gevalideerde lifecycle-events en optionele numerieke exitcode. Niet-verzonden supervisorevents blijven in geheugen tot een gezonde restart. Logs bevatten geen datamappaden, projectinhoud, secrets of browserdata.

Zie [lifecycle/IPC-contract](../architecture/portable-lifecycle.md) en [portable handleiding](../portable-windows.md).

## Gerichte validatie

- `npm run test:service -- service/lifecycle.test.ts service/data-safety.test.ts`: **29 geslaagd, 1 overgeslagen**. Gerichte state-machine-, consent-, origin/token/instance-, stop/maintenance-, safe-cancel-, kritieke-restore- en bestaande dataveiligheidschecks. De bestaande grote streamingtest is bewust overgeslagen; geen brede opslag/editor-suite.
- `npm test -- src/projects/localSession.test.ts src/storage/backup.test.ts`: **15/15 geslaagd**, bestaande save-state/recovery- en browserbackup-write/abortcontracten.
- `npm run typecheck`, client-/serviceproductiebuild, C#-compiler en gerichte ESLint voor gewijzigde TS/TSX-onderdelen uitgevoerd. De launcher is C#, geen aparte TypeScriptlauncher.
- `tests/persistence/lifecycle.mjs`: **geslaagd** met de nieuwe package. Echte portable exe/gebundelde Node in testpad met spaties/é, bezette vreemde poort, dubbel launch, dezelfde datamap bij andere gevraagde poort, afwijzen oude pipe-generation/externe origin, runtime-generation bij restart, pending save vóór DB-close, behouden project na herstart, echte testservicecrash, foutstatus en herstel. Uitgebreide laatste proef controleert ook supervisorcrash, veilige weigering van overname, browsergestuurde orphan-stop en afzonderlijke datamap/poort. Het oudere launcher-testentrypoint verwijst nu naar dit script, omdat de eerste launcher voortaan blijft leven.
- `tests/persistence/lifecycle-browser.mjs`: **geslaagd**. Echte geïsoleerde Chrome-context op 1280×720. Mapbreedte gewijzigd en Stop vóór de 700 ms debounce; automatische flush, width 640 na procesherstart, geblokkeerde oude tab, browser-Storage-stop, geen browserruntimefouten. Het screenshot van de gestopte browser is visueel geïnspecteerd.
- Geen nieuwe npm-, tray- of IPC-dependency. Bestaande geïnstalleerde frameworkassemblies leveren UI/tekenen/pipes/mutex-ACL. Beveiligingsreview richtte zich op SID/netwerk-ACL, begrensde commando's, token/instance/origin-controles, diagnostische allowlist en geen automatische writer-kill. Een volledige npm-audit is hiervoor niet opnieuw uitgevoerd.

Bewijs staat uitsluitend in genegeerde `.sprint13-1.local`-testmappen. De eerdere succesvolle kernproef staat in `launcher-1790184997317/results.json`; browserbewijs in `browser-1790185220544/results.json` en `stopped.png`. Eindproeven: `launcher-1790186299095/results.json` en `browser-1790186374830/results.json`. Het laatste browserscreenshot is opnieuw geïnspecteerd. De afsluitoverlay is een echte modale HTML-dialoog zodat reeds geopende opslagdialogen en canvas-capture-shortcuts geen nieuwe edits achter de flushbarrière kunnen toelaten. De eerste uitgebreide supervisor-crashproef las alleen exitCode; Windows rapporteerde signalCode, waardoor de test onterecht bleef wachten. Na herstel van die test en gecontroleerde browser-stop van uitsluitend de eigen orphan-service slaagde de herhaling. Alle succesvolle proefservices worden via hun eigen lifecycle gestopt; een expliciete crashsimulatie raakt uitsluitend de zelf gestarte test-PID.

Tijdens ontwikkeling gevonden en hersteld: een te korte Windows-connect-timeout; een Stop die tijdens startup verloren kon gaan; de vroegere maintenance-gate die browser Stop blokkeerde; querystrings die de long-operation-gate konden omzeilen; een beslisdialoog die zijn barrier kon verliezen als werk intussen klaar was; documentbrede sneltoetsen tijdens de laatste browserflush. Een vroege browsertest startte vóór de vorige eigen diagnoseservice was afgesloten; strengere child-PIDcontrole voorkomt een vals health-resultaat. Mislukte runs worden niet als geslaagd geteld.

De aparte standaardbrowserproef (`tests/persistence/lifecycle-browser-open.mjs`, `browser-open-1790186079739/results.json`) is uitgevoerd: **ShellExecute gaf hier geen succes; fallback met lokale URL en gezonde service slaagde**. Automatische browseropening blijft dus niet bewezen. De nieuwe package `distribution.local/Mapweaver-Lifecycle` bevat client/service, compilergegenereerde traylauncher, icoon en handleidingen; SHA256 is gecontroleerd voor **4324 bestanden**. Oudere packages zijn niet vervangen.

## Handmatige Windows-acceptatie

| Gevraagde stap | Handmatige status | Aanvullend automatisch bewijs |
| --- | --- | --- |
| 1 Portable starten | Niet getest | Echte exe met eigen data/poort |
| 2 Systeemvakicoon zichtbaar | Niet getest | NotifyIcon/embedded icoon gecompileerd |
| 3 Automatische standaardbrowser | Niet getest | Werkelijke ShellExecute-failure en gezonde URL-fallback; geen automatische succesclaim |
| 4 Tabs sluiten, tray Open | Niet getest | Open-command via echte IPC; geen trayklikbewijs |
| 5 Tweede launch, één service | Niet getest | Child-PID blijft gelijk |
| 6 Stop, geen processen over | Niet getest | Eigen child/supervisor exit en listener weg |
| 7 Herstart, data intact | Niet getest | Opgeslagen testproject opnieuw gelezen |
| 8 Stop tijdens save | Niet getest | Browserflush vóór debounce en persistente herlezing |
| 9 Stop tijdens backup, dialoog | Niet getest | Jobcancel/state-machinechecks; geen dialoogscreenshot |
| 10 Restart en oude tab | Niet getest | Nieuwe instance; oude mutation geweigerd/tab geblokkeerd |
| 11 Servicecrash zichtbaar | Niet getest | IPC-status meldt exit; geen systeemvakscreenshot |
| 12 Pad met spaties | Niet getest | Echte package in `Portable package é` |
| 13 Settings-stop dezelfde flow | Niet getest | Echte Chrome-bediening Storage Stop |

De computer-use-skill is geprobeerd. Het eigen supervisorvenster en Windows-systeemvak werden niet als targetbare vensters aangeboden. Er zijn geen vervangende screenshots gefabriceerd en geen systeeminstellingen aangepast. Normaal traymenu, actieve-werkdialoog en crashstatus hebben dus **geen** geleverd screenshotbewijs. Dit houdt de volledige Definition of Done open.

## Grenzen en resterend werk

Windows-logoff/shutdown, fysieke stroomuitval, cross-account pipe-ACL-proef, daadwerkelijk onschrijfbare gebruikersdatamap, SmartScreen/antivirus, installercompile/install/uninstall en volledige native handmatige acceptatie: **Niet getest**. Er is geen nieuw framework geïnstalleerd. De Inno-configuratie verwijst naar dezelfde launcher en vraagt vóór uninstall een bevestigde `--stop --wait`; zonder ISCC-uitvoering is dat geen bewezen installerresultaat.

Het OS kan een notification-icon in overflow plaatsen en processen tijdens shutdown geforceerd beëindigen. SessionEnding/SIGINT/SIGTERM vragen een veilige drain, maar de applicatie kan geen onbeperkte flushperiode van Windows afdwingen. Bij een combinatie van gecrashte supervisor en onbereikbare browser blijft veilige overname bewust geweigerd; retain data/recovery en gebruik lokale technische diagnose. Er is geen automatische authenticatieovername of lockverwijdering. Browser-formulierconcepten blijven buiten het opgeslagen model tot Apply, conform bestaand gedrag.

## Hoofdonderdelen en externe acties

Nieuw: `service/lifecycle.ts`, `lifecycleLog.ts`, gerichte tests, `src/projects/lifecycleClient.ts`, `launcher/Mapweaver.ico`, lifecycle-browser/portableproeven en lifecycle-/portable-documentatie. Gewijzigd: native launcher/build/installerconfig, service/router/main/jobs, API-headers/autosave, Storage/ProjectControls, packagebuilder, README en security/troubleshooting.

Geen push, merge, release, publicatie, deployment, upload, signing, systeeminstallatie, permanente Windows-service of cloudwijziging. Echte gebruikersdatamappen en bestaande gebruikersprocessen zijn niet gestopt of gemigreerd. De nieuwe package staat afzonderlijk naast de behouden oudere packages.
