# Functionaliteit en workflow

Status: A = aanwezig en in dit voorbeeld gebruikt; G = gedeeltelijk; B = broncode/bestaande gerichte test, niet volledig interactief geverifieerd; O = ontbreekt als gespecialiseerde functie; NV = niet verifieerbaar in deze audit.

| Onderdeel | World | Regional | City | Battle | Bewijs / praktische consequentie |
|---|---|---|---|---|---|
| Canvas, zoom, fit, schaal | A | A | A via Regional | A | vier editorscreenshots, geography.ts/mapSettings.ts; battle 100/75/50 |
| Eigen kaartmodus | A | A | O | A | domain/mapCapabilities.ts; geen city-map enum |
| Areas, polygonen/gaten, fills | A/B | A/B | A/B | A/B | createArea + parseProject; gaten/maskers niet individueel UI-getest |
| Landmass/biome-geometrie | A | A | G | n.v.t. | world/generate.ts v2; kust/lake rastervorm zichtbaar |
| Wegen, rivieren, grenzen | A | A | G: generic Path | n.v.t. | domain/routes.ts; City mist netwerk-/perceelworkflow |
| Generated Wall en openingen | n.v.t. | n.v.t. | G: generic fortification Path | A | native pale-palace-stone production-2, 2 doors; walls/openings tests |
| Premium stamps/families | G | G | O voor daken/bouwblokken | A | asset-inventory.json; concrete familyvarianten in archive |
| Transformaties/varianten | A/B | A/B | A/B | A/B | native bounds/rotatie, stampFamilies tests; geen volledige UI-transformatiesuite |
| Brushes / scatter | A scatter, B brush | G: defaults falen; handmatig alternatief | O gespecialiseerde city-layout | B texture/environment brush | world/scatterWorld.ts, terrainPaint/texturePaint; niet afwezig verklaren |
| Labels/markers/compass | A | A | A labels/compass | beschikbaar, niet nodig | native annotations, 3 atlasplaatsen; automatische labels bestaan maar niet als volledige cartografische proef gebruikt |
| Frames / schaalbalk / legenda | A frame/bar; B legenda | A frame/bar; B legenda | A bar; B legenda | B | domain/decorations.ts en export/render.ts; weinig decoratie betekent geen functieleemte |
| Lagen / groepen / snapping | A lagen, B rest | A/B | A/B | A/B | opgeslagen layerTree; generieke grouping/snapping aanwezig |
| Undo / redo | B | B | B | B | architectuur/history aanwezig; niet ieder voorbeeld via drag/undo UI doorlopen |
| Prefabs | B | B | B | B | bestaande importer/rendercode; runtimebibliotheek bevat 0 prefabs |
| Archive save/reload | A | A | A | A | echte encode/decode + PNG-hashcontrole |
| Autosave / runtimeherstart | NV | NV | NV | NV | niet afleiden uit gekopieerde Saved-header |
| PNG UI-export | A 1800×1200 | A 1800×1200 | A 1600×1100 | A 1400×1000 | echte downloads, geen los test-render als export uitgegeven |
| Preview eindkwaliteit | bron gedeelde pipeline | bron gedeelde pipeline | bron gedeelde pipeline | A ARL C | MapPreview.tsx roept exportPng aan; geen universele pixelpariteitsclaim |

Bronnen: src/domain/mapCapabilities.ts, areas.ts, paths.ts, routes.ts, walls.ts, openings.ts, annotations.ts, markers.ts, rendering.ts, terrainPaint.ts; src/world/*; src/projects/archive.ts en session.ts; src/canvas/MapCanvas.tsx en MapPreview.tsx; src/export/render.ts. B-status is bewust geen interactief acceptatiestempel.
