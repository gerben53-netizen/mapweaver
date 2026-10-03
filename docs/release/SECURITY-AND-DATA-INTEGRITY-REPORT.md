# Security en data-integriteit

23 september 2026 — Mapweaver 1.0.0, formaat 2, databaseschema 3. Geen gevonden open Critical/High na reparaties. Dit oordeel betreft de geteste lokale invoergrenzen en workflows.

## Onbetrouwbare afbeeldingen en archieven

`readImage` controleert bestandstype, 20 MiB, maximaal 8192 pixels per rand / 24 MP, gecodeerde dimensies en daadwerkelijke rasterdecode. Alleen PNG/JPEG/WebP zijn toegestaan. Een echte browser importeerde PNG plus gegenereerde JPEG/WebP, en sloeg SVG en corrupte PNG over zonder de geldige imports te verliezen. Bulkimport is sequentieel, maximaal 50 per opdracht; 200 bronnen zijn daarom in vier batches getest. React rendert namen/categorieën als tekst, geen HTML-injectiepad gevonden.

`zip.ts` controleert centrale en lokale ZIP-headers, toegestane paden, duplicate entries, offsets/ranges, entrycount, compressed/unpacked budgetten, ratio, CRC en werkelijke gedecomprimeerde bytes. ZIP64 en onbekende structuren worden afgewezen. Absolute paden, traversal en externe asset-URL's passen niet in de allowlist. Chunkverwerking bewaakt output tijdens decompressie; metadata alleen is niet voldoende om checks te omzeilen.

Gerichte tests dekken traversal, teveel entries, overgrote JSON-output, gewijzigde CRC/header, ontbrekende bytes, hashfouten, ongeldige laagreferenties, toekomstige versies, prototype-key, Infinity via JSON, opacity buiten bereik, dubbele object-/laagreferenties, SVG-MIME, externe assetpaden en ongeldige dimensies. Bestaande importtests dekken header-/decodefouten, grootte/pixelgrenzen en partiële batches. Een kwaadwillig archief is via de echte UI geopend: afwijzing met melding, exact hetzelfde actuele model behouden. Er is geen uitputtende ZIP-fuzzer of echte maximale RAM-uitputtingsaanval uitgevoerd; de begrensde en vervalste fixtures testen de relevante codepaden.

## Formaat, typen en opslag

ZIP roundtrip en save/open/save behouden objecten, lagen, volgorde, transformaties en originele bytes. Gedeelde bronbytes worden één keer opgenomen. Na openen in een schoon browserprofiel zijn projectassets beschikbaar zonder algemene bibliotheek. Assettypen worden bij parser, repository, picker, plaatsing en vervanging bewaakt. Tijdelijke viewport/selectie/clipboard/history worden niet opgeslagen.

Gemengde v1 stamp/pattern-assets migreren naar afzonderlijke logische v2-typen met gedeelde bytes. DB2→3 behoudt metadata/blobs, maakt vereiste referenties en is idempotent bij heropenen. Een nieuw regressiescenario verwijdert verplichte recovery-brondata vóór upgrade: de hele upgrade faalt en de originele DB2-metadata/recoverydocumenten blijven intact. Dit is met fake-indexeddb getest; een browserupgrade van een echte oude installatie is niet uitgevoerd.

MW-AUD-003/010 voorkomen dat editoracties buiten persistente geometrie-, count-, resource- en metadatabudgetten committen. De archiefparserlimieten veranderen niet. Editorreserve: 124 MiB unieke bronbytes plus maximaal 4 MiB JSON; maximaal 3 MiB groeiende model-JSON zodat manifests/header passen. Bestaande grotere geldige bestanden blijven laadbaar en verkleinen blijft mogelijk. Bronbudgetten dedupliceren op hash.

MW-AUD-004 voorkomt vertraagde imports naar een inmiddels vervangen project. MW-AUD-009 koppelt 'saved' aan de juiste afgeronde autosaverevisie en toont pending al in het debouncevenster. Browserreload herstelt het verwachte laatste model. Unit/integratietests bewijzen dat pointerpreviews niet naar opslag schrijven, wijzigingen gebundeld worden en gesimuleerde quota-/schrijffouten de werkstaat behouden met waarschuwing. Echte fysieke schijf-/quota-uitputting is niet opgewekt. Recovery bewaart maximaal vijf projecten; wissen is bevestigd en projectassets worden afzonderlijk beheerd. Verwijdering van gebruikte bibliotheekassets controleert project, history, clipboard/tool en recovery; geen force-delete.

Een gestarte browserdownload kan niet bewijzen dat het OS de uiteindelijke disk-write heeft voltooid. De UI-clean-point volgt downloadstart; README vermeldt dit. Browseropslag kan door de gebruiker of browser worden gewist. Recovery blijft een herstelvoorziening, geen vervanging van backups.

## Dependencies, privacy en bestanden

`npm audit --json --cache .npm-cache`: **0 kwetsbaarheden**; 15 productie- en 259 developmentdependencies, 273 totaal volgens npm-metadata (categorieën overlappen). Een afzonderlijke `npm audit --omit=dev --json --cache .npm-cache` bevestigt eveneens 0 kwetsbaarheden voor productie (exit 0). De nieuwe Playwright/axe-tools zijn alleen development. Geen `npm audit fix`, major upgrade of automatische update uitgevoerd. `npm outdated --json --cache .npm-cache` rapporteerde alleen TypeScript 7.0.2 tegenover geïnstalleerd/wanted 6.0.3; informatief behouden.

Directe productiepackages: Dexie Apache-2.0; fflate, Konva, React, ReactDOM, react-konva en Zustand MIT. Geen duidelijke licentieblokker bij deze directe packages; geen volledige juridische/transitieve licentiecertificering geclaimd.

Geen productiegebruik van fetch, XHR, beacon, eval of dangerouslySetInnerHTML aangetroffen. De productiebrowserproef registreerde 11 lokale requests, nul externe HTTP-verzoeken en nul runtimefouten. Geen accounts, telemetrie, upload of cloud toegevoegd. npm-registryraadplegingen en browserdownloads dienden alleen de lokale audittooling.

Er was geen commit om op secrets te scannen: alle oorspronkelijke bestanden waren untracked. `.gitignore` sluit node_modules, dist, npm-cache, buildinfo, coverage en `*.local` uit. Fixtures, lokale browserprofielen, databases, screenshots en downloads staan onder genegeerde scratchpaden; er is niets gestaged of gepubliceerd. Geen persoonlijke testdata gebruikt. Een lichte lokale patroonscan op gangbare private-key/API-keyvormen vond geen match in niet-genegeerde projectbestanden; dit is geen volledige secrets-certificering.

## Resterende grenzen

Firefoxlaunch geblokkeerd; geen compatibility-pass toegekend. Exacte geheugendruk onder langdurig gebruik, maximale 128 MiB-archieven op zwakke hardware en fysieke quota-uitputting blijven buiten bewezen dekking. Deze beperkingen worden niet verstopt achter een globale coveragewaarde. Relevante testcommando's en herhaalbare fixtures staan in [TEST-REPORT](TEST-REPORT.md).
