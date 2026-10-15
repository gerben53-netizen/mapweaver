# Reproductie en auditcode

De zelfstandige reproductieroute is het openen van de vier `example.mapweaver`-archives in Mapweaver. Zij bevatten de daadwerkelijke projectdata en gebruikte PNG-bronnen; geen volledige gebruikersbibliotheek of persoonlijke database is nodig. Volg de instructies naast elk archive. Generated Wall-assets worden door de geteste Mapweaver-versie geleverd.

De hier bewaarde scripts zijn de exacte technische authoring-/proofbron van deze audit. Ze zijn **geen productwijziging, nieuw editorfeature of vervangende renderer**. `editor.tsx` importeert de gewone App en gebruikt de bestaande projectcodec en exportfunctie. Alleen de herkenbare QA-strip is toegevoegd. De vier eindexports zijn daarnaast via de gewone UI gedownload en op hash vergeleken.

Voor het opnieuw uitvoeren van de oorspronkelijke auditrunner vanuit de repositoryroot:

1. Controleer bestaande instances en poorten. Gebruik uitsluitend een expliciete geïsoleerde QA-root. Start nooit deze testworkflow met de Primary-root als schrijflocatie.
2. Kopieer de auditcode naar `.qa.local/production-audit/`. De scripts verwachten bewust dat ignored scratchpad.
3. `seed.mjs` leest de actuele OS-gebruikersroot read-only, maakt een consistente SQLite-backup en kopieert originals/previews. Het maakt lokaal `assets.json` met de feitelijke opslagmetadata. Dat volledige lokale bronbestand en de database zijn niet opgenomen in deze commit. Gebruik voor een identieke historische proef de reeds geleverde archives; toekomstige bibliotheekwijzigingen kunnen een nieuwe authoring-run andere bronnen laten vinden.
4. `node .qa.local/production-audit/build.mjs`, gevolgd door **eenmaal** `node .qa.local/production-audit/refine.mjs`, bouwt met bestaande domeinfuncties de native objecten en valideert ze met `parseProject`. Nieuwe runs krijgen nieuwe kaart-ID's. `refine.mjs` is een compositionele authoringstap, geen idempotente productmigratie; voer hem niet herhaald op hetzelfde resultaat uit.
5. Start de bestaande backend met `MAPWEAVER_RUNTIME_PROFILE=qa`, een absolute `MAPWEAVER_DATA_DIR` naar de kopie, `MAPWEAVER_PORT=49521` en `MAPWEAVER_DEV_ORIGIN=http://127.0.0.1:49522`. Deze poorten moeten vrij zijn. Er wordt geen service- of runtimecode aangepast.
6. `npx vite --config .qa.local/production-audit/vite.config.mjs` start uitsluitend de eigen auditfrontend op49522. Open `/.qa.local/production-audit/index.html`. De kleine receiver schrijft alleen expliciet begrensde bewijsnamen binnen de auditmap.
7. Open elke kaart via de QA-strip, wacht op READY en klik Fit. Maak echte browserscreenshots. Voor Battle: Voorbeeld → opgeslagen ARL C; kies100/75/50% in de auditstrip. Dat wijzigt de normale viewportstore, geen kaartgeometrie.
8. Export proof + roundtrip gebruikt `exportPng`, `gatherProject`, `encodeProject`, `decodeProject`, `applyPrepared` en opnieuw `exportPng`; het vergelijkt PNG-SHA-256. Doe daarnaast Export PNG → Download PNG met dezelfde opties, en vergelijk de bytes. De receiver is alleen opslag van bewijsbytes, geen renderer.

`inventory.mjs` gebruikt QA-readqueries met volledige paginering en leest de gekopieerde originals. `verify.mjs` controleert gebundelde resourcebestanden. De hoofdrapporten beschrijven de daadwerkelijk uitgevoerde controles en hun grenzen. Publieke referentiebeelden zijn niet in deze repository opgenomen en mogen niet als kaartachtergrond voor de bewijskaarten worden gebruikt.

Laatste native authoringstap: voer na refine.mjs eenmaal scale-battle.mjs uit. Deze stelt de battlemap op 70×50ft bij 100px per 5ft in; de opgeslagen muur-schaalreferentie gebruikt 20px/ft. De uiteindelijke archives zijn leidend.
