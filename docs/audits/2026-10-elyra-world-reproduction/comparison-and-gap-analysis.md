# Elyra — vergelijking en concrete tekortkomingen

[Bekijk origineel en native export naast elkaar](index.html). De native export is de daadwerkelijke Download PNG-uitvoer, niet deze rapportpagina. De referentie is duidelijk rijker: doorlopende geschilderde geografische details, kleinere variaties, consistente cartografische symbolen en subtiele kust-/waterafwerking ontbreken grotendeels in de reconstructie.

## Per deelgebied

| Deelgebied | Status | Bevinding en oorzaak |
|---|---|---|
| Hoofdcompositie | APPROXIMATED | NW/NE-continenten, centrale eilanden, zuidwestelijke woestijn en oostelijke vulkanen staan herkenbaar relatief geplaatst. Zee-engten en regionale verhoudingen zijn te grof; dit is deels handmatige authoringonnauwkeurigheid. |
| Northreach / Westmere | APPROXIMATED | Sneeuwkap, bergas, groen en gouden zuiden zijn aanwezig. Te veel vlakke ruimte, hoekige kust en te weinig heuvels/kleine vegetatie. Bestaande Areas kunnen verfijnd worden; niet bewezen dat daarvoor een nieuwe tool nodig is. |
| Eldergrove | APPROXIMATED | Dicht bos en rivierpositie herkenbaar. De referentie heeft een samenhangende halfschiereiland-/eilandenstructuur; hier oogt het als een los eenvoudiger eiland. Repetitieve boomclusters en harde stampovergangen. |
| Frosthelm / Vaelrún | APPROXIMATED | Wit klimaatgebied en bergketen aanwezig. Fjorden, scheurend ijs, drijvende schotsen en bergvoetovergangen onvoldoende. In bestaande gebruikte assets geen samenhangende ijs-/gletsjerfamilie toegepast. |
| Mistwood / Thornwild | APPROXIMATED | Moeras, bos en rivier herkenbaar. Te geïsoleerde clusters, te weinig meren, deltageulen en dichtheidsverloop. Hier is méér native authoring mogelijk dan deze proef laat zien. |
| Aramoor / Valemere | APPROXIMATED | Positie en labels aanwezig, maar kustarchipel en burcht-/heuvelhiërarchie missen. Valemere heeft slechts een eenvoudige contour en geen passende reliëfafwerking. |
| Sunveil | APPROXIMATED | Woestijnkleur, bergketen en steden aanwezig. Ontbrekende duinvelden, oases en randdetail; rivier vereenvoudigd. De referentie bevat aanzienlijk meer groen in het noorden en sterkere reliëfvariatie. |
| Talonara | APPROXIMATED | Zuidelijk tropisch groen en Jadepeak aanwezig. Dezelfde broadleaf-assets als het noorden; geen overtuigend eigen tropisch ecosysteem. |
| Khazrul | APPROXIMATED | Donkere ondergrond, actieve/dove vulkanen en bewerkbare oranje lavapaden. Niet de doorlopende basaltstructuur, gloeiende breuknetwerken en rookkleur van de referentie. |
| Kleine eilanden | APPROXIMATED | De groepen staan ongeveer goed, maar minder eilanden, eenvoudiger vormen en veel ontbrekend microreliëf. Native Areas kunnen meer detail dragen; dit is geen bewezen objectlimiet. |
| Benoemde hoofdregio's / titellocatie | CLOSE (uitsluitend plaatsing) | Wereldnaam, grote regio's, titel linksboven en kompas rechtsboven zijn herkenbaar. Deze beperkte CLOSE-beoordeling geldt niet voor typografie of illustratiekwaliteit. |
| Exacte ornamenten / schilderstijl | NOT POSSIBLE met uitsluitend de gebruikte ongewijzigde presets | Beschikbare frame/cartouche/kompas geven de rol weer, niet het concrete referentieartwork. Geen nieuwe decoratie gegenereerd of geïmporteerd. |

## Scores 1–5

1 = sterk onvoldoende ten opzichte van referentie; 3 = bruikbare benadering; 5 = vergelijkbare kwaliteit. Dit zijn beoordelingen van **dit resultaat**, geen theoretische maxima van Mapweaver.

| Criterium | Score | Toelichting |
|---|---:|---|
| Landvormen | 2 | Hoofdcompositie herkenbaar; kustdetails, verbindingen en micro-eilanden veel te grof. |
| Terreinovergangen | 2 | Feathering en vijf brush-accenten werken, maar veel vlakke kleurvlakken en zichtbare biomegrenzen. |
| Reliëf | 2 | Bestaande painterly bergen zijn zichtbaar, maar ketens ogen als een rij overlappende plaatjes; weinig foothills. |
| Vegetatie | 2 | Dichte bossen zijn aanwezig, maar herhaling en eilandjes van vegetatie blijven zichtbaar. |
| Hydrologie | 2 | Zeven bewerkbare rivieren, maar geen volledig afwateringsnetwerk, meertjes, delta's of fijn kustwater. |
| Iconografie | 2 | Native Places werken; generieke symbolen missen de referentiehiërarchie en fijne tekenstijl. |
| Labels | 2 | Leesbare hoofdlabels, maar botsingen met bos/bergen, een afgekapt oostelijk zeelabel, ontbrekende lokale namen en geen gebogen zee-/ketenlabels. |
| Visuele cohesie | 2 | Globale paletverdeling klopt, maar vlakke ondergrond en gedetailleerde stamps sluiten onvoldoende op elkaar aan. |
| Exportfidelity | 4 | UI-download en twee controlerenders byte-identiek na archive roundtrip. Geen formele pixelvergelijking van canvasviewport versus export; editor-only schaaloverlay wordt terecht niet geëxporteerd. |
| Workflow | 2 | Scriptauthoring en veel handmatige geografische keuzes nodig. Lange downloadwacht en tijdelijke archive/sessierevision vragen expliciete diagnose. |

## Gaps gescheiden naar oorzaak

### Functionele tools

Basisfuncties zijn aanwezig: native land-/biome-Areas, Land/Water Brush, Terrain Brush, Water Depth, Scatter, routes, labels en elementen. De gebruikte bestaande TerrainStroke levert 49 maskertegels. Geen willekeurige wereldgenerator gebruikt: die zou de bindende silhouetten vervangen.

Gewenste vervolgaudits: gekoppelde riviervertakkingen met consistente tapering/meren/delta's; coherent reliëf en foothills langs een getekende as; tekst langs gebogen paden; legenda die werkelijk routes/terreinen toont. De bestaande legenda behandelt custom terrein-/route-entries hier als generieke dots, waardoor River/Road/Forest niet de kaartstijl demonstreren. Er is geen sluitend bewijs dat elk gewenst detail een nieuwe feature vereist; meer handmatige native authoring kan een deel oplossen.

### Assets

20 bestaande concrete PNG-bronnen voor 538 stamps; geen Stamp Families gebruikt. **Alle 20 gebruikte bronnen hebben de bestaande classificatie FIX**, geen KEEP. Het grotere corpus bevat 77 world-gerichte assetrecords, maar dat is geen bewijs van 77 geschikte production-assets. De gebruikte bronnen zijn afzonderlijk met qualityStatus in de inventaris opgenomen. De kwaliteitslabels blijven ongewijzigd; FIX mag niet als premium-geaccepteerd worden voorgesteld. Dit beperkt expliciet de production-acceptatie van deze reconstructie.

Nodig voor een samenhangende referentiestijl: aansluitende hero/primary/support-bergketens met foothills; noordelijke naald-, gemengde en tropische bosranden met lage dichtheidsvarianten; ijs/gletsjers/schotsen; duinen/oases; basalt-/lava-overgangen; passende kleine nederzettings-/vestingiconen; echte rijk uitgewerkte kaartornamenten. Dit zijn productiebehoeften, geen stilzwijgende toestemming nieuwe assets te bouwen.

### Rendering / kwaliteit

De hoofdproblemen zijn zichtbaar in de native PNG: te gladde grote oppervlakken, repeterende bosblokken, losse reliëfstamps, onvoldoende kustmicrodetail en matige textuurcohesie. De ingestelde kustcontouren zijn dunne afstandslijnen; zij reproduceren geen geschilderde ondiepten. De bestaande geography finish en terrain-texturen zijn wel gebruikt. Geen shader/rendererwijziging gedaan. Sommige tekortkomingen komen nadrukkelijk uit de grove contour- en plaatsingskeuzes van deze reconstructie.

### Authoring / workflow

700 sceneobjecten, zeven lagen, 75 Areas, 14 Paths (7 River / 3 Road / 1 Border / 3 lava), 538 Stamps, 49 Labels, 20 Places, 1 title, 1 compass, 1 legend, 1 scaleBar; 5 brush gestures, 49 painttiles, 0 Scatter-objecten, 0 families. Stamps zijn seedgestuurd geplaatst maar blijven afzonderlijke native Stamps. De schaal/plaatsing is expliciet cartografisch; er is geen fysiek wereldbos van duizenden echte bomen nagebootst.

Handmatige workarounds: referentiecoördinaten overnemen, eigen kustpolygonen, terreinpolygonen, bosdichtheidszones en bergketenpunten; bestaande bronassets herhaald plaatsen; vlakke legendadots accepteren; lava als generic Path. Totale verstreken tijd circa 98 minuten inclusief ongeveer 76 minuten browser/downloadwacht; actieve productietijd niet apart gemeten. De wachtduur kan niet zonder verdere instrumentatie aan de renderer worden toegeschreven.

### Exportcorrectheid

De daadwerkelijke UI-download is 2400×1600, ongewijzigd. SHA-256 `9caff01893dbc9c8e8abf302dffdd8aaf8bbb9010f0a6355ce67ccfcb3a138ad`. De twee bestaande native exportfunctiecontroles vóór/na archive encode/decode geven exact diezelfde hash. Geen vervangende technische render als deliverable gepresenteerd. De scaleBar op de kaart is native; de editor-HUD-schaal links onder is editor-only. Geen Campfire- of 2×-proef in deze opdracht.

## De vijf grootste blockers voor referentiekwaliteit

1. **Geografische detaillering en authoringkosten:** de geleverde contouren en kustarchipels zijn te grof. Eerst meer handmatige verfijning met bestaande tools; daarna pas ontbrekende workflow bepalen.
2. **Samenhangend reliëf:** bergen/foothills/ondergrond moeten als één landschap lezen, met meer aansluitende bronnen en schaalhiërarchie.
3. **Vegetatie- en biomecohesie:** passende bosranden, klimaatspecifieke variatie en natuurlijke dichtheidsovergangen in plaats van herhaalde clusters.
4. **Hydrologisch en kustdetail:** vertakkingen, meren, delta's, fjorden, ijs en geschilderde waterdiepte ontbreken grotendeels in deze proef.
5. **Cartografische afwerking:** labelplaatsing, gebogen namen, echte legenda-symbolen en verfijnde ornamenten; het afgekapte zeelabel is een concrete authoringfout in het geleverde resultaat.

Conclusie: Mapweaver kan de bewerkbare structuur en native uitvoer leveren. Deze proef bewijst **niet** dat de meegeleverde illustratiekwaliteit met de huidige assets/workflow is bereikt of dat alle bestaande opties zijn uitgeput. Eerst de genoemde native authoringfouten verfijnen en een coherent world-artpakket accepteren; productfeaturevoorstellen pas op basis van gerichte vervolgproeven. Het visuele einddoel blijft open en wordt niet als premium geaccepteerd.
