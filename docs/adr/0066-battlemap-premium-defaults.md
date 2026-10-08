# ADR-0066 — Premium renderingdefaults voor alle battlemaps

Status: geaccepteerd, 2026-10-08.

## Besluit

Deze sprint vervangt de OFF-default van ADR-0065. Alle bestaande en nieuwe battlemaps zonder expliciete override gebruiken ARL C voor Voorbeeld, PNG en Campfirebitmap. Bewerken blijft native en berekent geen volledige ARL. Regional/World behouden OFF en hun eerdere Soft Shadow-default.

Eén resolver, `effectiveRendering(map)`, combineert opgeslagen overrides met kaartmodedefaults. Ontbrekend mapType betekent de bestaande Battlemap-semantiek. Optioneel `map.rendering.arl` bewaart OFF/B/C. Het veld wordt gevalideerd, gearchiveerd en via de bestaande mapinstellingen en undo/redo gewijzigd. Het is een optionele uitbreiding van formaat 12; oudere applicatiebuilds kennen deze override niet en kunnen zo'n document afwijzen. Er is geen datamigratie of bulkoverschrijving.

`map.effects.stampSoftShadow` blijft een expliciete instelling met enabled/intensity. Ontbrekend betekent aan op Battlemap (intensiteit 0.25), uit op Regional/World. Bestaand enabled:false blijft uit, ongeacht de oorspronkelijke reden. Individueel `effects.softShadow` is default/on/off: on/off gaan vóór de kaartinstelling. null en booleans zijn geen geldige individuele waarden en worden niet geïnterpreteerd of herschreven. Environmental Detail en generatorcomponenten doorlopen de gewone Stamp-renderer niet.

## Inspectie en veiligheid

Primary bevat 25 kaarten (19 Battlemap, 5 World, 1 Regional), 727 assets, 43 categorieën en 375 stamps. Alle kaarten missen rendering. 354 stamps missen softShadow, 18 bewaren off, 3 on. 18 kaarten missen de globale shadowinstelling; 7 bewaren enabled:true. Geen aangetroffen false/null/boolean-ambiguïteit wordt overschreven. De resolver verandert geen IDs, geometrie, assetreferenties of documenten; daarom geen Primary-migratie of schrijf-backup. QA gebruikt database-/assetkopieën; de oorspronkelijke directory en het Campfire-contract worden met inhoudshashes gecontroleerd.

## Rendering en lifecycle

Voorbeelddiagnose is tijdelijk en wordt bij sessiewissel gereset. De defaultoptie volgt de opgeslagen kaartoverride. Exportdialogen starten met diezelfde resolver en mogen voor die uitvoer expliciet afwijken; de tijdelijke Preview-keuze beïnvloedt ze niet. Cachekeys en snapshots omvatten de opgeslagen override en het effectieve profiel. Save/autosave blijft onafhankelijk van HQ-rendering.

De bestaande ARL-profielen blijven ongewijzigd: native contactschaduw bij OFF, één ARL-contactschaduw bij ondersteunde B/C-batches. C voegt alleen de reeds geaccepteerde materiaalbewuste edge/mass toe. Living Root/Natural Cave Rock behouden de beschermde organische profielen zonder nieuwe edge/mass. Native fallback blijft voor niet-ondersteunde scopes gelden. Canonieke Campfire v3-semantiek en contractbestanden wijzigen niet.

Bewijs en meetresultaten: ignored `deliverables.local/Battlemap-Premium-Rendering-Defaults/`.
