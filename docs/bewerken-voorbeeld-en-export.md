# Bewerken, Voorbeeld en export

Mapweaver opent in **Bewerken**. Je ziet de normale muurartwork, vloeren, decals en stamps en gebruikt de bestaande gereedschappen. Opslaan en autosave bewaren kaartdata; daarvoor hoeft geen hoogwaardig voorbeeld te worden berekend.

Kies boven het canvas **Voorbeeld** om de actuele fysieke kaart zonder selectiekaders, penseelcursor, Ceiling-overlay of editorbelichting te bekijken. Deze modus is alleen lezen. Muiswiel zoomt, Space + slepen of de middelste muisknop verschuift, en Fit of F zet de kaart passend in beeld. Terug naar Bewerken behoudt camera en selectie. Een andere kaart openen keert terug naar Bewerken.

Het voorbeeld wordt indien nodig opgebouwd. Ongewijzigde kaarten hergebruiken hun cache. Bij een fout kun je **Opnieuw proberen** kiezen; kaartdata wordt niet gewijzigd. Als de kaart tijdens een export verandert, wordt het verouderde resultaat geweigerd. Maak dan een nieuwe export.

## ARL en resolutie

Voorbeeld heeft een tijdelijke ARL-keuze:

- **OFF:** normale production-weergave met bestaande contactschaduw.
- **B:** experimentele architecturale contactschaduw.
- **C:** B plus structurele rand en muurmassaversterking waar het materiaal dit ondersteunt.

OFF blijft standaard. B/C zijn geen dynamische belichting en zijn niet automatisch geactiveerd voor productie. Je kunt het voorbeeld op 1× of 2× controleren. Een koud B/C-voorbeeld van een zware kaart kan enkele seconden kosten; dit blokkeert opslaan niet.

## PNG en Campfire

PNG-export, Export Campfire Map en Naar Campfire sturen kiezen **elk expliciet hun eigen ARL-profiel**, standaard OFF. De tijdelijke keuze in Voorbeeld wordt niet ongemerkt overgenomen. Gebruik dezelfde schaal, raster-/schaalbalkopties, transparantie en ARL-keuze om Preview en PNG rechtstreeks te vergelijken. Campfire gebruikt zijn bestaande 1× fysieke bitmap zonder ingebakken raster/schaalbalk en canonieke v3-semantiek; deurartwork gebruikt de initiële gesloten pose. Dit kan bewust afwijken van een authoring-preview van een geopende deur.

Voorbeeld en export delen de fysieke renderpipeline. Export bevat geen editoroverlays of gesimuleerde runtime-belichting. Walls, doors, windows, Ceiling en authored light defaults blijven afzonderlijke Campfire-gegevens. Campfire bepaalt runtime-belichting en vereist nog steeds DM-review.

Environmental Detail gebruikt nu bij iedere output een gelijk wereldraster. Verschillende uitvoerresoluties kunnen na verkleinen nog normale raster-/filterverschillen tonen. Artwork, seeds en geplaatste decalvarianten worden niet gewijzigd.

Bij een te grote export kies je 1× of een kleinere kaart. Als ARL niet in de begrensde compositiecache past, kies je OFF of vereenvoudig je de kaart. Er wordt geen kaartdata gewist.
