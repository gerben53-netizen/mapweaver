# Testverslag — 23 september 2026

## Resultaat

Volledige eindronde: **157/157 Vitest-tests geslaagd, 0 mislukt, 0 overgeslagen**, verspreid over 25 bestanden. TypeScript/build en lint exit 0. **7/7 Chromium-E2E geslaagd**, 0 overgeslagen, retries uitgeschakeld. De volledige kernworkflow slaagde daarnaast driemaal achtereen op ongewijzigde productiebron. Productie-preview: openen van 100-objectproject en echte PNG-download zonder runtimefouten.

## Commando's en metingen

Tijden zijn wall-clock waar expliciet gemeten; baseline zonder timer wordt niet achteraf van schijnprecisie voorzien. Exitcodes staan apart van functionele beoordeling. npm-outdated exit 1 betekent beschikbare updates, geen applicatiefout.

| Commando | Duur | Resultaat / exit |
|---|---|---|
| `npm test -- --reporter=json --outputFile=.audit.local/baseline-tests.json` | circa 14,66 s uit runner-JSON | 123 pass / 26 fail / 0 skip, exit 1 |
| `npm run typecheck` (baseline) | >10 s; exacte commandduur niet vastgelegd | `tsc -b` geslaagd, exit 0 |
| `npm run lint` (baseline) | >10 s; exacte commandduur niet vastgelegd | 19 no-undef in `.qa.local` generators, exit 1 |
| `npm run build` (baseline) | >10 s; Vite-deel 405 ms | typecheck + build geslaagd, exit 0 |
| `npm audit --json` (baseline) | 7,07 s toolmeting | 0 kwetsbaarheden, exit 0 |
| `npm outdated --json` | 6,52 s | EPERM standaard-npm-cache, exit 1 |
| `npm outdated --json --cache .npm-cache` | niet apart gemeten | alleen TypeScript 6.0.3 → latest 7.0.2; exit 1, geen upgrade |
| `npm install -D @playwright/test --ignore-scripts --cache .npm-cache` en idem `@axe-core/playwright` | niet apart gemeten | 3 + 2 devpackages toegevoegd; geen bestaande upgrades, 0 auditmeldingen |
| `npx playwright install chromium firefox` met lokale browserpath | circa 2 minuten | binaries geïnstalleerd; Firefoxlaunch later geblokkeerd |
| `node scripts/audit-fixtures.mjs` | circa 0,76 s | synthetische PNG/ZIP-fixtures, exit 0 |
| `npm test -- --reporter=json --outputFile=.audit.local/final-tests.json` | 13.58 s | 157 pass / 0 fail / 0 skip, exit 0 |
| `npm run lint` (eindronde) | 6.85 s | 0 fouten / 0 waarschuwingen, exit 0 |
| `npm run build` (eindronde) | 13.72 s; Vite-deel 448 ms | `tsc -b && vite build`, exit 0 |
| `npm audit --json --cache .npm-cache` | 1.39 s | 0 kwetsbaarheden, exit 0 |
| `npx playwright test --project=chromium` | 96,84 s | 7 pass / 0 fail / 0 skip, exit 0 |
| `npx playwright test release.spec.mjs --project=chromium --repeat-each=3` | 55,1 s; drie cases circa 17 s | 3 pass / 0 fail / 0 skip, exit 0 |
| `npx playwright test performance.spec.mjs smoke.spec.mjs` (eerder) | circa 60 s | Chromium smoke pass; trace-outputconflict in parallelle testinvocaties; Firefox launch timeout. Exit 1, behouden als mislukte tussenrun |
| `npm run preview -- --port 5181 --strictPort` + `node .audit.local/production.mjs` | browserflow 854 ms | gebouwde app, 100 objecten, echte PNG-download; exit 0 |
| Formatcheck | n.v.t. | geen bestaande formatcheck aanwezig; niet toegevoegd |

Waarschuwingen: npm meldt een beschikbare npm-major; Playwright meldt NO_COLOR/FORCE_COLOR-conflict. Beide zijn omgevings-/updateberichten. Geen productiebuildwaarschuwing of vastgestelde runtimefout in de geslaagde browserflows. De finale build voert TypeScript uit; daarom geen redundante losse typecheck nodig.

## Dekking en regressies

De oorspronkelijke 149 testgevallen blijven inhoudelijk behouden; acht tests zijn toegevoegd voor concrete risico's: geometrie, projectwissel tijdens import, resourcebudget/deduplicatie, object/laaglimieten, metadatareductie/rollback, autosaverevisie, onbetrouwbare JSON en mislukte DB-migratie. Het bestaande modalfocusscenario gebruikt nu ook een gevulde zoekinput. Obsolete DnD-tests zijn omgezet naar actuele click-to-place met schaal/pan/bounds/cancelgevallen. Legacy-formaatfixtures verwachten de centrale v2-migratie; typeguardchecks zijn behouden.

Vitest dekt viewport/coördinaten, snapping/resizen, pattern settings, selectie/transformaties, groepsacties, history/branch/clean-point/limiet, imports, image-cache-releases, opslag, migratie en exportscene. Echte browserflows gebruiken DOM/muis/toetsenbord; Vite-store-reads dienen uitsluitend als assertie-orakel en veranderen geen productiestaat.

De zeven browserproeven combineren: complete editor/recovery/portable/exportflow; 200 assets/256 lagen; Space-pan/multiselect/textundo/resizewaarschuwing/Open-annulering; lange namen/20 categorieën; echte PNG/JPEG/WebP en foutieve imports; 20/100/1.000-objectprestaties; portable-project-smoke. Bij export worden echte PNG-headers, alpha en Roll20-dimensietekst gecontroleerd en PNG's visueel bekeken. Unit-scenechecks bewaken verborgen/vergrendelde lagen, volgorde, clipping, transparante kaartkleur met achtergrond en afwezigheid van editor-UI. Geen claim van pixel-perfect golden-imagevergelijking voor iedere transformatie.

Bestaande coverageprovider ontbreekt. Geen percentage gemeten of verzonnen; ontbrekende kritieke paden zijn met gerichte regressies en E2E aangepakt, geen tests voor aantallen toegevoegd.

## Browsermatrix en betrouwbaarheid

| Browser | Status | Bewijs / beperking |
|---|---|---|
| Chromium 153.0.8010.12, headless Windows | Pass | 1280×720 / 1920×1080; 7 E2E; herhaalflow 3×; productie-preview |
| Firefox 155.0 volgens geïnstalleerde application.ini, Playwright build 1543 | Blocked | proces gestart, launch-handshake >15 s; geen applicatieflow uitgevoerd, geen runtimeversiecertificering |
| Persoonlijke Chrome/Edge-profielen | Not tested | bewust niet gebruikt; geen toegang tot persoonlijke projecten |
| Safari / mobiele browsers | Not applicable voor deze desktop-audit | geen algemene compatibiliteitsclaim |

Tussenruns bevatten echte gevonden productdefecten en testharnessproblemen. Eén herhaalreeks gaf 2/3 pass en een detached-element-timeout terwijl Vite/HMR de pagina herlaadde; deze instabiele run staat in `.audit.local/repeated.log`. Na bronfreeze: 3/3 pass. De serverlogs toonden vervolgens ook reloads door Playwright-trace-HTML; MW-AUD-014 sluit auditmap/cache uit van de watcher. Een extra browserprobe schreef driemaal HTML en observeerde 0 navigaties (exit 0). De volledige eindronde is na deze configuratiefix opnieuw uitgevoerd. Er waren ook verouderde selectors, een importbatch groter dan de gedocumenteerde 50, een per ongeluk vergrendelde fixturelaag en Vite-module-URLverschillen bij HMR. Deze zijn als testproblemen gecorrigeerd, niet door assertions weg te laten. Twee gelijktijdige Playwright-invocaties deelden output en veroorzaakten ENOENT-traces; eindrondes draaien sequentieel. Geen automatische retries, skips of verborgen verwachte failures gebruikt. De laatste runner meldt 0 flaky; dat wist eerdere instabiliteit niet uit.

## Reproductie en nog niet uitgevoerde controles

```powershell
npm install
npm run audit:fixtures
$env:PLAYWRIGHT_BROWSERS_PATH="$PWD\.audit.local\browsers"
npx playwright install chromium
npm run dev -- --port 5180 --strictPort
# Tweede terminal, zelfde PLAYWRIGHT_BROWSERS_PATH:
npm run test:e2e
npm test
npm run lint
npm run build
```

Fixtures/exports/logs/screenshots staan genegeerd onder `.audit.local`; grote gegenereerde data worden niet geversioneerd. Geen productiecode wijzigen terwijl E2E loopt. Voor Firefox: browser installeren met dezelfde path, daarna `npx playwright test --project=firefox`.

Exact aanvullend handmatig schema (Not tested): start productie-preview in werkende Firefox; maak project, importeer stamp/pattern, plaats/beweeg/undo, download/open in schoon profiel, exporteer 1×/2× en vergelijk. Stel echte browserzoom 200% in bij 1280×720, Tab langs New/Open/Download/Export en inspector, open beide pickers en sluit met Escape. Controleer met screenreader namen/focus en foutmeldingen. Forceer alleen in een wegwerpomgeving opslagquota-uitputting en controleer waarschuwing plus behouden model. Voer langdurige geheugenprofielmeting uit na 50 project-/exportcycli. Geen van deze uitbreidingen is als Pass geboekt.

Aanvullende visuele hercontrole: `npx playwright test additional.spec.mjs --project=chromium` met expliciete wait op de gescrollde thumbnail: 3 pass / 0 fail / 0 skip, 27,1 s, exit 0. Dit voorkomt dat een screenshot van lazy-loading placeholders als voltooide afbeelding wordt beoordeeld.

Afzonderlijke productiecontrole: `npm audit --omit=dev --json --cache .npm-cache`, 1.37 s, exit 0, 0 kwetsbaarheden. Reportlinks gecontroleerd: geen ontbrekende lokale doelen. Eindhashes staan in `.audit.local/final-sha256.json`.

Windows-harnessbeperking bij MW-AUD-014: een automatisch door Playwright gestart Vite-proces bleef tijdens teardown hangen nadat alle zeven testcases geslaagd waren. De run is onderbroken en niet als voltooide groene commandrun geboekt. De server wordt daarom nu expliciet vóór de suite gestart en daarna apart gestopt; de finale commandrun is met deze lifecycle opnieuw uitgevoerd. Een voortijdig gestarte herhaalrun is eveneens afgebroken; die telt niet als 3/3-bewijs.

De finale browser-JSON met alle zeven cases is afzonderlijk bewaard als `.audit.local/full-e2e-final.json`; gerichte herhalingen mogen het standaardreport overschrijven zonder dit bewijs te verliezen. Vite draait voor deze eindronde afzonderlijk, zodat de runner volledig met exit 0 afsluit.

Na de watcher-/serverlifecyclefix is de kernworkflow opnieuw driemaal uitgevoerd: 3/3 pass, 0 fail/skip, 55,1 s, exit 0. Dit is de laatste gerichte stabiliteitsronde.
