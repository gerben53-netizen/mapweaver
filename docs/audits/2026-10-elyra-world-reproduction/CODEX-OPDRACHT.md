# Codex-opdracht — Elyra world map reproductie in Mapweaver

## Doel en bindende referentie

Maak de meegeleverde `elyra-reference.png` **zo nauwkeurig als binnen de bestaande Mapweaver-editor mogelijk** na als **volledig bewerkbare world map**. Lever uiteindelijk de **echte native PNG-export uit Mapweaver** en het bewerkbare `.mapweaver`-project. Dit is een productieproef en tegelijkertijd een empirische analyse van ontbrekende functies en assets.

De referentie toont een breed liggende, zeer gedetailleerde full-colour fantasywereldkaart met diepblauwe zeeën, meerdere onregelmatige continenten en eilanden, besneeuwd noorden, bosrijke centrale regio's, westelijke groene landen, zuidelijke woestijn, zuidoostelijk tropisch woud en oostelijk vulkanisch terrein; daarnaast reliëf, rivieren, steden, labels, sierlijst, kompas en legenda. Reproduceer de **geografie, relatieve ligging, silhouetten, kleurverdeling, compositie en cartografische hiërarchie** vóór decoratieve details. Gebruik 'Elyra' als wereldnaam. Nauwkeurigheid mag nooit ten koste gaan van eerlijk bewijs over Mapweaver-capabilities.

## Niet onderhandelbare randvoorwaarden

1. Gebruik de **actuele repository** en onderzoek eerst `AGENTS.md` / ontwikkelinstructies, de land/area-tool, brush/scatter-tool, world generator, world theming, asset-/stampbibliotheek, paths, rivers, roads, labels, layers en native export. Benut alle **passende bestaande** functies; probeer niet geforceerd irrelevante tools te gebruiken.
2. **GEEN** volledige referentieafbeelding als canvasachtergrond, texture-fill, enkele stamp, overlay, prefab, import of exportlaag. Ook niet de referentie opdelen in tiles om zo hetzelfde effect te bereiken. De wereldkaart moet uit daadwerkelijk bewerkbare Mapweaver-objecten, terreinen, paden en labels bestaan.
3. **GEEN** extern gerenderde kaart, screenshotcompositie, AI-nabewerking, Photoshop/Python/Pillow/SVG-collage of handmatige correcties aan de export. Scripts mogen hoogstens native projectdata via publieke/bestaande domeinfuncties opbouwen en controleren. Als buiten de UI via domeinfuncties wordt geauthoriseerd, motiveer dat en valideer openen/bewerken in de echte UI.
4. **GEEN** nieuwe productfeatures, gewijzigde productieassets, gemanipuleerde manifests of stilzwijgende import van ontbrekende stamps om de audit mooier te laten lijken. Als een wezenlijk ontbrekende functie de reproductie blokkeert, leg dat vast als gap. Kleine testharnesswijzigingen zijn uitsluitend gescheiden en gedocumenteerd toegestaan; raak primaire gebruikersdata niet aan.
5. Gebruik bestaande kwaliteits- en schaalafspraken. Noem ontbrekende mogelijkheden, mislukkingen en versimpelingen expliciet. Doe geen claims dat de kaart pixel-perfect of premiumkwaliteit heeft als screenshots dit niet tonen.
6. Gebruik een aparte `codex/elyra-world-reproduction` Git-branch. Laat primaire SQLite/projectdata ongemoeid; werk met een veilige geïsoleerde kopie als runtime-opslag nodig is. Commit uitsluitend nieuwe audit- en kaartbestanden in logisch gescheiden commits; geen push zonder toestemming.

## Gefaseerde uitvoering

### A. Analyse en productieplan

- Bekijk de referentie op hoge resolutie en bepaal de hoofdlandmassa's, watergrenzen, eilanden, klimaatzones, reliëfassen, bossen, woestijnen, ijsgebieden, vulkanen, grote rivieren, nederzettingen en kaartdecoratie.
- Maak een compacte object-/laagindeling met prioriteit op silhouetten en geografische samenhang.
- Inventariseer beschikbare world-mapobjecten, land-/area-tools, brushes, scatters en labels. Bouw op bestaande `generateWorld`, `themeWorld` en area/path-functies als die behulpzaam zijn, maar gebruik gegenereerde landvormen niet blind als ze afwijken van de referentie.

### B. Authoring van een echte Mapweaver-wereldkaart

- Maak een breed liggende wereldkaart in een resolutie en projectgrootte die Mapweaver betrouwbaar ondersteunt.
- Teken/assembleer landmassa's via de **land/area-tool**, met natuurlijke kustlijnen, baaien, zeestraten, delta's en eilandengroepen. De hoofdcontouren en plaatsing moeten qua compositie herkenbaar overeenkomen met Elyra.
- Gebruik **brush/terrain/biome/scatter** voor bossen, bergen, sneeuw, woestijn, moeras en tropisch landschap, bij passende schaal en met herhalingsvariatie.
- Gebruik bestaande path/river/road- en plaats-/labelgereedschappen voor geografisch plausibele infrastructuur; zorg voor leesbare legenda/labels waar ondersteund.
- Voeg passend kleurcontrast, diepte, texturen en cartografische detaillering toe via de bestaande editor, zonder een bestaande afbeelding als onderlegger te exporteren.
- Houd alle onderdelen native, afzonderlijk bewerkbaar en correct gelayerd.

### C. Echte UI-test en native export

- Open het geproduceerde `.mapweaver`-project in de **ongewijzigde echte Mapweaver-app**.
- Verifieer in de editor dat landvlakken, brushes/stamps, paden en labels afzonderlijk te selecteren/bewerken zijn.
- Neem een echte screenshot van de editor.
- Maak de definitieve PNG via de bestaande **Export PNG → Download PNG**-actie (native UI-export), niet met een technische snapshot of externe renderer. Sla het gedownloade bestand ongewijzigd als `elyra-mapweaver-native-export.png` op.
- Maak bij voorkeur detail-screenshots van noordelijk ijs/gebergte, centraal bos/rivierlandschap, zuidelijke woestijn en oostelijk vulkanisch gebied. Controleer dat editor en native export overeenkomen. Documenteer eventuele verschillen expliciet.
- Test archiveren, opnieuw openen en ten minste één bewerking op een native object. Leg verificatie vast.

### D. Objectieve vergelijking en gap analysis

- Toon een zij-aan-zij referentie versus **native export** (uitsluitend in het rapport voor vergelijking; deze compositie mag niet als eindexport worden gepresenteerd).
- Geef per deelgebied aan: `CLOSE`, `APPROXIMATED` of `NOT POSSIBLE`, met concrete oorzaken.
- Scheid gaps in (a) functionele tools, (b) ontbrekende assets, (c) rendering/kwaliteit, (d) authoring-/workflowkosten, (e) exportcorrectheid.
- Rapporteer, waar mogelijk kwantitatief, aantallen areas, paths, stamps, brush strokes, labels, relevante families, totale productietijd en handmatige workarounds.
- Beoordeel artistieke eindkwaliteit kritisch tegenover de meegeleverde referentie op een schaal van 1–5 per criterium: landvormen, terreinovergangen, reliëf, vegetatie, hydrologie, iconografie, labels, visuele cohesie, exportfidelity en workflow.
- Eindconclusie: wat is *precies* nodig om met Mapweaver zelfstandig kaarten van deze referentiekwaliteit te kunnen produceren?

## Deliverables

Schrijf onder `docs/audits/2026-10-elyra-world-reproduction/`:

- `elyra-reference.png` (ongewijzigde originele referentie)
- `elyra-world.mapweaver` (werkelijk bewerkbaar project)
- `elyra-mapweaver-native-export.png` (**echte, onbewerkte UI-download**; primair eindresultaat)
- `editor-screenshot.png` (echte Mapweaver-editor)
- `details/` (representatieve editor- en/of exportdetailbeelden)
- `README.md` (werkwijze, exacte repo-revisie, commando's, provenance en reproductiestappen)
- `comparison-and-gap-analysis.md` (kritische vergelijking en concrete tekortkomingen)
- `object-inventory.json` (gebruikte objecten en aantallen)
- `validation.json` (project-open/roundtrip, assetresolutie, exportherkomst, relevante tests, bekende afwijkingen)

Gebruik geen placeholder of lege bestandsnamen om onvoltooide deliverables als gereed te presenteren. Eindbericht: toon expliciet het pad naar de **echte native export**, het project, editorbeeld, grootste vijf blockers en commit-hash. Als een export onmogelijk is, vermeld de blokkade en lever geen kunstmatig vervangend resultaat.

## Acceptatie

De proef slaagt als een reviewer de native PNG daadwerkelijk in Mapweaver kan reproduceren vanuit het bewerkbare project; de kaart visueel aantoonbaar dicht bij de referentie komt voor zover de editor dit toestaat; alle afwijkingen verklaard zijn; en nergens een gerecyclede afbeelding als schijnbaar native world-mapobject is gebruikt.
