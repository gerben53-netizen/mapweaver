# ADR-0065 — Bewerken, Voorbeeld en expliciete exportprofielen

Status: geaccepteerd, 2026-10-08. De OFF-default en afwezigheid van persistente profielen zijn vervangen door [ADR-0066](0066-battlemap-premium-defaults.md); de lifecycle en renderergrens hieronder blijven gelden.

## Besluit

Bewerken gebruikt de bestaande native muurartwork en goedkope contactschaduw; volledige ARL-composities worden uitsluitend on-demand voor Voorbeeld en export gemaakt. De bestaande generator, openinguitsneden, ARL-profielen en scenevolgorde blijven leidend. Er komt geen tweede muurengine of nieuw persistent kaartveld.

Dit besluit vervangt in ADR-0064 de gelijktijdige ARL-editorcompositie, de keuze via Map actions en de impliciete overname van de sessiekeuze door export. De overige geometrie-, ownership- en veiligheidsregels van ADR-0064 blijven gelden.

Voorbeeld gebruikt `exportPng` en toont de resulterende fysieke bitmap met de bestaande kaartcamera. Bewerkgereedschappen, mutatiesneltoetsen en inspector zijn tijdens Voorbeeld niet bedienbaar. Selectie en camera blijven behouden. Een mapwissel keert terug naar Bewerken. Save/autosave blijft canonieke kaartdata opslaan zonder verplichte HQ-render. Lopende native gestures worden eerst afgerond; een onafgeronde transactie verhindert de moduswissel.

## Profielen en compositie

Voorbeeld kiest tijdelijk OFF/B/C en 1×/2×. PNG- en beide Campfire-exportdialogen hebben een eigen expliciet profiel, standaard OFF. Een tijdelijke Preview-keuze verandert geen export. OFF heeft de native contactschaduw; B/C gebruiken ruwe generatorartwork zonder die schaduw en vervolgens de bestaande compositor. Onzekere/unsupported scopes behouden native fallback. Schaduwen worden niet dubbel toegepast.

De werkelijke volgorde blijft die van `exportScene`: achtergrond/base paint, raster indien onder objecten, geordende native Areas en paint-/terrainstrata, Environmental Floor en Edge vóór de eerste structuur, muur/ARL-batches op hun oorspronkelijke z-positie, openingen en overige objecten, bovenraster, kaartafwerking en optionele schaalbalk. Niet-muur-objecten en tussenliggende renderstrata breken ARL-batches. Labels en decoraties blijven native fysieke inhoud; selectie, brushcursor, Ceiling-overlay en lighting-preview ontbreken in playeroutput. Semantische Campfire-belichting wordt niet ingebakken.

## Lifecycle en geldigheid

HQ-output is een runtime-only LRU van maximaal vier gecodeerde PNG's en 32 MiB, inclusief de geschatte UTF-16-sleutelgrootte. Sleutels omvatten mapId, assetgeneration, de volledige canonieke snapshot en expliciete outputopties (ARL, schaal, raster, transparantie, schaalbalk). Conservatieve invalidatie verkiest correctheid boven partiële reuse. Camera, selectie en tools staan buiten deze snapshot. Bestaande ARL-, generator- en Environmental Detail-caches blijven afzonderlijk begrensd.

Renderwerk wordt geserialiseerd. Identieke queued requests delen een cachehit; fouten worden niet opgeslagen. Mapwissel/reload en assetvervanging/verwijdering wissen outputs en annuleren lopend werk via een epoch. Native edits veranderen de snapshotkey. Interactieve callers controleren snapshot, sessie en assetgeneration vóór werk, bij cooperative checkpoints en vóór download/publicatie. Voorbeeld verbergt een resultaat zodra zijn key veroudert. Stale requests leveren een begrijpelijke fout; retry is veilig.

ARL-masker-/afstand-/shadingwerk gebruikt dezelfde generatorstappen voor sync en async uitvoering, met begrensde checkpoints. Native generated surfaces worden vooraf cooperatief voorbereid. De definitieve Konva-compositie en PNG-encoding blijven browserwerk, geen worker of realtime lighting-engine. Wanneer voorbereid ARL-werk niet binnen de cache past, stopt HQ met een fout en het advies OFF/een eenvoudiger kaart te kiezen; geen onbeperkte synchrone herberekening.

Een grote Preview kan één gedecodeerde kaartbitmap vasthouden zolang de view open is. Cleanup geeft object-URL en canvasbuffers vrij. Export behoudt zijn bestaande 32 miljoen pixels, 16.384-pixel edge en 512 MiB geschatte working-memorygrenzen; cachebudget is geen garantie voor totaal browsergeheugen.

## Environmental Detail-resolutie

Voorheen gebruikte Bewerken/1× een 1× offscreen wereldtile en 2× export een 2× tile. Herhaalde alpha- en blendpasses werden daardoor op verschillende rasters berekend. Alle drie pipelines gebruiken nu vaste 2× wereldtiles, ook voor development Surface Variation en production decals. Uitsluitend de definitieve output verandert van schaal. Strokes, seeds, varianten, posities en bron-PNG's wijzigen niet. Bestaande 32 MiB tile-LRU blijft gelden; grotere tiles verminderen het aantal resident tiles.

Pixelidentiteit wordt uitsluitend op dezelfde outputresolutie beoordeeld. Een naar 1× genormaliseerde 2× bitmap kan raster-/filterverschillen bevatten; deze worden afzonderlijk gerapporteerd. Er is geen presetcompensatie of artworkcorrectie.

## Campfire en acceptatie

Campfire krijgt één snapshot voor canonieke v3 JSON en fysieke bitmap; initial door artwork behoudt de bestaande gesloten pose. Payloadvalidatie, stabiele identiteiten, revision en DM-review blijven ongewijzigd. Profielkeuze verandert geen walls/doors/windows/ceiling/lights-semantiek. Het gekoppelde contract is immutable. Geen echte API-publicatie is onderdeel van deze sprint.

Bewijs en hardwaremetingen staan ignored in `deliverables.local/Edit-Preview-ARL-Export/`. Status: PASS WITH NOTE wegens circa 1,6–2,2 s koude B/C-preview op de 72-murenkaart; Edit heeft geen volledige ARL-build en browserframes blijven lopen. OFF blijft standaard. Een apart besluit is nodig voor productieactivering van B/C.
