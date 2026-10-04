# Stamp Packs importeren

## Wat is een Stamp Pack?

Een ZIP met herbruikbare afbeeldingen en een `mapweaver-assets.json`-manifest. Een stamp is een zelfstandig plaatsbaar object; een collection organiseert assets, niet categorieën of kaartlagen. Deze handleiding beschrijft de normale Stamp-import. Gespecialiseerde wall packs behouden hun eigen formaat.

## Wat gebeurt er bij import?

Open Asset library → Stamps → Import. Kies een ZIP. Mapweaver controleert bestanden en metadata zonder ze op te slaan. Bekijk de categorieën, genormaliseerde tags, INFO-meldingen, waarschuwingen en fouten. Kies bij iedere onbekende categorie een bestaande canonieke categorie. Klik **Review resolved changes**, controleer het resultaat en bevestig. Een gewijzigde mapping maakt de eerdere review ongeldig.

## ZIP-structuur

```text
mapweaver-assets.json
images/boekenkast.png
```

Padnamen zijn exact en relatief aan de ZIP-root. Geen `..`, absolute paden, dubbele Windows-padnamen of symlinks. Maximaal 128 MiB uitgepakt, 20 MiB per bestand en 1.000 assetentries. Bestaande loose images, schema 1/2/3 en enkelvoudige `.mapweaver.json`-sidecars blijven ondersteund. Een sidecar moet exact bij het bronbestand horen. Bij conflicterende sidecar/collection-metadata moet de gebruiker expliciet kiezen welke bron wordt gebruikt.

## Manifest

```json
{
  "schemaVersion": 3,
  "pack": { "id": "palace-library", "revision": 1 },
  "collection": { "title": "Paleisbibliotheek" },
  "assets": [{
    "id": "curved-bookcase",
    "file": "images/boekenkast.png",
    "type": "stamp",
    "title": "Gebogen boekenkast",
    "categoryId": "bookcases",
    "tags": ["paleis", "bibliotheek", "Eldric"],
    "semanticClass": "storage",
    "softShadowDefault": true,
    "defaultSize": { "mode": "world", "width": 20, "unit": "ft", "lockAspectRatio": true },
    "applicableMapTypes": ["battlemap"]
  }]
}
```

`schemaVersion`, `assets`, `file` en `type` zijn vereist. Moderne packs gebruiken bovendien `pack.id`, positieve gehele `pack.revision`, asset-`id` en `categoryId`. Een externe asset-ID is in deze sprint uitsluitend voor stamps ondersteund en vereist een pack-identiteit. IDs gebruiken 1–80 letters/cijfers/underscore/koppelteken. Bestaande packs zonder deze velden blijven via expliciete legacy-regels leesbaar. Een naamloze entry krijgt een naam uit het bestand; de bestandsmap bepaalt nooit een categorie. Optionele `sha256` controleert de exacte afbeelding. De downloadbare JSON Schemas onder `public/asset-templates/` en de runtimevalidator zijn bijgewerkt; runtime voert aanvullende categorie-, identiteit-, bestand- en conflictcontroles uit.

## Asset-ID versus naam

Een technische asset-ID blijft stabiel bij naamswijzigingen. De externe identiteit is `(pack.id, asset.id, pack.revision)`; de lokale bibliotheekreferentie is een afzonderlijke ID. `title` is de zichtbare naam. Titels hoeven geen technische IDs te zijn. Dubbele asset-IDs binnen een manifest worden geweigerd. Twee verschillende packs hebben verschillende namespaces.

## Categorieën / categorie versus tag

**Categorie = wat voor soort object? Tag = waar, waarvoor, welke stijl/context?**

Een paleisboekenkast hoort in `bookcases` — Opslag / Boekenkasten, met tags `paleis`, `bibliotheek`, `Eldric`. `Palace`, `Library` en `Eldric` zijn geen objectcategorieën. Bekende contextdelen van oude categoriepaths worden als tags gerapporteerd, niet als nodes aangemaakt. Een los contextwoord heeft nog een expliciete objectmapping nodig. Onbekende woorden worden niet geraden uit namen of bestanden.

## Canonieke categorieën

De enige bron is [stampTaxonomy.json](../src/domain/stampTaxonomy.json): de 27 beoordeelde categoriepaden uit de audit van 3 oktober 2026, plus hun ouders, actieve status en expliciete aliases. `stampTaxonomy.ts` gebruikt dit register voor importkeuzes en normalisatie. De import materialiseert alleen benodigde registerpaden in de bibliotheek; bestaande lokale IDs voor dezelfde paden blijven behouden. Zie de compacte ID-lijst in [de quick reference](stamp-pack-quick-reference.md).

Een nieuwe canonieke categorie vereist een bewuste repositorywijziging aan het register, met objectsemantiek, parent, unieke ID, Nederlandse naam, aliases en gerichte tests. Import heeft geen vrije invoer om dit te omzeilen. Historische bibliotheekcategorieën blijven bestaan voor oude assets en filters. De bestaande aparte categoriebeheerfuncties zijn niet verwijderd; zelf aangemaakte categorieën worden daardoor niet automatisch canoniek voor packs.

## Onbekende categorie

Een onbekende ID/path blokkeert review en bevestiging tot een mapping is gekozen. Het dropdownmenu gebruikt uitsluitend actieve registercategorieën. Mapweaver maakt niet stilzwijgend Diversen aan. Oudere entries zonder categorie gebruiken de expliciet gekozen bestaande bestemming (standaard Uncategorized); dit is de legacy/loose-imagegrens en geen mapping van een onbekende waarde. `categories`-declaraties in stamp-packs worden als INFO gemeld en creëren geen nodes. Een pack zonder ondersteunde assets (alleen categoriedeclaraties) wordt geblokkeerd. `createCategories` of een root prefix omzeilt de stampregels niet.

## Tags

Spaties worden getrimd, casing genormaliseerd, bekende audit-aliases vertaald en doublures verwijderd. `Palace`, `palace`, `Paleis` worden `paleis`; bekende eigennamen zoals Eldric behouden hun afgesproken spelling. Onbekende zinvolle tags blijven toegestaan, in kleine letters. Maximaal 30 tags van elk 80 tekens. Preview toont het concrete resultaat. Zoekopdrachten ondersteunen oorspronkelijke én bekende aliasspellingen; oude assetrecords worden niet massaal herschreven.

## Schaal en fysieke afmetingen

`defaultSize.mode` is `native`, `grid` of `world`. Grid gebruikt `cells`; world gebruikt `ft` of `m`. Met `lockAspectRatio: true` volstaat één maat; twee opgegeven maten moeten de bronverhouding binnen 0,1% volgen. Zonder lock zijn beide maten vereist. Schaalmetadata bepaalt nieuwe plaatsingen; bestaande objectafmetingen wijzigen niet. `applicableMapTypes` bevat battlemap/regional-map/world-map of is leeg voor universeel.

## semanticClass / softShadowDefault

`semanticClass` is optioneel: een technische klasse met kleine letters/underscore, bijvoorbeeld `furniture`, `storage`, `large_fixture`, `tabletop_prop`, `floor_decal`, `decoration`. Het is geen categorie en creëert geen taxonomy node. `softShadowDefault` is optioneel boolean: true voor verhoogde props/meubilair, false voor platte decals. Deze velden worden opgeslagen in de bestaande quality-metadata met KEEP en reden 'Pack author metadata'. Bestaande volledige `quality`-metadata blijft ondersteund; een pack kan inactieve/REPLACE/REJECT-status niet via een metadata-overschrijving reactiveren. De producer moet objectclassificatie zelf zorgvuldig onderbouwen.

## PNG/alpha

Gebruik bij voorkeur transparante PNGs met de volledige, consistente objectfootprint, zonder vloerachtergrond of ingebakken cast shadow. De importer controleert echte beeldinhoud, afmetingen, grootte en eventuele hash. JPEG/WebP blijven legacy-ondersteund. Import genereert thumbnails maar wijzigt de originele pixels niet; het certificeert geen Premium visuele kwaliteit.

## Duplicaten en versies / pack bijwerken

Dezelfde pack/asset/revision met dezelfde beeldhash is een exact duplicaat. Dezelfde identiteit met andere pixels of type wordt geblokkeerd. Een nieuwere revision met gewijzigde pixels krijgt een nieuwe lokale afbeeldingsreferentie; de oude blijft resolvable voor bestaande kaarten. Een oudere ongekende revision wordt geweigerd; een bekende oude revision blijft leesbaar. Verwijderde entries uit een nieuw manifest worden niet uit de bibliotheek verwijderd. Een conflicterende, ongerelateerde toepassing van dezelfde identiteit mag niet door alleen een revisionverhoging worden vermomd: packauteurs beheren deze semantische identiteit.

Legacy duplicaten worden op type + SHA-256 herkend. De keuze Keep/Fill/Overwrite regelt alleen expliciete metadata voor bestaande beelden; ontbrekende velden wissen niets. Inactieve kwaliteit blijft intact. Eerder expliciet verwijderde legacy-assets kunnen volgens de bestaande herstelregels dezelfde lokale ID terugkrijgen; dit is geen automatische REPLACE-reactivering. Identiteitsbindingen blijven in SQLite en volledige backups; algemene bibliotheekexports leveren interoperabele legacy entries op hash/pad, geen multi-pack identiteitsmanifest. Kaartprojecten bewaren hun exacte assetreferenties en pixels.

## Foutmeldingen / importresultaat

ERROR blokkeert: ongeldige JSON/schema, ontbrekend beeld, onveilige ZIP, hashconflict, duplicate-ID of immutable-revisionconflict. Een onopgeloste categorie blokkeert totdat mapping klaar is. WARNING kan bijvoorbeeld een gelijke titel voor andere pixels melden. INFO beschrijft tagnormalisatie en genegeerde categoriedeclaraties. Review is een database-rollback zonder beeldwrites; finale import schrijft alle entries in één transactie, met journal/cleanup voor nieuwe bestanden bij fouten. Resultaat toont nieuwe assets, metadata-updates en behouden duplicaten plus gecontroleerde mapping/tags. Dezelfde beelden kunnen metadata-updates hebben: 'bijgewerkt' is een deel van de teller 'bestaande beelden'.

## Wat gebeurt er met bestaande kaarten?

Geen maprewrite, reset, beeldvervanging of massamigratie. Oude lokale asset-IDs en bytes blijven geldig; de governance raakt nieuwe imports. SQLite-schema 11 voegt alleen een pack/revisionbindingstabel toe. Oudere executables kunnen schema 11 niet openen; gebruik de bijbehorende applicatieversie.

## Goed/fout en volgende PQA-fase

Fout: categorie Palace / Library / Eldric. Goed: `categoryId: "bookcases"`, naam Gebogen boekenkast, tags paleis/bibliotheek/Eldric, expliciete fysieke maten en bronrechten. Houd pack-ID/asset-ID stabiel, verhoog revision bij een bewuste update en controleer preview/mapping voor bevestiging. Laat toekomstige PQA-families hetzelfde object, footprint en anchor delen. Het REPLACE-backlog en Family/Variant-model worden in afzonderlijke sprints uitgevoerd; bestaande legacy-IDs blijven nodig voor oude kaarten.


## Stamp Families en varianten

Een Stamp Family bundelt varianten van **hetzelfde semantische object** tot één kaart in de picker. Een familie met zes actieve beelden toont `×6`; zoeken op naam, categorie, tags en semanticClass vindt de familie één keer. De eerste cover blijft vast en wordt niet willekeurig gekozen.

Voorbeeld van `mapweaver-assets.json` (de genoemde PNG's moeten werkelijk in de ZIP staan):

```json
{
  "schemaVersion": 3,
  "pack": { "id": "palace-bookshelves", "revision": 1 },
  "assets": [],
  "families": [{
    "id": "palace-bookshelf",
    "displayName": "Palace bookshelf",
    "categoryId": "bookcases",
    "tags": ["paleis", "bibliotheek"],
    "semanticClass": "storage",
    "softShadowDefault": true,
    "anchor": "center",
    "coverVariantId": "full",
    "defaultSize": { "mode": "world", "width": 10, "height": 5, "unit": "ft", "lockAspectRatio": true },
    "applicableMapTypes": ["battlemap"],
    "variants": [
      { "id": "full", "file": "images/full.png", "weight": 2, "label": "Full shelves" },
      { "id": "sparse", "file": "images/sparse.png", "weight": 1, "label": "Sparse shelves" }
    ]
  }]
}
```

Importeer via hetzelfde Import assets → preview → Review resolved changes → Confirm import-pad. Category ID/path moet canoniek of expliciet gemapt zijn. Elke variant heeft een unieke ID en eigen PNG; standaardgewicht is 1, toegestane positieve gewichten zijn maximaal 10.000. Family-ID en `familyId_variantId` moeten veilige identifiers van maximaal 80 tekens zijn. Maximaal 64 varianten inclusief behouden deprecated beelden. Duplicate family/variant IDs, ongeldige cover, ontbrekende afbeeldingen, verschillende canvases, foutieve footprints en conflicterende revisies blokkeren de batch. Per-variant semantische/default-size-overrides zijn verboden.

PQA-authoring: identieke objectrol, fysieke breedte/hoogte, gecentreerde anchor, canvasafmetingen, lichtbehandeling en art direction. Alleen inhoudsvariatie binnen hetzelfde functionele silhouet. Kleine alpha-afwijkingen mogen; crop geen variant afzonderlijk naar een ander canvas. Gebruik geen willekeurige meubels met verschillende footprints als één familie. De importer controleert techniek; de producent blijft verantwoordelijk voor visuele/semantische equivalence.

Bij plaatsing wordt één actieve variant gewogen gekozen en direct opgeslagen. Pannen, zoomen, redraw, PNG, reload en heropenen kiezen nooit opnieuw. Kopiëren/dupliceren behoudt de keuze. Properties → Variant kiest expliciet; Andere variant kiest gewogen uit andere actieve varianten wanneer beschikbaar. Beide behouden positie, rotatie, spiegeling, afmetingen, laag, zichtbaarheid en persoonlijke schaduwinstellingen; één wijziging is één undo-stap. Voor meerdere geselecteerde stamps zijn variantcontrols in v1 verborgen.

Een nieuwe packrevision kan varianten toevoegen of met `deprecated: true` uitsluiten van automatische nieuwe plaatsing. Weggelaten oude varianten blijven als deprecated behouden. Bestaande objecten bewaren hun eigen snapshot en gekozen variant. Een stabiele variant-ID mag nooit een andere afbeelding krijgen; nieuwe artwork krijgt een nieuwe variant-ID. De cover blijft gelijk. Gedeelde footprint, categorie, semanticClass, schaduw-default en kaarttypes blijven gelijk; bestaande maps worden niet herschreven. Familieonderdelen kunnen in v1 niet afzonderlijk worden verwijderd of los gewijzigd.

Projectsave en portable `.mapweaver` bevatten de familie-snapshot en de benodigde PNG's; variantkeuze blijft daardoor ook op een andere pc bewerkbaar. Familie-ZIP-export groepeert de beelden opnieuw en ondersteunt één pack/revision per export. Bestaande losse stamps blijven normale losse stamps. De volledige PQA REPLACE-backlog wordt hiermee niet automatisch geconsolideerd.
