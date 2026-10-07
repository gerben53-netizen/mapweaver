# Runtime en data roots

## Primary Development

Start vanuit de repository met `npm run dev`. De canonieke interactieve omgeving gebruikt de bestaande persistente OS-gebruikersopslag: op Windows `%LOCALAPPDATA%/Mapweaver`. De database en geïmporteerde originals/previews blijven buiten builds, QA en Git. De frontend gebruikt standaard poort 49182 en de service 49181. De standaardstart maakt geen `.development.local`-dataset meer aan.

Een optionele ignored `.runtime.local/primary.json` kan `directory` (absoluut), `servicePort` en `clientPort` machine-lokaal vastleggen. Gebruik dit alleen na bewezen primary-selectie en volledige backup. Zonder configuratie wordt de OS-gebruikersopslag gebruikt. Een afwijkende `MAPWEAVER_DATA_DIR` wordt bij de primary-start afgewezen; zo kan een oude shellvariabele niet stilzwijgend een andere bibliotheek selecteren.

De launcher controleert de backendpoort vóór starten. Bij een bestaande service meldt hij de draaiende instance; er wordt geen tweede writer gestart. De bestaande kernel-lease beschermt dezelfde dataset ook over verschillende poorten. Er bestaat momenteel geen aparte one-click Dev launcher. Een eventuele toekomstige launcher moet ditzelfde npm-commando en profiel gebruiken.

Vite scant dependencies vanuit uitsluitend het applicatie-entrypoint `index.html`. Lokale HTML-proofs onder QA- en deliverabledirectories zijn geen extra applicaties; zij mogen de normale startup niet vertragen door automatische entrypoint-discovery. Expliciet geopende authoring-/proofpagina's blijven bereikbaar.

## QA, tests en release

QA gebruikt `MAPWEAVER_RUNTIME_PROFILE=qa` met een expliciete absolute geïsoleerde `MAPWEAVER_DATA_DIR` en aparte poorten. Tests gebruiken profiel `test` en een eigen tijdelijke root. Ontbrekende QA/test-root of een verwijzing naar Primary Development veroorzaakt een startupfout. Vitest-storage weigert bovendien de normale gebruikersroot. Bestaande QA-scripts met expliciete development origin worden als QA behandeld wanneer zij nog geen profiel leveren. Gebruik voor nieuwe QA-scripts altijd het expliciete profiel.

`npm start` en de Windows-release blijven de OS-gebruikersroot gebruiken, tenzij de release bewust een expliciete veilige data directory krijgt. Release gebruikt geen developerconfig. Bestaande alternatieve roots blijven behouden; ze worden niet automatisch samengevoegd of verwijderd.

## Asset Library

De logische authoringbibliotheek combineert persistente user imports en gebundelde production-content. Generated Walls en terrain-textures blijven immutable publieke resources; die PNG's hoeven niet naar de gebruikersdatabase gekopieerd te worden. De allowlist in `docs/distribution/default-content.json` bepaalt de standaard importeerbare packs. Primary-start voegt ontbrekende packassets toe via de gewone gevalideerde packimport met duplicate-policy `keep`; bestaande IDs, metadata en kwaliteitsstatus blijven behouden. Per-pack receipts maken herstart idempotent. Een bewust inactive/REPLACE asset wordt niet opnieuw actief gemaakt.

Stampfamilies hebben één pickeritem met concrete opgeslagen varianten. Maptype, zoekopdracht, categorie en lifecycle bepalen zichtbaarheid. Oude kaarten kunnen inactieve assets nog op ID resolven. Interactieve imports komen uitsluitend in de asset store van de verbonden Primary Development-service terecht en overleven een restart.

De permanente production-integratieregel staat in `AGENTS.md`, sectie 17. Artwork dat alleen in QA of toekomstige installercontent staat, voldoet niet aan eindacceptatie.

## Identiteit, diagnose en backup

Development toont in de bovenbalk `DEV — <branch> @ <commit> · Data: Primary Development` of `Data: QA/Test`. Volledige paden staan niet in de UI. Directe en Vite-proxied `/api/v1/health` moeten dezelfde `dataKey`, instance en generation tonen. Health bevat profiel, buildidentiteit en schemaversie. Lokale startupdiagnostics geven runtime-, data- en asset-rootidentiteit; deel die niet als publieke telemetry.

Bij een onverwacht lege bibliotheek: vergelijk health en de logische identiteit, controleer bestaande processen en de ignored configuratie. Start geen andere database om het probleem te verbergen. Een geïsoleerde QA-root heeft doorgaans andere kaarten en assets dan de persistente user root.

Maak vóór rootselectie/contentwrites een volledige backup met consistente SQLite-snapshot, originals, previews, media en lokale configuratie. Live SQLite wordt met de SQLite backup API gekopieerd, niet als los live databasebestand. Deze sprint bewaart de backup en inventaris in `deliverables.local/Runtime-Data-Roots-Audit/`; absolute machinepaden blijven uitsluitend in ignored bewijs. Geen automatische reset, merge, migratie van ambigue user content of cleanup.
