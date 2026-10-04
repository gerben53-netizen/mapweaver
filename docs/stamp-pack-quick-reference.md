# Stamp Pack quick reference

Bron: src/domain/stampTaxonomy.json; wijzig het register, niet losse UI-lijsten. Zie stamp-importer.md voor het volledige manifest en updategedrag.

Minimaal modern manifest:

```json
{
  "schemaVersion": 3,
  "pack": {
    "id": "library",
    "revision": 1
  },
  "assets": [
    {
      "id": "shelf",
      "file": "images/shelf.png",
      "type": "stamp",
      "title": "Boekenkast",
      "categoryId": "bookcases",
      "tags": [
        "paleis",
        "bibliotheek"
      ]
    }
  ]
}
```

| ID | Nederlands pad |
| --- | --- |
| architecture | Architectonische objecten |
| decoration | Decoratie |
| misc | Diversen |
| kitchen | Keuken & voedsel |
| furniture | Meubilair |
| nature | Natuur & vegetatie |
| storage | Opslag |
| textiles | Textiel |
| lighting | Verlichting |
| craft | Werk & ambacht |
| building-parts | Architectonische objecten / Bouwonderdelen |
| floor-materials | Architectonische objecten / Vloermaterialen |
| floor-transitions | Architectonische objecten / Vloerovergangen |
| ornaments | Decoratie / Ornamenten |
| floor-traces | Decoratie / Vloersporen |
| backgrounds | Diversen / Kaartachtergronden |
| kitchen-fixtures | Keuken & voedsel / Keukenvoorzieningen |
| vessels | Keuken & voedsel / Vaten & vaatwerk |
| food-preparation | Keuken & voedsel / Voedsel & bereiding |
| beds | Meubilair / Bedden |
| tables-desks | Meubilair / Tafels & bureaus |
| seating | Meubilair / Zitmeubilair |
| atlas-landmarks | Natuur & vegetatie / Atlaslandmarks |
| mountains-rocks | Natuur & vegetatie / Bergen & rotsen |
| forests | Natuur & vegetatie / Bossen |
| wood-fuel | Natuur & vegetatie / Hout & brandstof |
| swamps | Natuur & vegetatie / Moerassen |
| plants | Natuur & vegetatie / Planten |
| volcanoes | Natuur & vegetatie / Vulkanen |
| roots-rocks | Natuur & vegetatie / Wortels & rotsen |
| bookcases | Opslag / Boekenkasten |
| cabinets-chests | Opslag / Kasten & kisten |
| fabric-rope | Textiel / Stoffen & touw |
| rugs | Textiel / Tapijten |
| lamps-candlesticks | Verlichting / Lampen & kandelaars |
| books-documents | Werk & ambacht / Boeken & documenten |
| study-tools | Werk & ambacht / Gereedschap & studie |

Klassen: furniture, storage, large_fixture, tabletop_prop, floor_decal, decoration; optionele lowercase/underscore-semanticClass, geen categorie.

Checklist: exacte relatieve PNG-paden; unieke stabiele IDs; positieve packrevision; canonieke objectcategorie; context als tags; world/grid/native schaal; optionele softShadowDefault; rechten/hash; preview; onbekende mapping; review; bevestiging.

Veelgemaakte fouten: Palace als categorie, packnaam als categorie, ontbrekend PNG, gewijzigde pixels onder dezelfde revision, dubbele asset-ID, onjuiste schaaleenheid.


## Families

Gebruik `families[]` naast `assets[]`, met pack-ID/revision, gedeelde metadata en stabiele variant-ID’s/file/weight. Exact voorbeeld, validatie, PQA-eisen en revisiebeheer: [Stamp Families en varianten](stamp-importer.md#stamp-families-en-varianten). Eén fysieke footprint en gecentreerde anchor; identieke PNG-canvasafmetingen; cover blijft stabiel. Geen variant-overrides of gewijzigde pixels onder een bestaande variant-ID.
