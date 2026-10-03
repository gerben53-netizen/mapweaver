# ADR-0005 — Permanente opslagarchitectuur van Mapweaver

- **Status:** Voorgesteld voor implementatie vóór v1.0
- **Datum:** 2026-09-23
- **Besluit:** SQLite en het lokale bestandssysteem zijn de bron van waarheid; IndexedDB is uitsluitend cache en herstelbuffer.

## Aanleiding

Mapweaver bewaart momenteel een belangrijk deel van zijn gegevens in browseropslag en gebruikt gedownloade `.mapweaver`-bestanden voor overdraagbare projectopslag. Dat past niet bij de gebruikersverwachting van **Opslaan**:

- een opgeslagen project moet na het sluiten van de browser permanent beschikbaar blijven;
- dezelfde projecten en assets moeten in verschillende browsers beschikbaar zijn;
- het leegmaken van de map Downloads mag geen normaal opgeslagen project verwijderen;
- stamps en fill patterns moeten voor ieder project beschikbaar blijven;
- browseropslag mag niet de enige kopie van onvervangbare gegevens zijn.

Een gewone webpagina kan niet zelfstandig en onbeperkt een database en bestanden op een willekeurige plek op het lokale bestandssysteem beheren. Daarom krijgt Mapweaver een lokale applicatieservice.

## Architectuurkeuze

Mapweaver bestaat uit twee lokale onderdelen:

1. **Browserclient**
   - React-editor en gebruikersinterface.
   - Communiceert uitsluitend via een lokale API met de applicatieservice.
   - Mag IndexedDB gebruiken voor cache, tijdelijke werkstatus en crash recovery.
   - IndexedDB is nooit de gezaghebbende opslag van projecten of assets.

2. **Lokale Mapweaver-service**
   - Draait alleen op `127.0.0.1` en serveert zowel de productiefrontend als de lokale API.
   - Beheert één SQLite-database.
   - Beheert een vaste lokale opslagmap voor assetbestanden, previews, exports en back-ups.
   - Is de enige component die rechtstreeks naar SQLite en de beheerde opslagmap schrijft.

Omdat de gegevens buiten het browserprofiel staan, gebruiken Chrome, Edge en Firefox dezelfde projecten en assetbibliotheek.

## Bron van waarheid

| Gegeven | Primaire opslag | IndexedDB |
| --- | --- | --- |
| Projectmetadata | SQLite | Leescache toegestaan |
| Kaartmodel, lagen en objecten | SQLite, transactioneel | Tijdelijke werk-/herstelkopie |
| Kaart- en rasterinstellingen | SQLite | Leescache toegestaan |
| Achtergrondkoppeling | SQLite | Cache toegestaan |
| Stampmetadata | SQLite | Doorzoekbare cache toegestaan |
| Fill-patternmetadata | SQLite | Doorzoekbare cache toegestaan |
| Originele afbeeldingsbestanden | Lokaal bestandssysteem | Blobcache toegestaan |
| Thumbnails/previews | Bestandssysteem, reproduceerbaar | Cache toegestaan |
| Undo/redo | Werkgeheugen | Optionele crash recovery |
| `.mapweaver`-bestand | Alleen import/export/back-up | Niet van toepassing |

## Lokale opslaglocatie

De service gebruikt een platformgeschikte gebruikersdatamap. Op Windows is dat bijvoorbeeld:

```text
%LOCALAPPDATA%\Mapweaver\
├── mapweaver.sqlite3
├── assets\
│   ├── originals\
│   └── previews\
├── backups\
└── logs\
```

De exacte locatie wordt in **Settings → Storage** zichtbaar gemaakt met acties als **Open data folder** en **Create backup**. De gebruiker kan later optioneel een andere opslaglocatie kiezen via een veilige migratieprocedure; Mapweaver accepteert niet zomaar losse, niet-gevalideerde paden.

## Datamodel op hoofdlijnen

### Projecten

Een project heeft minimaal:

- stabiele UUID;
- naam;
- projectformaatversie;
- kaartdocument of genormaliseerd kaartmodel;
- aangemaakt-op en gewijzigd-op;
- laatst-geopend-op;
- optionele preview;
- revisionnummer voor concurrencycontrole.

Normale acties zijn **New**, **Save**, **Save as**, **Open**, **Rename**, **Duplicate** en **Delete**. `Ctrl+S` schrijft naar SQLite en downloadt niets. Autosave schrijft afgeronde transacties naar hetzelfde projectrecord.

### Assets

Stamps, fill patterns en achtergronden gebruiken één assetregister met een expliciet type:

```text
stamp | fill-pattern | background
```

SQLite bevat minimaal:

- asset-UUID;
- type;
- gebruikersnaam en oorspronkelijke bestandsnaam;
- categorieën/tags;
- MIME-type;
- pixelafmetingen;
- bestandsgrootte;
- SHA-256-hash;
- relatief opslagpad;
- importdatum en wijzigingsdatum.

De originele bytes staan als bestand in `assets/originals`. Bestandsnamen op schijf worden intern gegenereerd; gebruikersnamen blijven metadata. Duplicaten worden primair via de inhoudshash herkend.

### Relaties

Projectobjecten verwijzen naar assets via stabiele asset-UUID's. Een project dat een achtergrond gebruikt, verwijst op dezelfde manier naar een asset. Verwijderen uit de bibliotheek is geblokkeerd zolang projecten het asset gebruiken, tenzij de gebruiker een expliciete veilige vervang- of verwijderactie uitvoert.

## Schrijfgedrag en integriteit

Een import wordt alleen als geslaagd beschouwd wanneer database en bestand consistent zijn:

1. valideer type, afmetingen en limieten;
2. bereken inhoudshash;
3. schrijf naar een tijdelijk bestand;
4. flush en verplaats atomair naar de definitieve locatie;
5. registreer metadata binnen een SQLite-transactie;
6. verwijder tijdelijke resten bij fouten.

Projectwijzigingen worden transactioneel opgeslagen. De service gebruikt databaseforeign keys, checksums en consistente foutafhandeling. Bij het opstarten controleert zij ontbrekende bestanden, verweesde bestanden en onvoltooide imports zonder automatisch gebruikersdata te vernietigen.

## Rol van IndexedDB

Bij het laden mag de browserclient projectindexen, thumbnails en benodigde assets vanuit de lokale service in IndexedDB cachen. Dit versnelt de interface, maar gelden de volgende regels:

- caches zijn volledig opnieuw opbouwbaar;
- cacheverlies veroorzaakt geen dataverlies;
- cache-inhoud krijgt een schema- en revisionnummer;
- de service wint altijd bij een conflict;
- de interface noemt cachegegevens nooit simpelweg **opgeslagen**;
- hersteldata wordt na succesvolle synchronisatie opgeschoond.

Als de service tijdelijk niet bereikbaar is, toont de client een duidelijke alleen-lezen- of herstelstatus. Hij doet niet alsof wijzigingen permanent zijn opgeslagen.

## Project- en bibliotheekbestanden

Bestanden blijven bestaan als expliciete overdrachts- en back-upfuncties:

- **Export project** maakt een zelfstandige `.mapweaver` met alle gebruikte assets.
- **Import project** valideert het bestand en maakt daarna een nieuw lokaal databaseproject.
- **Export library** maakt een overdraagbare bibliotheekback-up.
- **Import library** voegt assets samen en voorkomt duplicaten.
- **Back up all data** maakt een herstelbare back-up van database en assetbestanden.

Deze functies heten niet **Save** of **Open project**, omdat zij niet de normale dagelijkse opslagworkflow zijn.

## Gebruikersinterface

De primaire navigatie bevat **Projects**. Dit scherm toont lokale projecten met naam, preview, wijzigingsdatum en acties voor openen, hernoemen, dupliceren, exporteren en verwijderen.

De editor toont een eenduidige status:

- **Saving…**
- **Saved locally at 10:42**
- **Save failed — changes kept for recovery**

De Asset library vermeldt:

> Stored on this computer and available in every Mapweaver project.

Onder **Settings → Storage** staan opslaglocatie, gebruikte ruimte, back-updatum en integriteitscontrole.

## Beveiliging

De lokale service:

- bindt uitsluitend aan loopback en nooit standaard aan het LAN;
- accepteert alleen verwachte origins en HTTP-methoden;
- voorkomt path traversal en gebruikt uitsluitend paden onder de beheerde datamap;
- vertrouwt niet alleen op bestandsextensies, maar valideert inhoud en MIME-type;
- hanteert limieten voor bestandsgrootte, pixelafmetingen, aantallen en decomprimeren;
- serveert geüploade bestanden als data en nooit als uitvoerbare webcontent;
- logt geen afbeeldingsinhoud of gevoelige absolute paden.

## Back-up en herstel

SQLite alleen kopiëren is onvoldoende omdat assetbytes apart staan. Back-ups bevatten daarom altijd zowel database als assetmap en worden consistent gemaakt via de service. Automatische back-ups gebruiken rotatie; handmatige back-ups worden op een door de gebruiker gekozen locatie geplaatst.

Een herstelactie controleert eerst formaatversie, checksums, vrije schijfruimte en conflicten. De huidige data wordt niet overschreven voordat de nieuwe set volledig is gevalideerd.

## Migratie vanaf de huidige versie

1. Maak de lokale service, SQLite-schema's en assetopslag.
2. Detecteer bestaande Dexie-projecten en bibliotheekassets per browserprofiel.
3. Toon een eenmalige migratiewizard met aantallen, omvang en doelmap.
4. Kopieer en valideer eerst alle gegevens; verwijder niets uit IndexedDB.
5. Geef een migratierapport en laat de oude data als tijdelijke herstelbron staan.
6. Schakel pas daarna de serviceopslag als primaire bron in.
7. Importeer bestaande `.mapweaver`-bestanden via de normale importvalidatie.

Omdat browserprofielen elk een eigen IndexedDB kunnen bevatten, moet migratie in iedere eerder gebruikte browser eenmaal kunnen worden uitgevoerd. Duplicaten worden op hash en stabiele identificatoren samengevoegd.

## Afgewezen alternatieven

### Alleen IndexedDB

Afgewezen als bron van waarheid: browserprofiel- en origin-gebonden, onvoldoende zichtbaar voor back-upbeheer en niet gedeeld tussen browsers.

### Alleen gedownloade `.mapweaver`-bestanden

Afgewezen als normale workflow: downloads zijn moeilijk te beheren, kunnen worden opgeschoond en ondersteunen geen transparante projectlijst en betrouwbare autosave.

### Rechtstreeks bestandssysteemgebruik vanuit de webpagina

Afgewezen als algemene basis: browserondersteuning en toestemming verschillen, toegang kan worden ingetrokken en de webpagina kan geen centrale browseronafhankelijke database garanderen.

### Assets als blobs in SQLite

Voorlopig afgewezen: grote afbeeldingsbestanden zijn beter beheersbaar op het bestandssysteem. SQLite bewaart wel alle noodzakelijke metadata, relaties en integriteitsinformatie.

## Consequenties

### Positief

- werkelijk permanente lokale opslag;
- dezelfde projecten en assets in verschillende browsers;
- normale Save/Open-workflow zonder Downloads-map;
- centrale integriteitscontrole en back-up;
- IndexedDB kan veilig als vervangbare performancecache worden gebruikt.

### Negatief

- Mapweaver is niet langer alleen een statische webapp;
- installatie en lifecycle van een lokale service moeten worden ondersteund;
- database- en filesystemmigraties worden onderdeel van onderhoud;
- de service moet voor gebruik draaien;
- packaging, updates en platformtesten worden noodzakelijk.

## Acceptatiecriteria voor implementatie

- Een opgeslagen project is na browser- en computerherstart beschikbaar.
- Hetzelfde project en dezelfde assets zijn zichtbaar in ten minste Chrome en Firefox of Edge.
- `Ctrl+S` schrijft naar SQLite en veroorzaakt geen download.
- Het wissen van browseropslag verwijdert geen projecten of assets.
- Het wissen van Downloads verwijdert geen projecten of assets.
- Nieuwe stamps en fill patterns zijn na herstart in ieder project beschikbaar.
- Ontbrekende of beschadigde assetbestanden worden gemeld, niet stil genegeerd.
- Projectexport bevat alle gebruikte assets en kan op een schone installatie worden geïmporteerd.
- Een complete back-up kan database en assets op een schone installatie herstellen.
- Migratie uit de bestaande Dexie-opslag verliest of verwijdert geen brondata.


## Implementatieaanvulling — standaard-schaalmetadata (23 september 2026)

De aangevulde Sprint 12-opdracht reserveert standaard-schaalmetadata in het centrale assetregister. Schema 2 voegt sizingMode, defaultWidth/defaultHeight, sizingUnit, aspectRatioLocked en sizingScope toe. Defaults zijn native, lege maten/eenheid, vergrendelde aspectratio en any. De transactionele migratie behoudt bestaande bronafmetingen, projecttransformaties en plaatsingsgedrag. De velden zijn bibliotheekmetadata en worden meegenomen in volledige databaseback-ups; het overdraagbare projectformaat v2 verandert niet. Beheerinterface en kaarttypeprofielen blijven Sprint 23. Details en waarden staan in [local-storage.md](../architecture/local-storage.md#reserved-asset-sizing-metadata).
