# Workflowbevindingen

De eerdere Land Tool-audit is niet opnieuw uitgevoerd. Bestaande conclusies over Freehand-RDP, render-only Coastline Roughness en lokale Land-contourbewerkingen blijven gelden.

## Werkelijke uitvoering

De auteur is een agent die referentiebeelden visueel afleest en coördinaten/gestures schrijft. Het meegeleverde build.mjs roept de bestaande areaGeometry('freehand'), createArea, applyLandStroke, editContour en withGeometry aan. Dit automatiseert contourtekenen, Land Add/Remove/Smooth en vijf outline-puntbewerkingen. Het is geen transcript van een gebruiker die iedere stroke met een fysieke muis tekent. De kaart is volledig normaal bewerkbaar. Er is geen nieuwe productiegeometriefunctie of renderer gemaakt.

De vijf eilandcorrecties gebruiken opnieuw de bestaande Freehand-normalisatie voor een handmatig gedetailleerder puntenpad en withGeometry voor de geselecteerde Area. Ze bewaren de Area-ID. Het log noemt dit expliciet een hele-outline-puntcorrectie; geen claim van 5 individuele muisklikken. Referentie-/kaartcoördinaten blijven reproduceerbaar in het script.

## Herstelrondes en werkelijk waargenomen problemen

- De eerste macro-archive werd veilig geweigerd wegens een ISO-timestamp zonder milliseconden. Alleen auditdata hersteld; geen productwijziging.
- De eerste mesopass gebruikte te brede Add/Remove-footprints. De echte rejected-meso-native-export.png toont ronde sleutelgatbaaien en dunne staarten. Native validatie liet deze geometrie terecht toe: technisch geldig is niet artistiek goed. Deze ronde verworpen, kleinere gestes en bescheiden contour-Smooth gebruikt.
- Een review van micro-eilanden toonde dat de brede Golden Marches-baai aanvankelijk te ondiep was. Naar macro teruggegaan; baai met geobserveerde punten opnieuw gevormd; drie fases opnieuw geëxporteerd. Geen microdetail gebruiken om de fout te camoufleren.
- De eerste lokale Smooth-recipe had Smoothing Off en gaf tien no-ops. Dat is bestaand gedocumenteerd gedrag, geen enginefout. Hersteld naar Low; de definitieve tien acties wijzigen echte geometrie. noop-smooth-operations.json blijft als bewijs.
- Pairwise polygon-intersection vond twee landoverlaps: Golden bay east rock en Eastern offshore cape island tegen het vasteland. Oostelijke estuariumgrens en één kleine eilandcontour gecorrigeerd. Eindvalidatie vindt nul overlappende Areas.
- Vijf Skjold-ankereilanden bleven te grove polygonen. Een extra micro-ronde met afzonderlijk geobserveerde rotsinhammen verving hun puntencontour. De kleinste eilanden en sommige vastelandbogen blijven onvoldoende fijn.
- Eén meso-Remove in de noordoostelijke baai is een geldige no-op. Die wordt niet als kwaliteitswinst geteld.
- Geen veilige-geometrie-/ringbudgetweigering in de geaccepteerde fases. Grootste eindring 267; limiet 512 is hier niet de bewezen bottleneck.

## Scheiding van tijd en resultaat

production-metrics.json legt de gemeten UTC-werkwindows vast. Deze bevatten agentanalyse, scriptschrijven, browserbediening en toolwachttijd. Er was geen menselijke auteur met stopwatch: menselijke actieve productietijd is onbekend. Automatische domeinrekentijd staat per run apart en mag niet als handmatige productietijd worden gelezen. Ook de UI-exporttransporttijd is geen renderbenchmark.

Het lokale QA-harnas mount de echte App, decodeert normale archives en maakt alleen expliciete laad-/roundtripbediening beschikbaar. De fase-PNG's ontstaan door de normale Export PNG → Download PNG-actie. Een clicklistener kopieert ongewijzigd de door die actie gemaakte Blob URL naar de lokale auditreceiver. Geen screenshot van canvas als export; geen externe renderer, imagebewerking of referencepixels in het archive.

De harnasload gebruikt een tijdelijke sessierevision; de header zegt Choose a project omdat de kaart niet als databaseproject is opgeslagen. De persistentieclaim betreft de bestaande portable archive-codec, niet Primary-opslag. Preview en Edit points zijn wel in de echte editor gecontroleerd. Gewone Save naar een ongeregistreerd document is bewust niet geclaimd.

Primary Development niet geopend of beschreven. QA-service: profiel qa, root .qa.local/northreach/data, backend 49561, frontend 49562. De kleine QA-campagne is via consistente SQLite-backup uit de voorgaande geïsoleerde land-comparison-QA gekopieerd. Geen userdatabase of assetstore nodig. Bestaande instances zijn vooraf geïnventariseerd; bestaande servers ongemoeid gelaten.
