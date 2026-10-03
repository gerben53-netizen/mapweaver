# Mapweaver — Codex-projectinstructies



## 1. Doel van dit bestand



Dit bestand bevat de blijvende ontwikkelafspraken voor Mapweaver. Lees dit bestand volledig voordat je een opdracht analyseert, code wijzigt of tests uitvoert. Pas deze afspraken toe op iedere taak in deze repository.



Als een concrete gebruikersopdracht afwijkt van dit bestand, heeft de expliciete gebruikersopdracht voorrang. Meld relevante conflicten voordat je ingrijpende wijzigingen uitvoert.



## 2. Productvisie



Mapweaver is een zelfstandige, generieke mapmaker voor tabletop-RPG's en andere creatieve kaarttoepassingen. De applicatie is niet gekoppeld aan één campagne, spelwereld of regelsysteem.



De kernbelofte is:



> Build worlds, one layer at a time.



Mapweaver moet gebruikers in staat stellen om een kaart op te bouwen uit achtergronden en herbruikbare visuele objecten, hierna `stamps` genoemd. Stamps moeten minimaal geplaatst, geselecteerd, verplaatst, geschaald en gedraaid kunnen worden.



De eerste productfocus ligt op interieurs en battlemaps. De architectuur mag toekomstige ondersteuning voor steden, regio's en wereldkaarten niet onnodig blokkeren, maar bouw geen toekomstige functionaliteit zonder concrete opdracht.



## 3. Productprincipes



1. **Eenvoud vóór volledigheid** — veelgebruikte handelingen moeten direct begrijpelijk zijn.

2. **Canvas centraal** — de kaart krijgt de meeste visuele ruimte; gereedschappen ondersteunen het canvas.

3. **Niet-destructief werken** — geplaatste objecten blijven afzonderlijk bewerkbaar tot export.

4. **Lokale controle** — de eerste versie moet zonder verplicht account of externe cloudservice kunnen functioneren.

5. **Generiek product** — gebruik geen Valmyria-specifieke namen, gegevensstructuren of vormgeving in productcode.

6. **Groeibare architectuur** — bereid alleen uitbreidingspunten voor die de huidige oplossing aantoonbaar eenvoudiger of veiliger maken.

7. **Toegankelijke bediening** — bied waar redelijk zowel muisbediening als toetsenbordondersteuning en duidelijke focus-/selectiestatussen.



## 4. Beoogde basisfunctionaliteit van versie 1



De geplande versie 1 omvat:



- een kaartcanvas met zoomen en verschuiven;

- een achtergrond of ondergrond laden;

- stamps importeren en vanuit een bibliotheek op de kaart plaatsen;

- stamps selecteren, verplaatsen, schalen, draaien en spiegelen;

- dupliceren en verwijderen;

- objectvolgorde en lagen beheren;

- een optioneel raster en snap-to-grid;

- instelbare kaartafmetingen;

- undo en redo;

- projecten lokaal opslaan en opnieuw openen;

- export naar PNG op bruikbare resolutie.



Alles daarbuiten is voorlopig geen aangenomen scope. Voorbeelden zijn accounts, samenwerken, cloudopslag, marktplaatsen, AI-generatie, dynamische belichting, fog-of-war en ondersteuning voor een virtual tabletop.



## 5. Begrippen



Gebruik in code, documentatie en interface consequent de volgende betekenis:



- **Campaign** — de bovenliggende lokale verzameling kaarten, met generieke mappen en stabiele verwijzingen naar kaartdocumenten; zie ADR-0022.

- **Campaign folder** — organisatienode in een campagne, onafhankelijk van kaartlagen en bestandspaden.

- **Project** — het volledige bewerkbare document van één kaart (bestaande opslag-/bestandsnaam); Projects kiest in de interface een Campaign, de Campaign Explorer kiest kaarten.

- **Map** — het kaartcanvas en de kaartinstellingen binnen een project.

- **Stamp** — een herbruikbaar visueel bronobject uit de bibliotheek.

- **Stamp Palette** — campagnegebonden werklijst van bibliotheekasset-ID’s voor herhaald klikken en eenmalig slepen; geen kopie van assets en onafhankelijk van Favorites. Zie ADR-0048.

- **Fill pattern** — een herbruikbare afbeelding van het assettype `fillPattern`, gebruikt als herhaling of uitgerekte afbeelding binnen een generiek Area-object. Een expliciete kopie naar het andere assettype houdt logische items gescheiden.

- **Path** — één bewerkbare centerline met rechte/gebogen segmenten en solid/dashed/texture stroke; absolute kaartnodes en relatieve handles, zie ADR-0008.

- **Route (River / Road / Border)** — gespecialiseerde Path met concrete stijl, fysieke schaalreferentie en gedeelde centerlinebewerking; zie ADR-0016. De primaire UI biedt deze aan via Path → Path type; de interne route-modus blijft behouden, zie ADR-0039. River heeft optionele versiegebonden smoothing/outline/halo in route.appearance; zie ADR-0030.

- **Wall** — gespecialiseerd Path met canonieke centerline, dikte, vulling, outline en expliciete schaalreferentie; zie ADR-0011. Expliciete `wall.alignment: 'outside'` gebruikt bij gesloten muren de binnencontour als padreferentie en laat dikte naar buiten groeien; ontbrekende alignment behoudt centerlinegedrag, zie ADR-0046.

- **Generated terrain stamps** — gewone Stamp-objecten met historische ID-gebaseerde provenance in `map.generation.scatter`; generator-aware plaatsing boven op world-v1, zie ADR-0029. Optionele Hero/Primary/Support/Detail-metadata stuurt engine 2, met zeldzame hero’s en bos-/bergopbouw; zie ADR-0043.

- **Scatter** — één bewerkbaar object met een versiegebonden seed/recipe en begrensde stampinstanties, die bestaande assets delen; zie ADR-0014.

- **Generated Wall** — één native Wall met een opgeslagen generatorrevision, seed en parameters; gebundelde PNG-componenten vormen tijdelijke wortelbanen en een gecachte surface, zonder scene-stamps. Functionele geometrie en visuele bounds blijven afzonderlijk; zie ADR-0051.

- **Wall Material** — een onveranderlijke atlasdefinitie met een optionele continue, versiegebonden materiaalrecipe; world-space schaal, organische visuele rand, bronkanalen en opgeslagen seed/parameters boven één native Wall-path. Bestaande strip/segment Wall sets blijven ondersteund; zie ADR-0050.

- **Wall set** — onveranderlijke materiaalrevisie met transparante strook-/segmentafbeeldingen, verpakt in het bestaande assetregister; zie ADR-0013.

- **Opening** — getypeerde deur of raam, gekoppeld aan één Wall via positie op de centerline; uitsnede en diepte zijn afgeleid, zie ADR-0012.

- **Room floor** — gewoon Area met historische muurherkomst, expliciet gegenereerd of opnieuw opgebouwd; geen stil live gekoppelde kamer.

- **Landmass / Terrain region** — semantische Area-rollen op een vlakke Regional/World-kaart; fysieke schaal en lokale fictieve coördinaten, zie ADR-0015.

- **Land / Water Brush** — semantische bewerking van canonieke Landmass-Areas; tijdelijke vectorcoverage, native contouren en optionele `map.landEditing` voor handmatige herkomst en gedeelde terreinclipping; zie ADR-0034.

- **Area** — een bewerkbaar gebied met polygonen en gaten, een effen/patroon/lege vulling en optionele rand; zie ADR-0007.

- **Placed object** — een instantie van een stamp op de kaart, met eigen transformatie en eigenschappen.

- **Smart marker** — Place met optionele versiegebonden ingebouwde icon-/stijlmetadata en gekoppeld naamlabel; zie ADR-0024 en ADR-0044 (Illustrated-modus met gedeelde stampreferentie). Oude Place-objecten behouden hun exacte uiterlijk.

- **Place** — semantische locatie met type, optioneel stamp-symbool en expliciete cartografische/wereldschaal; zie ADR-0017.

- **Label** — bewerkbare platte tekst, zelfstandig of via owner-ID en offset aan één object in dezelfde laag gekoppeld; zie ADR-0017.

- **Automatic label** — gewoon Label met versiegebonden bron-ID, semantische klasse en override/suppression-metadata; expliciete generatie en updates gebruiken bestaande namen en beschermen handmatige labels, zie ADR-0035.

- **Cartographic element / Map Element** — gewoon kaartobject voor Compass, Scale bar, Title/Cartouche, Legend of List/Note, met interne vectorpresets; zie ADR-0023. Label blijft een afzonderlijk tekstobject met bestaande semantiek.

- **Legend / Compass** — gewone kaartobjecten met expliciete legenda-entries respectievelijk kompasstijl; oude weergave blijft behouden, zie ADR-0017 en ADR-0023.

- **Scene Outliner** — de primaire hiërarchische browser voor Layer → Object group → Object en ongegroepeerde objecten; alleen een projectie van bestaande data, met één boomscrollgebied en undoable hiërarchieacties, zie ADR-0049.

- **Layer** — een benoemde verzameling geplaatste objecten met zichtbaarheid en volgorde.

- **Object group** — niet-geneste groep object-ID's uit één laag; objectdata en z-order blijven centraal.

- **Layer group** — hiërarchische groep laag-/laaggroep-ID's in de canonieke lagenboom, maximaal vijf niveaus; zichtbaarheid en vergrendeling worden overgeërfd zonder kindvlaggen te overschrijven.

- **Grid** — een optionele visuele en magnetische uitlijning op het canvas; Square of axiaal Hex Flat/Pointy met hoek-tot-hoekdiameter en gedeelde centers/corners, zie ADR-0040.

- **Prefab** — een canonieke bibliotheekcompositie met onafhankelijke Editable-kopieën of één Flattened-afbeelding; geen levend prefabobject, zie ADR-0019.

- **Map effects / Map frame** — optionele kaartgebonden mist, vignette en beschermd vectorframe; stampgebonden schaduw/gloed blijven afzonderlijk bewerkbaar. Zie ADR-0031.

- **Geography finish** — optionele, niet-destructieve kaartafwerking voor reliëf, materiaalovergangen, kustverloop en oceaandiepte; gedeeld door editor/export. World-generator versie 2 bewaart historische bergkam-/afwateringsnetwerken; zie ADR-0036.

- **Terrain paint** — onafhankelijke kaartgebonden visuele maskertegels met terrain-style-ID en textuurschaal, boven semantische Areas; zie ADR-0033. Versie 2 ondersteunt onveranderlijke gebundelde painterly textuur-ID’s en expliciete brushpresets; zie ADR-0037. Paint/Erase/Blend wijzigen nooit biomegegevens. Material kiest uitsluitend beeldmateriaal; Brush Preset kiest uitsluitend penseelgedrag, zie ADR-0039.

- **Texture paint / Texture Brush** — één kaartgebonden bewerkbare Battlemap-verflaag met bestaande fill-pattern-assets, pixelmaskers en een vaste kaartoorsprong; Paint/Erase/Blend, eigen zichtbaarheid/vergrendeling/dekking. Zie ADR-0047.

- **Coastal contours** — optionele kaartgebonden kustafstandslijnen, onafhankelijk van Water Depth; afgeleid van semantische watergeometrie met begrensde eilandlijnen en open riviermondingen. Zie ADR-0042.

- **Water Depth** — optionele automatische kust-/meerdiepte met afzonderlijke herstelbare ondiep-/diepmaskers en afgeleide riviermondingen; alleen zichtbaar water wordt beïnvloed. Zie ADR-0038 en ADR-0041 voor versiegebonden bathymetrie, scalaire Blend en afzonderlijke kustrand.

- **World visual theme** — centrale World/Regional-stijlcompositie met directe renderwaarden en per-veld eigenaarschap in `map.theme`; zie ADR-0032.

- **Export** — een gerenderde, niet-bewerkbare uitvoer zoals PNG.



Introduceer geen alternatieve termen voor hetzelfde concept zonder het datamodel en deze begrippenlijst bewust bij te werken.



## 6. Ontwikkelwerkwijze



Voer per opdracht de volgende stappen uit:



1. Lees dit bestand en inspecteer relevante bestaande code, configuratie en documentatie.

2. Controleer de huidige staat voordat je aannames doet over reeds gebouwde functionaliteit.

3. Benoem kort het doel, de geraakte onderdelen en belangrijke risico's.

4. Implementeer alleen de gevraagde scope en noodzakelijke ondersteunende wijzigingen.

5. Voeg of wijzig gerichte tests voor het aangepaste gedrag.

6. Voer alleen relevante validatie uit voor de gewijzigde onderdelen.

7. Rapporteer wat is veranderd, hoe het is gevalideerd en welke beperkingen of vervolgpunten resteren.



Los duidelijke kleine fouten die rechtstreeks door de wijziging ontstaan meteen op. Breid de opdracht niet zelfstandig uit met grote refactors of nieuwe productfunctionaliteit.



## 7. Sprintafspraken



- Eén sprint heeft één samenhangend gebruikersdoel en een controleerbaar eindresultaat.

- Begin een sprint met acceptatiecriteria voordat je implementeert.

- Houd productlogica, presentatielogica en opslag-/bestandslogica duidelijk gescheiden.

- Lever geen schijnfunctionaliteit: knoppen en menu-items moeten werken of duidelijk als niet-beschikbaar zijn gemarkeerd.

- Voeg geen toekomstige interface-elementen toe als de achterliggende functie nog niet bestaat.

- Bewaar open ontwerpvragen expliciet; verberg ze niet in impliciete aannames.

- Werk bestaande documentatie bij wanneer gedrag, bestandsformaat of architectuur verandert.



## 8. Codekwaliteit



- Kies eenvoudige, leesbare oplossingen boven abstracties zonder direct voordeel.

- Gebruik sterke typing waar de gekozen taal of het framework dit ondersteunt.

- Vermijd duplicatie, maar abstraheer pas wanneer het gedeelde concept stabiel is.

- Houd canvastransformaties en coördinatenconversies centraal en testbaar.

- Maak statuswijzigingen voorspelbaar; mutaties die door undo/redo moeten worden ondersteund mogen niet verspreid en impliciet plaatsvinden.

- Scheid het opgeslagen projectmodel van tijdelijke UI-status zoals hover, open panelen en actieve selectie.

- Behandel geïmporteerde bestanden als onbetrouwbare invoer en valideer formaat, grootte en inhoud.

- Voeg geen secrets, tokens, persoonlijke bestanden, gegenereerde builds of lokale ontwikkeldata toe aan versiebeheer.



## 9. Datamodel en compatibiliteit



Gebruikersbesluit 23 september 2026: achterwaartse compatibiliteit met oude projectformaten en versies is niet vereist. Oude data en versies mogen worden verwijderd wanneer dat voor de actuele opdracht nodig is. Het actuele formaat en veilige validatie blijven leidend; bestaande migratiecode hoeft niet alleen om deze vrijstelling verwijderd te worden.



Het bewerkbare projectformaat krijgt uiteindelijk de extensie `.mapweaver`. Leg de interne representatie pas definitief vast wanneer opslag wordt geïmplementeerd.



Zodra projecten opgeslagen kunnen worden:



- bevat ieder projectbestand een expliciet formaatversienummer;

- is laden tolerant voor ontbrekende optionele velden;

- worden onbekende of ongeldige gegevens veilig afgewezen of met een duidelijke waarschuwing behandeld;

- worden migraties tussen formaatversies centraal beheerd;

- mag een wijziging bestaande projecten niet stilzwijgend onbruikbaar maken;

- is export naar PNG gescheiden van het bewerkbare projectformaat.



Documenteer iedere wijziging aan het persistente formaat.



## 10. UX- en interactieregels



- Selectie moet altijd zichtbaar en ondubbelzinnig zijn.

- Sleep-, schaal- en draaiacties moeten vloeiend aanvoelen en mogen een object niet onverwacht laten verspringen.

- Zoom en pan mogen de kaartcoördinaten of opgeslagen objectposities niet veranderen.

- Verwijderen, wissen en overschrijven moeten via undo herstelbaar zijn of vooraf duidelijke bevestiging vragen.

- Toetsenbordsneltoetsen mogen normale invoervelden niet verstoren.

- Toon begrijpelijke meldingen bij import-, laad-, opslag- en exportfouten.

- Een leeg project moet de gebruiker duidelijk naar de eerste zinvolle actie leiden.



## 11. Prestaties



- Voorkom volledige her-rendering van alle canvasobjecten bij een kleine interactie wanneer het gekozen framework dit kan vermijden.

- Optimaliseer op basis van gemeten knelpunten, niet op vermoedens.

- Gebruik bij prestatiekeuzes realistische kaarten met meerdere lagen en veel stamps.

- Grote bronafbeeldingen mogen de interface niet ongemerkt blokkeren of het geheugengebruik onbeheerst laten groeien.



## 12. Test- en validatiebeleid



- Voer per sprint gerichte tests uit voor daadwerkelijk gewijzigd gedrag.

- Draai niet standaard de volledige testsuite wanneer die omvangrijk is en grotendeels ongerelateerd aan de wijziging.

- Voer typecheck, lint, build en formatcheck alleen uit wanneer relevant voor de gewijzigde scope of expliciet gevraagd.

- Test interactielogica waar mogelijk los van pixels en browserdetails.

- Voeg regressietests toe voor iedere gerepareerde fout wanneer dit redelijk uitvoerbaar is.

- Voor canvasfuncties zijn minimaal tests nodig op transformaties, coördinaten, selectie en undo/redo zodra die onderdelen bestaan.

- Meld exact welke controles zijn uitgevoerd en welke niet.



## 13. Veiligheid en externe acties

### Lokale Git-werkwijze

Mapweaver wordt onderhouden in de bestaande lokale Git-repository. Normale ontwikkeling gebeurt op `develop`. Controleer vóór iedere sprint de werkboom; deze is bij voorkeur schoon.

Wanneer een sprint tracked projectbestanden wijzigt, eindig de sprint met diffcontrole en precies één eigen lokale commit: `Sprint: <korte sprinttitel>` of bij een gerichte bugfix `Fix: <korte beschrijving>`. Maak geen lege commit voor analyse of werk zonder tracked wijzigingen. Combineer geen ongerelateerd sprintwerk.

Behoud ongerelateerde vooraf bestaande wijzigingen en neem ze nooit stilzwijgend mee. Als ambiguïteit veilig committen verhindert, rapporteer de blokkade; commit alleen wanneer de eigen sprintwijzigingen veilig te isoleren zijn. Maak geen remote en push niet, tenzij de gebruiker dit expliciet vraagt.

De eenmalige baseline bevat de bestaande canonieke code plus repositoryhygiëne, met onderwerp `Baseline: Mapweaver before sprint-level Git workflow`; historische sprints worden niet gereconstrueerd.



- Voer geen externe acties uit zoals deployen, publiceren, pushen, mergen of cloudresources wijzigen, tenzij de gebruiker daar expliciet opdracht voor geeft.

- Verwijder of overschrijf geen gebruikersbestanden zonder expliciete noodzaak en controle van het doelpad.

- Leg geen telemetrie of externe netwerkverbindingen aan zonder voorafgaande productbeslissing.

- Een lokaal project mag niet afhankelijk worden van een externe dienst zonder expliciete goedkeuring.



## 14. Open architectuurbesluiten



De fundamentele architectuur is vastgelegd in `docs/adr/0001-foundational-architecture.md`. De expliciete Sprint 12-opdracht en `docs/adr/0005-persistent-storage-architecture.md` vervangen daarvan de primaire-opslagafspraken: een lokale Node.js-service op uitsluitend 127.0.0.1 beheert SQLite en assetbestanden; Dexie is alleen cache/herstelbuffer en behouden migratiebron. Dit is de goedgekeurde uitzondering op de eerdere afspraak zonder backend. Geen externe backend of cloud toevoegen. De overige oorspronkelijke versie-1-keuzes hieronder blijven van toepassing waar zij niet met ADR-0005 conflicteren:



- een desktopgerichte, local-first browserapp zonder backend of verplicht account;

- React met TypeScript en Vite;

- Konva via `react-konva` voor het interactieve canvas;

- Zustand voor project- en editorstatus;

- IndexedDB via Dexie voor lokaal herstel, recente projecten, voorkeuren en de stampbibliotheek;

- een ZIP-container met extensie `.mapweaver`, met minimaal `project.json`, ingebedde assets en optioneel een preview;

- Vitest en Testing Library voor gerichte unit- en componenttests;

- Playwright voor een kleine set kritieke end-to-endworkflows;

- CSS Modules en CSS-variabelen voor styling;

- npm als package manager;

- Engels als eerste interfacetaal, met een structuur die latere lokalisatie niet blokkeert.



Voeg voor versie 1 geen server-side rendering, backend, accountfunctionaliteit, cloudopslag, Electron, Tauri of zwaar algemeen designsysteem toe zonder expliciete nieuwe beslissing.



De volgende keuzes zijn nog niet definitief en mogen niet stilzwijgend als canon worden behandeld:



- maximale kaart- en afbeeldingsgroottes;

- distributie- en updateproces.



Leg een besluit vast in een Architecture Decision Record (ADR) wanneer het moeilijk terug te draaien is, meerdere onderdelen raakt of gevolgen heeft voor projectcompatibiliteit.



## 15. Definition of Done



Een wijziging is gereed wanneer:



- de afgesproken acceptatiecriteria aantoonbaar zijn behaald;

- de implementatie binnen de gevraagde scope blijft;

- relevante tests en controles slagen;

- fout- en randgevallen passend zijn afgehandeld;

- gebruikersinterface en toetsenbordgedrag geen duidelijke regressies bevatten;

- relevante documentatie is bijgewerkt;

- er geen bekende kritieke fout wordt verzwegen;

- het eindrapport de wijziging en validatie beknopt en concreet beschrijft.



## 16. Campfire Map Contract — ownership en immutable dependency

MapWeaver produceert maps voor Campfire via het canonieke Campfire Map Contract. De gekoppelde Campfire-directory `packages/map-contract` is de enige canonieke bron van waarheid voor dit contract.

### Ownership

Campfire is exclusief eigenaar van het Map Contract. MapWeaver is uitsluitend:

- producer van contractconforme payloads;
- validator tegen het bestaande contract;
- consumer van types/schema/documentatie voor zover de gekoppelde omgeving dat ondersteunt.

MapWeaver is **geen eigenaar** van het contract.

### Immutable / read-only

Alle bestanden in de gekoppelde Campfire `packages/map-contract` directory zijn vanuit MapWeaver **IMMUTABLE / READ-ONLY**.

MapWeaver en agents die aan MapWeaver werken mogen deze bestanden nooit:

- wijzigen;
- formatteren;
- hernoemen;
- verwijderen;
- genereren/regenereren;
- overschrijven;
- committen;
- automatisch corrigeren.

Dit geldt ook wanneer een contractwijziging de MapWeaver-implementatie eenvoudiger zou maken.

### Contractproblemen

Als tijdens MapWeaver-ontwikkeling blijkt dat noodzakelijke semantiek ontbreekt, een veld onvoldoende duidelijk is, een schema/type inconsistent lijkt, MapWeaver-data niet correct in het bestaande contract kan worden uitgedrukt of een breaking contractwijziging nodig lijkt:

1. wijzig het Campfire-contract niet;
2. bouw geen MapWeaver-specifieke workaround die feitelijk een afwijkend contract introduceert;
3. rapporteer exact welke contractbehoefte of inconsistentie is gevonden;
4. stop alleen het afhankelijke onderdeel;
5. wacht op een wijziging van het canonieke contract vanuit Campfire.

Onafhankelijk MapWeaver-werk dat niet door het contractprobleem wordt geraakt mag doorgaan.

### Geen lokale fork van het contract

Maak in MapWeaver geen tweede handmatig onderhouden canonieke versie van:

- TypeScript contracttypes;
- JSON Schema;
- enums;
- contractinterfaces;
- validation rules.

Wanneer lokale generated artifacts technisch noodzakelijk zijn, moeten ze aantoonbaar uit het canonieke Campfire-contract worden afgeleid en mogen ze nooit als alternatieve bron van waarheid worden behandeld.

### MapWeaver-export

MapWeaver moet payloads produceren die voldoen aan de actuele ondersteunde versie van het canonieke contract.

De intended flow is:

MapWeaver authoring → canonical Campfire Map Contract → validation → export/package → Campfire ingest

Later:

MapWeaver authoring → canonical Campfire Map Contract → validation → authenticated Campfire API → Campfire ingest

Bestandsexport en toekomstige API-push gebruiken hetzelfde contract en dezelfde MapWeaver-serialisatie. Deze architectuurregel geeft op zichzelf geen opdracht om een exporter of API-integratie te bouwen.

### Renderer-onafhankelijkheid

Respecteer de contractgrens:

> Het Map Contract beschrijft de wereld; Campfire bepaalt hoe die wereld wordt gerenderd.

MapWeaver mag daarom geen Campfire/PixiJS-implementatiedetails aan het contract toevoegen of ervan afhankelijk maken, zoals:

- Pixi filters;
- blend modes;
- shaders;
- render textures;
- Campfire UI-state.

MapWeaver authoring mag deze werelddata wel previewen.

### Identiteit

Respecteer stabiele contractidentiteiten:

- MapWeaver `mapId` blijft stabiel gedurende de levensduur van dezelfde map;
- een echte duplicate/new map krijgt een nieuwe `mapId`;
- contractobjecten zoals walls, doors en lights behouden waar mogelijk stabiele IDs over revisions;
- `revision` representeert een nieuwe revision van dezelfde map en is geen vervanging voor `mapId`.

Deze identiteit is nodig zodat Campfire runtime-state kan behouden.

### Runtime-state

MapWeaver authoringdata en Campfire runtime-state blijven gescheiden.

MapWeaver definieert bijvoorbeeld walls, doors, authored/default light state, grid en map geometry.

Campfire beheert bijvoorbeeld DoorState, LightState, TokenState, Fog/Visibility en combat/runtime state.

MapWeaver mag runtime-state niet als authoringstate terug het contract in trekken tenzij een toekomstige canonieke contractversie dat expliciet voorschrijft.
