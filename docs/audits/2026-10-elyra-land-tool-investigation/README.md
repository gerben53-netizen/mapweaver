# Elyra — Land Tool / contouronderzoek

Uitgevoerd 16 oktober 2026 op branch `codex/elyra-world-reproduction`, uitgangsrevisie `a23b5a84a5b632810dc7e1ee5b1ad5fd439c9088`. Geen productcode gewijzigd. [Vergelijk de tien echte native PNG-exports](index.html); [alle meetgegevens](metrics.json); [validatie en exporthashes](validation.json).

## Oorzaak van de oorspronkelijke polygonale landmassa's

De Elyra-reconstructie gebruikte een authoringscript dat handmatig gekozen punten rechtstreeks aan `createArea` gaf. Northreach/Westmere heeft **65 hoekpunten**, verbonden door rechte segmenten. `land.role='landmass'` maakt dat semantisch land, maar verandert de puntgeometrie niet automatisch. Het script zette `coastline.roughness=1.3` en `step=8`, zonder `applyLandStroke`, `editContour` of Freehand te gebruiken. De vijf oorspronkelijke TerrainStroke-acties kleurden de ondergrond, niet de kust.

Dit was een **onvoldoende authoring-/gereedschapskeuze in de reproductie**. Het was niet noodzakelijk om bestaande organische Land-functies te omzeilen. Het eerdere rapport mag daarom niet als bewijs worden gelezen dat Mapweaver alleen grove landpolygonen kan maken. Ook alle organische Land-resultaten zijn intern polygonen: het onderscheid is hun vorm, puntverdeling en bewerkingsmethode, niet een andere objectsoort.

## Feitelijke mogelijkheden

| Methode | Wat gebeurt werkelijk? | Geometrie of uiterlijk? | Beperking / conclusie |
|---|---|---|---|
| **Land / Water → Add / Remove** | Union/difference van geïnterpoleerde brush-footprints. Round, Organic, Jagged, Island, Peninsula, Coastline Detail en Hexagon. Vormt eilanden, schiereilanden, baaien en gaten. | Echte native landgrens, inclusief vulling/clipping. | Bestaand en bruikbaar. Organic is een begrensde 48-punts noisy footprint; zes brede streken geven nog zichtbare lobben, geen automatische premiumkust. Meer kleine Add/Remove-bewerkingen blijven nodig. |
| **Area → Freehand** | Registreert de getekende contour, vereenvoudigt met RDP op 1,5 kaartpixel en bewaart rechte polygonsegmenten. | Echte geometrie. | Geen automatische spline of organische kustgenerator. Een organisch getekende lijn kan organisch blijven; dezelfde hoekige input wordt niet vanzelf vloeiend. De proef gebruikt bewust dezelfde dicht bemonsterde lijn om dit te isoleren. |
| **Area → Coastline Roughness** | Seedgestuurde normale verplaatsing van tussensamples, maximaal 40 kaartpixels; oorspronkelijke hoekpunten blijven staan. | Alleen afgeleide kuststroke/halo. **Niet** landvulling, selectiedoel of clipping. | Hogere waarde geeft hier losse zaagtandlijnen buiten/binnen de vulling. Geen oplossing voor grove hoofdsilhouetten. Dit is expliciet gedocumenteerd gedrag, geen aangetoond defect. |
| **Area → Preview smooth** | Laplacian-achtige verschuiving van bestaande punten, amount 0–50, met preview/apply. | Echte geometrie; puntental blijft gelijk. | Verzacht hoekigheid, maar kan baaien en oppervlakte verliezen. UI-default is 2; proef is bewust sterker: 3×25. Geen automatische microkustdetails. |
| **Land / Water → Smooth Coast** | Lokale, gedensificeerde paired positive/negative Laplacian-passes met falloff. | Echte geometrie. | Minder krimp dan de globale contourbewerking; weigert >3% oppervlakteverandering per stroke. Eén passage is subtiel en wist niet iedere grote hoek. |
| **Land / Water → Roughen Coast** | Densificeert de kust onder de brush en verplaatst punten met ruimtelijke noise/falloff. | Echte geometrie. | Anders dan Area Coastline Roughness. Behoudt grotendeels de hoofdvorm; voegt beperkte lokale variatie toe. Grote hoekige uitgangsvormen blijven herkenbaar. |
| **Terrain Brush** | Paint / Erase / Blend wijzigen opgeslagen visuele maskertegels voor terreintextuur/kleur. | Alleen uiterlijk; geen land/waterclassificatie. | Kan harde kleurvlakken verbeteren, maar maakt geen baaien of eilanden en repareert geen silhouette. |
| **World Generator v2** | Seedgestuurd hoogte-/klimaatveld (145×97), contour-extractie en vereenvoudiging; opgeslagen Areas en paths. Roughness beïnvloedt het hoogteveld. | Nieuwe echte geometrie. | Geen invoer voor een bestaande doelcontour. Kan organischer land leveren, maar reproduceert niet automatisch Elyra. Genereert een nieuwe kaart, geen coastline-filter voor bestaande landmassa's. |

Bij Land Add/Remove betekent de instelling Smoothing in de huidige code vooral een grotere contour-simplificatietolerantie; het is niet dezelfde operatie als de aparte actie Smooth Coast. Een hogere waarde maakt een grove input dus niet automatisch een vloeiende kust.

## Opzet en resultaten met dezelfde landmassa

Northreach/Westmere is uitsluitend verschoven naar een 1000×1000-proefcanvas, niet geschaald. Dezelfde kleur, textuur, bron-seed en kuststijl; geen bergen, stamps, geography finish of water depth. Alle exports zijn 1×, ARL OFF, geen grid/corner scale bar, opaque. IoU is geometrische intersection/union ten opzichte van de oorspronkelijke landvulling; **geen gelijkenisscore met de Elyra-referentie**.

| Native PNG / bewerkbaar project | Punten | IoU met origineel | Oppervlakteverschil | Visuele bevinding |
|---|---:|---:|---:|---|
| [00 Origineel](00-original.png) / [project](00-original.mapweaver) | 65 | 100% | 0% | Grove hoekpunten blijven zichtbaar. |
| [01 Freehand, dezelfde input](01-freehand.png) / [project](01-freehand.mapweaver) | 64 | 99,994% | −0,006% | Bijna hetzelfde; Freehand vindt geen nieuwe kromming uit. |
| [02 Coastline Roughness 16 px](02-coastline-roughness.png) / [project](02-coastline-roughness.mapweaver) | 65 | 100% | 0% | Ruw randje los van de oorspronkelijke vulling; hogere instelling is geen organische landvorming. |
| [03 Globaal Smooth 3×25](03-contour-smooth.png) / [project](03-contour-smooth.mapweaver) | 65 | 95,04% | −1,81% | Veel minder hoekig, maar bijna gladde blob; karakteristieke inhammen verdwijnen. |
| [04 Land Roughen](04-land-roughen.png) / [project](04-land-roughen.mapweaver) | 116 | 97,86% | +0,071% | Werkelijke kust wordt aangepast; kleine variatie, grote hoekigheid niet geheel opgelost. |
| [05 Land Smooth na Roughen](05-land-smooth.png) / [project](05-land-smooth.mapweaver) | 127 | 97,84% | +0,052% | Subtiel zachtere lokale rand; behoudt grote contourvorm. |
| [06 Organic Add vanaf leeg](06-land-organic.png) / [project](06-land-organic.mapweaver) | 120 | 90,33% | −5,02% | Hoofdvorm met zes brede native streken benaderd; afgeronde brushlobben blijven zichtbaar. Dit is een handmatige benadering, niet een exact gelijke invoergeometrie. |
| [07 Terrain Brush](07-terrain-brush.png) / [project](07-terrain-brush.mapweaver) | 65 | 100% | 0% | Kleur/textuur langs kust verandert; silhouet onveranderd. |

Twee aanvullende generatorcontroles gebruiken dezelfde seed `Elyra coast comparison`, één continent en roughness 0% versus 85%. [08](08-world-smooth.png) / [project](08-world-smooth.mapweaver) heeft 44 punten, [09](09-world-rough.png) / [project](09-world-rough.mapweaver) 140. Hun overlap met de Elyra-landmassa is slechts 36,7% / 38,1%. **Dit zijn andere gegenereerde landvormen**, geen methode om dezelfde doelvorm te behouden. Voor eerlijke contourvergelijking is alleen het gegenereerde land getoond, met dezelfde baseline-stijl; biomes en overige generatorobjecten zijn weggelaten. Dit is geen volledige World Generator-kwaliteitsbenchmark.

## Echte editor- en exportcontrole

Alle tien archives zijn met de bestaande `decodeProject` geopend in de echte ongewijzigde App, in een lege QA-root `.qa.local/land-comparison/data`, backend 49541 en frontend 49542. Geen Primary-root geopend of aangeschreven. Het QA-harnas selecteert alleen proefprojecten; het roept geen export-renderfunctie aan.

Elke PNG is gemaakt door **Export PNG → Download PNG** in de App. Van 00 is het gewone browserdownloadbestand opgehaald. Daarna bewaart een audit-only document-clicklistener de exacte Blob URL die diezelfde native UI-actie aan het downloadanker geeft, via een lokale auditreceiver. Geen andere renderer, technische vervangingssnapshot, canvas-uitlezing of nabewerking. Herhaalde UI-export van 00 via deze capture is **byte-identiek** aan de echte download: SHA-256 `86b86c2902597be85671a7e5abb28a66afbf20bd0ae3b0733bcfa607bcd86241`.

Het ophalen van dat eerste browserdownloadpad duurde circa 283 seconden; dit meet de connectorworkflow, niet de renderer. De volgende tien UI-export/capture-acties pasten samen in twee browsercalls van circa 7 en 10 seconden, inclusief editor-screenshots en klikken. Dit ondersteunt het onderscheid met de eerdere lange Elyra-downloadwacht; het is geen rendertijdvergelijking tussen een assetloze proef en de complete kaart met 538 stamps.

Werkelijke UI gecontroleerd: Geographic role & contour toont roughness 1,3 / step 8 / seed 8508495; preview op 16 toont **65 → 65 nodes** en meldt expliciet dat alleen de coastline-stroke verandert. Preview geannuleerd, niets toegepast. Land / Water toont Add/Remove/Smooth/Roughen en Organic-vorm. Gewone editorbeelden per proef en controlescreenshots zijn meegeleverd. De geometriebewerkingen zelf zijn reproduceerbaar met bestaande domeinfuncties gebouwd; er wordt niet beweerd dat alle strokes met een fysieke muis zijn getekend.

## Defect of beperking?

- **Primaire oorzaak: gereedschapskeuze / onvoldoende authoring.** Directe grove contourpunten en minimale visuele roughness waren onvoldoende. De eerdere reproductie heeft bestaande Land-bewerkingen niet benut; dat was geen noodzakelijke architectuurbeperking.
- **Geen ontbrekende basisfunctie voor organisch land.** Add/Remove en lokale Smooth/Roughen bestaan en produceren valide native geometrie. Hun polygonale opslag is correct.
- **Wel begrensde visuele kwaliteit.** De organische brush geeft bij brede streken lobben; stroke-roughness produceert hier zaagtandjes; sterke globale smoothing verliest geografische details. Meer gerichte handmatige coastline-authoring blijft nodig. Deze proef bewijst geen automatische referentiekwaliteit.
- **Geen aangetoond defect dat de oorspronkelijke hoekigheid verklaart.** De relevante functies gedragen zich overeenkomstig code en ADR. Wel open testbevindingen: drie storetests falen op veranderende `campfireRevision` bij volledige snapshotgelijkheid; geen zichtbaar bewijs dat de kustgeometrie daardoor onjuist wordt. Niet gerepareerd binnen deze read-only opdracht.
- **Ontbrekende generatorfunctie: doelcontour-gestuurde generatie.** Die is niet aanwezig, maar ook niet vereist om de bestaande handmatige Land Tool te gebruiken. Dit verklaart niet waarom het oorspronkelijke script haar oversloeg.

## Aanbevolen aanpak voor Elyra, zonder nieuwe features

Behoud de huidige hoofdposities als gids, maar verfijn de echte landgrens met kleine Organic/Coastline Detail Add/Remove-streken voor baaien, schiereilanden en eilanden. Gebruik lokaal Smooth Coast en gematigd Roughen Coast, controleer zoom 100% en de hele kaart. Gebruik globaal Smooth alleen spaarzaam met preview; 3×25 is hier te sterk. Houd Area Coastline Roughness laag als optionele lijnstijl, niet als vervanging van geometrie. Breng Terrain Brush pas daarna aan voor ondergrond en overgangen. Gebruik World Generator voor nieuwe eigen werelden, niet voor deze vaste referentiesilhouetten.

De bestaande volledige Elyra-kaart is in deze opdracht niet herbouwd of gewijzigd.

## Validatie en reproductie

`reproduction/build.mjs` gebruikt uitsluitend bestaande domeinfuncties en de vorige auditbron. `reproduction/editor.tsx`, `index.html` en `vite.config.mjs` zijn het afzonderlijke QA-harnas. Kopieer ze naar `.qa.local/land-comparison/` om de proef te herhalen; bouw met `node .qa.local/land-comparison/build.mjs`. Alle benodigde invoergeometrie staat al in het vorige Elyra-project in deze repository; geen user assetdatabase nodig. Start een lege QA-service met de bovenstaande root/poorten en het expliciete profiel `qa`, daarna Vite met die config. Het harnas maakt alleen indien nodig een lege `Land Comparison QA`-campagne. Open die in de App; klik daarna de proefknoppen.

Vijf gerichte domeinasserties geslaagd; alle tien archives door de centrale validator en browserdecoder geaccepteerd. Bestaande Vitest-controles: **50 geslaagd, 3 gefaald, 53 totaal** in vijf suites. Commando: `npx vitest run src/domain/landBrush.test.ts src/store/landBrushActions.test.ts src/canvas/landBrushClient.test.ts src/app/LandBrushTools.test.tsx src/domain/terrainPaint.test.ts`.

Alle drie failures zitten in `landBrushActions.test.ts`: volledige snapshotvergelijkingen verwachten de oude/afwezige revision, terwijl `campfireRevision` na undo respectievelijk 3, 4 en 3 is. `projectStore.ts` verhoogt deze metadata bewust bij historywijzigingen; andere historytests strippen dit veld voor contentvergelijkingen. Daarom is een verouderde testverwachting aannemelijk, maar de suite is **niet groen** en deze audit past tests noch productcode aan.

Typecheck/lint/build/brede suites niet uitgevoerd: geen productcode gewijzigd. Geen push, Windows-package, externe publicatie of Campfire-wijziging. Het al bestaande ongetrackte ZIP van de vorige audit is buiten de commit gehouden.

## Nagekeken bronlocaties

- Vorige `reproduction/author-native.mjs`: regel 10 (`createArea` / roughness 1,3), regel 41 (vijf visuele TerrainStroke-acties).
- `src/domain/areas.ts:203` — `areaGeometry`, Freehand-verwerking; RDP-tolerantie op regel 29.
- `src/domain/landAreas.ts:21` — `editContour`; regel 28 — render-only `coastlineGeometry`.
- `src/domain/landBrush.ts:30` — footprint; regel 65 — `applyLandStroke`; regel 95 — lokale Smooth/Roughen.
- `src/canvas/drawArea.ts` — afzonderlijke canonieke vulling en afgeleide coastline-stroke.
- `src/app/LandAreaProperties.tsx` en `src/app/LandBrushTools.tsx` — daadwerkelijke, verschillende UI-bedieningen.
- `src/world/generate.ts:51`, `src/world/model.ts`, `src/world/contours.ts` — seedgenerator, toegestane parameters en contour-extractie.
- ADR-0007, ADR-0015, ADR-0027, ADR-0034 — polygonopslag, visuele kustlijn en canonieke landbewerking.
