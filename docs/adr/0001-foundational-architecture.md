# ADR-0001: Fundamentele architectuur van Mapweaver

- Status: geaccepteerd
- Datum: 2026-09-22

## Context

Mapweaver wordt een zelfstandige mapmaker voor tabletop-RPG's en andere creatieve kaarttoepassingen. De eerste versie richt zich op interieurs en battlemaps. Gebruikers moeten achtergronden en stamps kunnen plaatsen, transformeren, ordenen, lokaal bewaren en als afbeelding exporteren.

De applicatie moet snel tot een bruikbare versie kunnen groeien, zonder accounts, backend of externe cloudafhankelijkheid. Tegelijkertijd moeten het bewerkbare projectmodel, undo/redo en bestandscompatibiliteit vanaf het begin zorgvuldig worden gescheiden van tijdelijke gebruikersinterfacestatus.

## Besluit

### Applicatievorm

Mapweaver versie 1 wordt een desktopgerichte, local-first browserapp. De applicatie werkt zonder backend en zonder verplicht account. Installatie als PWA kan later worden toegevoegd, maar is geen vereiste voor de eerste versie.

### Technologiestack

- TypeScript als programmeertaal.
- React voor de gebruikersinterface.
- Vite als ontwikkel- en buildtool.
- Konva via `react-konva` voor het interactieve 2D-canvas.
- Zustand voor applicatie-, project- en editorstatus.
- IndexedDB via Dexie voor lokale persistente opslag.
- CSS Modules en CSS-variabelen voor styling.
- npm voor pakketbeheer.
- Vitest en Testing Library voor unit- en componenttests.
- Playwright voor een beperkte set kritieke end-to-endtests.

### Verantwoordelijkheden

- React beheert toolbars, panelen, dialoogvensters en overige interfacecomponenten.
- Het domeinmodel beschrijft het bewerkbare project onafhankelijk van React en Konva.
- Zustand coördineert het projectmodel en tijdelijke editorstatus, maar houdt die categorieën logisch gescheiden.
- Konva rendert het projectmodel en vertaalt pointerinteracties naar editoracties.
- Een commandolaag beheert betekenisvolle mutaties en undo/redo.
- Een opslaglaag beheert browseropslag, import, export en toekomstige formaatmigraties.
- Een afzonderlijke exportroute rendert niet-bewerkbare PNG-uitvoer.

### Projectbestand

Het overdraagbare projectbestand gebruikt de extensie `.mapweaver` en is intern een ZIP-container. Het bevat minimaal:

```text
project-name.mapweaver
├── project.json
├── assets/
│   └── ...
└── preview.png     # optioneel
```

`project.json` bevat een expliciet `formatVersion`. Gebruikte afbeeldingen worden in het projectbestand ingebed zodat een project zelfstandig verplaatsbaar blijft. Browseropslag is alleen een werkomgeving en herstelvoorziening; het vervangt een geëxporteerd projectbestand of een gebruikersback-up niet.

### Statusscheiding

Persistente projectstatus omvat onder meer kaartafmetingen, rasterinstellingen, lagen en geplaatste objecten. Tijdelijke editorstatus omvat onder meer selectie, hover, actieve tool, zoom, pan en geopende panelen. Tijdelijke editorstatus wordt niet in het projectmodel opgeslagen, tenzij later voor een specifiek veld expliciet anders wordt besloten.

### Undo/redo

Undo/redo wordt gebaseerd op betekenisvolle editorcommando's. Een continue interactie, zoals slepen of draaien, wordt tijdens de beweging visueel bijgewerkt maar bij afronding als één geschiedenisactie vastgelegd.

## Gevolgen

### Positief

- De eerste versie kan als statische applicatie functioneren.
- Er is geen serverbeheer of accountbeveiliging nodig.
- Konva ondersteunt de vereiste 2D-interacties zonder een volledig eigen canvassysteem te bouwen.
- Projecten kunnen zelfstandig worden verplaatst en geback-upt.
- De scheiding tussen domeinmodel, rendering en opslag maakt gerichte tests mogelijk.

### Negatief

- Ingebedde assets kunnen `.mapweaver`-bestanden groot maken.
- Browseropslag kent quota en verschilt per browser.
- Een browserapp heeft minder directe bestandssysteemintegratie dan een native desktopapp.
- React en Konva vereisen discipline om onnodige her-rendering bij grote kaarten te voorkomen.

### Uitgesteld

De volgende onderwerpen vallen buiten dit besluit:

- cloudopslag en samenwerking;
- accounts en rechten;
- Electron- of Tauri-packaging;
- mobiele en volledige touchbediening;
- maximale kaart- en assetgrootte;
- distributie- en updateproces;
- dynamische belichting, fog-of-war en VTT-integratie.

## Herziening

Herzie dit besluit alleen wanneer gemeten technische beperkingen, nieuwe productvereisten of distributie-eisen de gekozen architectuur aantoonbaar ongeschikt maken. Leg een vervangend besluit vast in een nieuwe ADR; wijzig de historische beslissing niet stilzwijgend.
