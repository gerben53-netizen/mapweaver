# Opdracht voor assetproductie — Mapweaver Wall Material Pack

Gebruik deze instructie samen met `wall-set-v1.schema.json` en het voorbeeld `continuous-template/wall-set.json`. Het resultaat is een **importeerbare ZIP**, geen verzameling los op de kaart te plaatsen muur-stamps.

## Doel

Maak een hoogwaardig, generiek materiaal voor doorlopende battlemap-muren. Mapweaver tekent de architectuur als één bewerkbaar path. Het materiaal levert oppervlakken en optionele rand-/detailkanalen; het mag geen vaste muurvorm, vloer, deur of perspectivische gevel in de afbeelding bakken.

Voor de eerste productie zijn twee **afzonderlijke** packs gewenst:

1. **Living Root**: verweven hout-/wortelstructuur, natuurlijke vezelrichting, subtiele secundaire wortels en optioneel vegetatiedetail.
2. **Pale / Neutral Stone**: neutrale lichte steen, onregelmatige steenverbanden, bescheiden voegen, subtiele kleur- en vormvariatie.

Dit zijn namen en metadata van de packs. De renderer bevat geen speciale code voor deze materialen. Maak materiaalpresets binnen één pack; maak geen kopieën van het materiaal voor Clean/Natural/Ancient/Overgrown.

## Beeldvereisten

- Exact 90° top-down, zonder perspectief, horizon, tekst, raster, vloer of ornamenten buiten het materiaal.
- Geen directionele belichting of lange slagschaduwen. Alleen zeer subtiele, richtingonafhankelijke contactschaduw.
- Base/fill is een **oppervlaktetextuur**, geen smalle complete muurstrook met donkere eindlijnen. Het oppervlak moet zowel in X als Y kunnen herhalen. Wortel-/houtvezels lopen voornamelijk in positieve X-richting; steenverbanden mogen isotroper zijn.
- Geen korte opvallend identieke knopen, regelmatige toonrasters of sterke donkere strepen aan tegelranden. Lever bij voorkeur meerdere complementaire basisvarianten met dezelfde gemiddelde kleur en fysieke featuregrootte.
- Fill-afbeeldingen zijn bij voorkeur volledig opaak. Optionele edge/growth/overgrowth/detail-afbeeldingen gebruiken echte alpha-transparantie, zonder witte/zwart ingebakken achtergrond of donkere halo.
- Alleen PNG of lossless WebP. Een bruikbaar uitgangspunt is 256–512 pixels per oppervlak; maximaal 2048 per as. De huidige renderer gebruikt periodieke werktiles tot 512 px per as. Meer bronpixels betekenen daarom niet automatisch meer zichtbaar detail.
- Behoud leesbaarheid bij een fysieke resolutie van **10 map-pixels per voet**: 50 px = 5 ft. Een detail van 0,2 ft is op 100% slechts 2 px breed. Test ook 50% en speelzoom, niet uitsluitend grote close-ups.

## Kanalen en hun concrete betekenis

Alle bronafbeeldingen staan als entries in `bodyVariants` (historische veldnaam; bij `continuous` is dit de **componententabel**). `continuous.sources` verwijst met nulgebaseerde indices naar die tabel. Dezelfde entry mag door meerdere kanalen worden gebruikt. Laat een niet-geleverd kanaal weg; maak geen lege nepbestanden.

| Kanaal | Betekenis |
| --- | --- |
| `fill` | Verplicht. Doorlopend oppervlak binnen de geometrische muurband. |
| `variation` | Optionele materiaalvariatie; met Variation gemengd over de basis. |
| `mask` | Optioneel grijswaarde × alpha-masker voor Growth/Overgrowth. Wit laat detail door, zwart onderdrukt detail. Het snijdt **geen gaten** in de functionele muur. |
| `innerEdge`, `outerEdge` | Zachte randbehandeling voor respectievelijk de negatieve en positieve lokale Y-zijde van het pad. Geen volledige muurvorm. |
| `growth` | Secundaire structuur, gemengd volgens Growth; blijft binnen de muurband. |
| `overgrowth` | Vegetatie/detail, gemengd volgens Overgrowth; blijft binnen de muurband. |
| `endcap` | Lokale oppervlaktebehandeling bij een open uiteinde. |
| `insideCorner`, `outsideCorner` | Lokale oppervlaktebehandeling bij bochten. |
| `tee`, `crossing` | Lokale oppervlaktebehandeling bij passende T- en kruisverbindingen. |
| `opening` | Lokale behandeling van de wandrand bij een deur-/raamuitsparing. |

Deze componenten zijn **oppervlaktelagen**, geen complete vrijstaande geometrische junction-sprites. De engine maakt de vorm, clips en aansluitingen. Houd de lokale overlays kleurmatig compatibel met fill; een harde rechthoekige rand blijft zichtbaar. Afwezigheid van een gespecialiseerd kanaal gebruikt de continue basis zonder dat een decoratieve stamp nodig is.

## Pakketindeling

```text
wall-set.json
assets/fill-a.png
assets/fill-b.png
assets/edge-inner.png
assets/edge-outer.png
assets/growth.png
assets/overgrowth.png
```

ZIP uitsluitend de rootmanifest en alle daadwerkelijk genoemde afbeeldingen. Geen bovenliggende map, directory-entries, previews, README, scripts, SVG of verborgen bestanden in de ZIP. Bestandsnamen: ASCII letters/cijfers, `_` of `-`, maximaal 80 tekens vóór `.png`/`.webp`. Geen submappen onder `assets/`.

Maximaal 16 componententries; iedere bron 8–2048 px per as; maximaal 16.777.216 bron-/atlaspixels; uiteindelijke atlas maximaal 8192 px per as. De importer stapelt unieke bronnen verticaal met 2 px tussenruimte: houd de som van bronhoogtes + tussenruimte onder 8192. ZIP maximaal 32 MiB; atlas maximaal 20 MiB. Maximaal 16 presets en 8 materiaalopties.

## Manifest invullen

1. Gebruik `schemaVersion: 1`, `renderingMode: "continuous"` en `continuous.version: 1`.
2. Geef een stabiele, generieke `id`, bijvoorbeeld `living-root`, en een concrete `version`, bijvoorbeeld `1.0.0`. Verhoog de versie bij **iedere** wijziging aan beelden of metadata. Een bestaande revisie wordt nooit stil overschreven.
3. Vul title, description, author, source en license eerlijk in. Gebruik expliciet `Unspecified` wanneer een gegeven onbekend is; verzin geen licentie of auteursrecht.
4. Vul per component de **exacte** pixelafmetingen in. Voor de continue modus blijven `anchor`, `weight`, `rotation` en `scaleVariation` aanwezig voor het gedeelde containerformaat: gebruik centrum-anchor, weight 1, rotation 0 en scaleVariation 0. De continue engine gebruikt fysieke schaal en bronkanalen, geen losse plaatsing/rotatie van stukken.
5. Laat legacy `cap`/`join` weg. Gebruik `continuous.sources.endcap`, `.insideCorner`, `.outsideCorner`, `.tee` en `.crossing` waar nodig.
6. Kies `coreColor` passend bij de neutrale basistoon. Die vult transparantie in fill veilig op. `nominalWidthPx`, `defaultThickness`, `repeatLengthPx`, `overlapPx` en `roughnessLimits` blijven verplichte legacy-containervelden. Gebruik voor continuous `overlapPx: 0` en alle roughnesswaarden 0; daadwerkelijke schaal/breedte/organische parameters komen uit `continuous`.
7. `scale.unit` is `ft` of `m`. `textureLength` en `textureWidth` geven het fysieke formaat van een volledige bronperiode; ze wijzigen niet wanneer de wand breder wordt of de gebruiker zoomt. `organicWavelength` is de fysieke schaal van de coherente randvervorming; de renderer hanteert minimaal tweemaal de nominale wandbreedte om zaagtanden en omklappende randen te vermijden. `edgeWidth` is de fysieke breedte van de randbehandeling.
8. Geef `widths.thin/standard/heavy/massive` in dezelfde fysieke eenheid. Living Root-startwaarden: 1,5 / 3,5 / 6 / 10 ft. Stone kan eigen waarden hebben. Het zijn presets, geen globale beperkingen.
9. `supported` bevat alleen de bruikbare controls: `variation`, `organic`, `growth`, `overgrowth`. `defaults` en ieder presetobject bevatten altijd alle vier waarden, in bereik **0–1**. De UI toont percentages. Voor niet-ondersteunde controls moeten de waarden 0 zijn.
10. Materiaalopties zijn begrensde, declaratieve nummers met `id`, `label`, `target`, `min`, `max`, `default`. Ondersteunde doelen zijn `textureScale`, `edgeStrength` en `detailScale`; geen scripts of eigen shaders. Laat `options` leeg wanneer die niet nodig zijn.

De importer berekent zelf atlascoördinaten, alpha-hulls en de SHA-256-revisie. Voeg **geen** `rect`, `hull`, `revision`, `atlasWidth` of `atlasHeight` toe aan het aangeleverde bronmanifest.

## Verplichte controle vóór levering

Importeer via **Wall → Choose wall set → Import wall set**, inspecteer de preview en bevestig. Test een kaart van ongeveer 40 × 30 ft met uitsluitend native muren: lange S-curve, binnen- en buitenbocht, gesloten vorm, open uiteinde, twee openingen, scheidingswand, T-junction, crossing en een Heavy/Massive deel.

Controleer 100%, 50%, normale editorzoom en circa 75% speelzoom. Geen zichtbare tegelnaden, korte herhaalde knopen, toonraster, donkere overlapblokken, uitgerekte openingen of zwevende fragmenten. Test breedtepresets, Organic 0/100, alle ondersteunde parameters en expliciet Randomize variation. Bewaar/heropen en vergelijk PNG 1× en 2×. Gebruik **geen** extra root/wall stamps om fouten te maskeren.

Lever buiten de ZIP ook een kort rapport met materiaalnaam/versie, componenten, fysieke schaal, presets, bekende beperkingen en benchmarkbeelden. Definitieve visuele goedkeuring vereist deze productiebeelden; de meegeleverde development fixtures zijn alleen voor systeemvalidatie.
