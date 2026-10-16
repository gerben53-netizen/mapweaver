# Northreach — kwaliteitsbeoordeling

**Visuele premiumacceptatie: niet behaald. Technische native productieproef: geslaagd.** De vaste vierkolomsvergelijking en de vier details zijn leidend, niet het puntental.

| Criterium | Beoordeling | Bewijs / beperking |
|---|---|---|
| Macro-overeenkomst | Duidelijk beter dan V1/V2 | Noordelijke vertakking, dubbele westkaap, diepe baai onder Westmere en zuidwestelijke uitstulping zijn herkenbaar; V2 benaderde dit als één afgerond blok. |
| Mesostructuur | Bruikbaar, nog onvolledig | Westmere-baai en verschillende kapen bestaan werkelijk. Oostelijke rivier-/zeegrens en verbinding richting Eldergrove zijn interpretatief. |
| Microdetail | Onvoldoende voor premium | Vijf Skjold-eilanden hebben afzonderlijk geobserveerde rotsinhammen; kleinere eilanden blijven te eenvoudig. De noordelijke kust mist nog referentie-eilandjes en fijne recessen. |
| Kustcontinuïteit | Onvoldoende op detailniveau | De rustige kust toont nog lange rechte segmenten en hoekovergangen. Lokaal Smooth helpt, maar maakt de lijn niet vanzelf referentiegetrouw. |
| Brushherhaling | Sterk teruggedrongen | Geen reeks identieke Island-dabs. De afgewezen meso-export laat zien waarom brede ronde uitsnijdingen zijn teruggenomen. Eén kleine lip in de noordelijke inham blijft te rond. |
| Geografische identiteit | Herkenbaar, geen exacte reproductie | Contour en eilandenposities benaderen Northreach; geen pixelmasker/ground truth en dus geen percentage nauwkeurigheid geclaimd. |
| Bewerkbaarheid | Geslaagd | 36 gewone Landmass-Areas, 622 punten, grootste ring 267. Echte Edit points-modus geopend. Geen bitmapachtergrond/assets. |
| Export/persistentie | Geslaagd | Drie native UI-exports; archive codec en ongewijzigde render vóór/na identiek. |

## De zeven vereiste antwoorden

1. **Professioneel bereikt? Nee.** De nieuwe versie is een betere geografische basis, maar voldoet nog niet aan de eis van onopvallende facetten en overtuigend fijn kustdetail. Deze audit bewijst niet dat de huidige tool dit principieel onmogelijk maakt.
2. **Nauwkeurigheid:** hoofdverhoudingen, grote baaien en herkenbare eilandgroepen zijn zichtbaar beter dan V1/V2. De illustratie bevat kliffen/halos en riviermondingen; de bovenste landgrens is handmatig geïnterpreteerd. Geen automatische segmentatie of exacte IoU met het origineel. De oostelijke afbakening en kleinere eilanden blijven afwijkingen.
3. **Grootste winst:** echte geobserveerde Freehand-hoofdcontour; de Golden Marches-baai opnieuw ruimtelijk aflezen; losse eilandvormen; gerichte puntcorrecties. Het toevoegen van willekeurige ruwheid leverde geen noodzakelijke winst en is niet gebruikt.
4. **Productiewerk:** zie production-metrics.json. Definitief recept: 36 Freehand-creaties, vijf outline-puntcorrecties, zes Land Add/Remove-pogingen (vijf effectief), acht globale contour-Smooth-acties en tien effectieve lokale Land Smooth-streken. Meerdere verworpen/rerun-rondes zijn afzonderlijk vastgelegd. De gemeten agentwerkwindows zijn geen menselijke tekentijd.
5. **Omslachtig:** heen en weer vergelijken tussen een apart referentiebeeld en native kaart; juiste waterzijdige brushpositie raden; ronde footprint corrigeren; macro opnieuw opbouwen nadat micro-eilanden een verkeerde baaidiepte aantonen; alle exports na een upstreamcorrectie verversen.
6. **Volledige wereld praktisch?** Technisch mogelijk als native authoring, maar deze proef bewijst geen efficiënte premiumworkflow. Zelfs één continent heeft meerdere correctierondes nodig en haalt de visuele lat nog niet. Extrapoleren van enkele seconden scriptrekentijd naar menselijke productie zou misleidend zijn.
7. **Verbeteringen:** hieronder en in workflow-findings.md. Het gaat om gerichte voorstellen, niet geïmplementeerde features of bewezen noodzakelijke engineherbouw.

## Prioriteit van voorstellen

| Klasse | Voorstel | Waarom huidige functies onvoldoende zijn voor deze workflow |
|---|---|---|
| WORKFLOW | Vaste referentiecrop, landmarkchecklist, macro-gate en fase-export als authoringprocedure | Dit kon zonder code en gaf de grootste winst; de vorige wereldwijde proef had onvoldoende lokale referentiecontrole. |
| UX | Editor-only naast-elkaar-referentie met gekoppelde crop/zoom en exportuitsluiting | Huidige kaartnavigatie helpt, maar een reference viewport bestaat hier niet; een bitmapachtergrond zou deze opdracht schenden. Dit zou herhaald aflezen verminderen. |
| UX | Maak zichtbaar dat Smooth met Smoothing Off een no-op is | De bestaande engine doet dit bewust; een auditpreset activeerde daardoor eerst niets. De juiste Low-instelling werkt. Een waarschuwing of aparte controle kan deze fout voorkomen. |
| GEOMETRY | Preview van lokale, landmarkbeschermde contourbewerking met afwijkingsgrens | Bestaande Smooth bewaart geen handmatig aangewezen kaap/baai-ankers. Global Smooth verschuift alle punten, Land Smooth vereenvoudigt de hele geraakte contour. Niet eerst alleen een hogere limiet introduceren: ring 267 ligt ruim onder 512. |
| AUTOMATION | Optionele herhaalbare fase-/landmarkrecipe boven bestaande acties | Dit auditrecept moet upstreamcorrecties met losse scripts reproduceren. Bestaande undo is geen opgeslagen productie-recipe. Tijdwinst is aannemelijk, niet gemeten voor menselijke gebruikers. |
| MISSING FEATURE | Eventueel referentiecontour-constrained authoring, als apart productbesluit | World Generator accepteert geen doelcontour. Nodig voor automatische referentiereproductie, niet noodzakelijk voor handmatig land maken; geen excuus om bestaande Freehand te omzeilen. |
| RENDERING | Geen nieuwe renderer nodig om deze contourfouten te verhelpen | Export toont de opgeslagen landgrens correct. Stroke-roughness, textuur en halo zouden de nog te grove geometrie alleen verbergen. |

Geen aangetoond productdefect dat organische Land-authoring verhindert. Het grootste tekort in dit resultaat blijft authoringdetail/interpretatie; bestaande tools kunnen verder handmatig worden gebruikt. De proef geeft geen grond om het hele Land-systeem te vervangen.
