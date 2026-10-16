# Native toolgebruik — Elyra V2

Volledige uitvoeringsrecepten: [reproduction/build.mjs](reproduction/build.mjs). Werkelijk geaccepteerde acties, punten, seeds, parameters, tijden en geometriewijzigingen: [tool-log.json](tool-log.json). [Metrics](metrics.json) bevatten de samenvatting. Dit is automatisering van bestaande domeinfuncties; er wordt niet beweerd dat honderden strokes fysiek met de muis zijn getekend.

| Fase | Bestaande functie | Daadwerkelijk gebruik |
|---|---|---|
| Hoofdvormen | `areaGeometry('freehand')` → `createArea` | Acht nieuw handmatig getraceerde contouren: Northreach/Westmere, Eldergrove, Frosthelm/Mistwood/Thornwild, Aramoor, Sunveil, Khazrul, Talonara en Vaelrun. Geen kopie van de V1-coördinaten. |
| Voorbereidende zachte bochten | `editContour(g,'smooth',17)` | Eén pass per Freehand-hoofdvorm; niet de 3×25 uit de eerdere proef. Een kandidaat met 2×22 en te veel opeenvolgende smoothing is visueel teruggenomen wegens detailverlies. |
| Grote eilanden | `applyLandStroke`, Add | Eerste ronde: 45 eiland-/archipelstrokes. Island, Coastline Detail en Peninsula met wisselende grootte, seed en stroke-richting. |
| Grote/middelgrote kusten | Add/Remove | Benoemde baaien, kapen en de smalle Eldergrove-verbinding. Remove wordt vanaf de waterzijde van de actuele kust geplaatst via bestaande `closestPoint` en `pointInArea`, zodat geen onbedoelde ronde binnenmeren ontstaan. |
| Lokale kustvariatie | Add/Remove | Variabele 13/18/23/29 referentiepixel-footprints (×1,5625 kaartpixels), verschillende posities en Organic/Detail-vormen; Remove-centra liggen aan de waterzijde. Dit bewerkt de vulling zelf. |
| Kleinere eilanden | Add | Handmatig geplaatste referentie-ankerposities; Island/Detail/Peninsula afgewisseld. Richting volgt de korte native dragstroke, niet overal dezelfde horizontale footprint. |
| Lokale smoothing | Smooth Coast | 17 pogingen geaccepteerd, 16 met geometrische wijziging; Round, 55–90 referentiepixel-diameter, softness .35, smoothing Low, roughness 0. Geen brede coastline-erasing finish. |
| Fijne werkelijke kust | Roughen Coast | Organic, 155 referentiepixel-diameter, roughness .38, softness .3, Low; waar de brede stroke geweigerd werd: Round, 90 referentiepixels, roughness .15, softness .5, Medium en korte deelpaden. 17 effectieve geaccepteerde Roughen-strokes. |
| Visuele kuststyling | Coastline Roughness | **Uit: 0.** Ook stroke width 0 en geen appearance/halo. Een afgewerkte stroke kan dus geen geometrische hoekigheid verbergen. |
| Opslag/export | Bestaande projectcodec en App | Centrale `parseProject`; echte editor/Preview; echte Download PNG; bestaande archive encode/decode en identieke PNG vóór/na reopen. |

De 303 geaccepteerde Land-acties bevatten 301 wijzigingen en twee no-ops. Eén extra brede Roughen-poging is veilig geweigerd door de bestaande geometriecontrole. Die poging staat in het log en werd niet als resultaat opgeslagen; kortere zachte strokes zijn vervolgens toegepast. De precieze interne deelreden van die weigering is niet verder gedifferentieerd. Zij bewijst niet dat de finale geometrie een puntbudget overschrijdt: de finale grootste ring heeft slechts 281 punten.

De canonieke geometrie blijft gewone Area-polygons met maximaal 512 punten per ring en maximaal 10.000 geografische punten per document. V2 gebruikt 3349. Er zijn geen parallelle meshes, persistente tweede landmaskers, nieuwe validators of projectformaten gemaakt.

Een native Add kan intersecterend land samenvoegen. Daardoor behoudt een verbonden cluster één Area, conform bestaand gedrag. Na de Eldergrove-verbinding is de objectnaam als authoringmetadata verduidelijkt naar `Northreach / Westmere / Eldergrove`; er is geen zichtbaar cartografisch label gemaakt.

Niet gebruikt: World Generator (geen doelcontourinvoer), Terrain Brush (geen kustgeometrie), externe image tracing, beeldgeneratie, referentie-backgrounds, stamps, texturen, decoratie, custom renderer of PNG-nabewerking.
