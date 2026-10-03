# UX, toegankelijkheid en prestaties

23 september 2026. Chromium 153.0.8010.12, geïsoleerd headless Windows. Browserinteracties zijn geautomatiseerd; screenshots en exports zijn daarna visueel beoordeeld. Geen claim van een volledige screenreaderaudit.

## Visuele beoordeling

Screenshots staan lokaal in `.audit.local/screenshots/`; namen beginnen met onderstaande nummers. Deze gegenereerde bestanden zijn bewust genegeerd door Git.

| Bewijs | Observatie |
|---|---|
| 01-editor-1280 | Canvas domineert, header/toolrail/inspector overlappen niet; kaart is begrensd en de lege tekst geeft een eerste actie. |
| 02/03-library-stamps/patterns | Gescheiden typen met zoek-/categoriefilters, importactie en details. Geen schijnknoppen. |
| 04/06 stamp-/pattern-picker | Modal past op 1280×720, zoekfocus zichtbaar, Cancel/Choose onderaan bereikbaar; geen projectmutatie bij Escape. |
| 05-selected-stamp | Groene transformgrepen plus duidelijke properties; schaal/rotatie/spiegeling daadwerkelijk uitgevoerd. |
| 07-selected-pattern | Rechthoek/selectie en patroon zichtbaar; eigenschappen scrollen zelfstandig. Lange decimalen blijven een Low-bevinding. |
| 08-layers / 09-map | Compacte lagen en contextacties, instellingen blijven via paneelscroll bereikbaar. |
| 10-recovery-resumed / 11-editor-1920 | Herstelde en schoon geopende kaart tonen dezelfde inhoud; bij 1920×1080 krijgt extra ruimte vrijwel geheel het canvas. |
| 12-invalid-file / 20-import-errors | Afwijzing met begrijpelijke melding en behouden kaart; geldige batchitems blijven beschikbaar. |
| 13-heavy-1920 / 14-heavy-1280 | Zware kaart blijft begrensd en panels blijven bedienbaar; prestatiebeperking apart hieronder. |
| 15-200-percent | 640×360 CSS-reflowproxy voor 200% op 1280×720: header kan horizontaal scrollen, export en Fit bereikbaar; document blijft 640 px breed. De kaart is na Fit volledig in de kleine werkruimte. |
| 16-library-200-search / 17-picker-200 | Zoeken en scrollen werken met 200 afbeeldingen; zichtbare thumbnails laden. Kleine 16px-fixtures blijven kleine kleurvlakken binnen het thumbnailvak. |
| 18-layers-256 | Laatste laag bereikbaar via scroll; extra laag geweigerd op maximum, bestaand model blijft intact. |
| 21-long-names-categories / 22-long-name-picker | Twintig lange categorieën en een naam van circa 112 tekens breken layout niet. Ellipsis in kaartjes, volledige naam in invoerveld/toegankelijke naam. |

PNG 1×/2× en transparante export zijn bekeken: uitsluitend kaartinhoud, geen toolbar/selectiegrepen. Programmatic checks meten exacte afmetingen (900×600 en 1800×1200) en alpha 0/255 aan een lege kaarthoek. Repeat/stretch, rotatie, spiegeling, hidden/locked-lagen en gridvolgorde worden tevens door scene-/adaptertests bewaakt; geen uitputtende perceptuele pixelvergelijking geclaimd.

## Toegankelijkheid en keyboard

Axe op editor en grote picker: **0 overtredingen** in de onderzochte staten. Labels voor icon buttons, tabs/dialogs en zichtbare focus zijn gecontroleerd. Selectie gebruikt grepen en properties naast kleur. Browserproeven dekken Escape met gevulde zoekinput, terugkeer naar trigger, Tab binnen modal, Space loslaten, tekstveld-undo en editor-sneltoetsen. Native dialog houdt de achtergrond inert. De focusfout MW-AUD-008 is gerepareerd.

De hoofdworkflow vraagt voor canvasplaatsing/slepen nog een pointer; numerieke invoer en knoppen bieden andere handelingen via toetsenbord. Er is geen screenreadertest, complete Tab-volgordeinventaris of aparte contrastmeting voor ieder disabled/canvaspixel uitgevoerd. Axe vervangt deze niet. Native 200%-browserzoom is niet bediend; CSS-reflow is het wel uitgevoerde deelbewijs. Geen bekende kernworkflowblokkade bij 1280×720.

## Prestatiemethode en resultaten

Synthetische 1600×1000-kaarten met gedeelde originele bronnen, zichtbare/verborgen/vergrendelde lagen en repeat/stretch-patronen. Tijden hieronder in **ms**, inclusief Playwright-input, synchronisatie en asserties. Pan+zoom bevat 15 muisstappen plus wielactie; sleep bevat 10 muisstappen. Dit zijn workflowduren, geen zuivere frametimes, FPS of gegarandeerde latency. De meting is lokaal en beschrijvend; geen verzonnen SLA.

| Objecten / lagen / patronen | Open | Pan+zoom | Selectie | Sleep | Laag+undo | Edit+undo | Wacht autosave | Save | PNG 1× / 2× | Bestand |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20 / 2 / 2 | 257 | 376 | 103 | 382 | 143 | 161 | 1381 | 182 | 207 / 265 | 14,055 B |
| 100 / 8 / 5 | 440 | 500 | 137 | 535 | 193 | 217 | 1388 | 200 | 241 / 297 | 26,291 B |
| 1000 / 8 / 20 | 1432 | 1348 | 397 | 1749 | 418 | 507 | 853 | 234 | 337 / 471 | 159,499 B |


Initiële ontwikkelpagina tot canvas zichtbaar: 713 ms. De aparte productieproef inclusief openen van 100 objecten en export kostte circa 854 ms (andere flow, niet rechtstreeks vergelijken). Import van 200 kleine PNG's in vier batches: 11.20 s. Openen van de 200-itempicker tot de gevraagde kaart aanwezig is: 157 ms; daarna expliciet gewacht op de zichtbare thumbnail vóór screenshot. Zoeken bleef bruikbaar.

20/100 objecten geven een bruikbare hoofdworkflow in de testomgeving. Bij 1.000 objecten nemen selectie en vooral de reeks pan-/sleepacties duidelijk meer tijd in beslag: MW-AUD-011 Medium/Deferred. Er is geen crash of corruptie waargenomen. Een profiler is nodig om renderkosten, history-serialisatie en headless-inputkosten te scheiden; daarom geen ongefundeerde optimalisatie of brede refactor. Claim geen vloeiende bediening tot de opslaglimiet van 10.000 objecten.

Autosave-wachttijd begint na de laatste gecontroleerde actie en kan deels overlappen met browserasserties; geen zuivere schrijfduur. Het schema gebruikt één seconde debounce. Unit-tests bewijzen één write na een reeks afgeronde wijzigingen en geen writes tijdens pointerpreviews; het browsermodel na reload is exact vergeleken.

## Geheugen en bundel

Instrumentatie van createObjectURL/revokeObjectURL telde tijdens project-/PNG-downloads tijdelijk 6–12 actieve URLs. Na openen van een leeg project en 31 seconden wachten: **0 actief**. Downloads hebben bewust een 30-secondenlease. Image-cache-unit-tests bewaken gedeelde decode, refcounts en release tijdens async decode.

Chromium `performance.memory.usedJSHeapSize` rapporteerde telkens grofweg 31,2 MB; dit is een gekwantiseerde, onvoldoende fijnmazige waarde en geen bewijs dat iedere native/GPU-allocation vrij is. Geen onbeheerst groeiend URL-aantal gezien in deze cyclus. Langdurige RSS/GPU-profielen en honderden unieke grote bronafbeeldingen zijn niet gemeten; drie hoofdfixtures delen kleine bronnen. Hiermee is geen algemene lekvrijheidsclaim mogelijk.

Productiebundel (kB / gzip kB): React 347,69 / 106,94; Konva/canvas 146,38 / 44,84; storage 111,86 / 38,85; app 115,30 / 36,17; export-render 2,62 / 1,24; runtime 0,71 / 0,42; CSS 15,05 / 3,81. Er zijn afzonderlijke vendor-/renderchunks; de audittools zitten niet in de productie-importgraph. Geen bundlewarn. Zie [backlog](POST-V1-BACKLOG.md) voor de drie uitgestelde product/onderhoudsbevindingen en Firefox-verificatie.
