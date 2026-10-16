# Kwaliteitsbeoordeling — V1 tegenover organische V2

[Overzicht](comparison/reference-vs-v1-vs-v2.png) · [NW-uitsnede](comparison/northwest.png) · [centrale zeestraten](comparison/central.png) · [zuid](comparison/south.png) · [oost](comparison/east.png).

Dit zijn visuele beoordelingen van de **geleverde kaart**, geen formele pixel-overlapscore met de referentie en geen theoretische bovengrens van Mapweaver. De referentie bevat veel geïllustreerde topografie die buiten deze land-only scope valt. V1 is de bestaande volledige native export; die is niet achteraf gestript of geretoucheerd voor de montage.

## V1 / V2

1 = sterk onvoldoende; 3 = bruikbare benadering; 5 = referentieniveau. PASS gaat alleen over de genoemde technische eigenschap.

| Criterium | V1 | V2 | Concrete onderbouwing |
|---|---:|---:|---|
| Globale overeenkomst met Elyra | 2 | 3 | V2 plaatst en vormt de hoofdgebieden opnieuw, met meer noordelijke, centrale en zuidelijke eilanden. NW/Eldergrove heeft een native smalle verbinding. De macrogeografie blijft nog vereenvoudigd; er is geen bewezen exacte referentietopologie. |
| Natuurlijke kustvormen | 2 | 3 | Minder gelijkmatige hoeken en meer echte inhammen/kapen. Vooral in NW en zuidelijke kusten zijn de lange grove V1-facetten minder dominant. De NE-hoofdvorm heeft nog lange rustige boogdelen. |
| Afwezigheid geometrische hoekigheid | 1 | 3 | Geen contour die vrijwel uitsluitend uit de oude 65 punten bestaat. Nieuw Freehand plus echte landvariatie; lokaal zijn rechtlijnige stukjes en hoekige eilandfragmenten nog zichtbaar. |
| Afwezigheid herkenbare brushlobben | 4 | 3 | V1 gebruikte nauwelijks echte Land-brushvorming; de hoekigheid maskeerde dat probleem. V2 varieert footprint en richting, maar kleine eilandgroepen en enkele ronde kustuitsnijdingen verraden nog brushherkomst. Op dit criterium is V2 dus **niet beter**. |
| Behoud van geografische details | 2 | 3 | Meer archipels, centrale eilanden en afzonderlijke kapen; grotere hoofdvormen herkenbaar. Fjorden, onregelmatige delta-achtige kusten en specifieke nauwe passages blijven incompleet of onnauwkeurig. |
| Variatie op meerdere schaalniveaus | 1 | 3 | Acht macrotraces, middelgrote benoemde landacties en kleinere kust-/eilandelementen. De kleinschalige variatie is nog minder coherent dan de referentie en niet ieder eiland is exact nagetekend. |
| Bewerkbaarheid | PASS | PASS | V1: bestaande auditproef. V2: centrale validatie, echte native puntbewerking van Sunveil en identieke objecten na archive-roundtrip. |
| Native exportbetrouwbaarheid | PASS | PASS | V1: bestaande gedocumenteerde exporthash. V2: echte native UI-export en twee identieke controlerenders vóór/na reopen; stage 2 en eindexport gelijk. Geen volledige suite-/alle-resoluties-certificering. |

De winst is doorgaans ongeveer één beoordelingspunt voor geografie/natuurlijkheid, twee voor het vermijden van de grove V1-hoekigheid. Die ordinale scores mogen niet als procentuele kwaliteitswinst worden gelezen. Meer objecten of kustperimeter bewijzen geen hogere artistieke kwaliteit.

## Controle van de twee rondes

**Ronde 1:** de nieuwe grote contouren en onderlinge ligging zijn leesbaar zonder terrein. 53 Areas, 1779 punten, circa 40,25% land. De archipelvormen zijn bewust nog eenvoudig; kleinere kustvariatie ontbreekt. De eerste proef met geërfde Coastline-appearance van nieuwe Land-eilanden werd gecorrigeerd: de geleverde ronde-1-PNG heeft werkelijk geen lijn, halo of terreintextuur.

**Ronde 2:** 144 Areas, 3349 punten, circa 40,87% land, nul gaten. Visuele inspectie leidde tot concrete correcties van ronde inland-cuts, sleutelgatbaaien, eilandstaarten, overdreven smoothing en gelijke footprintoriëntaties. Geen opzettelijke binnenmeren toegevoegd. De brede zee-engten en geïsoleerde hoofdgebieden blijven aanwezig. De gedeelde tint maakt de echte kust zichtbaar zonder illustratief camouflage-effect.

In de NW-uitsnede is nog goed te zien dat niet alle complexe grilligheid uit de referentie is teruggebracht. De centrale uitsnede toont de smalle Eldergrove-verbinding en minder eilanden/geulen dan het origineel. Het zuiden heeft een duidelijker archipel, maar sommige eilandvormen zijn nog symbolisch. In het oosten blijft de kust van Khazrul en de Whispering Isles minder fijn en minder specifiek dan de referentie.

## Resterende tekortkomingen, geclassificeerd

| Tekortkoming | Klasse | Nog via bestaande werkwijze/instellingen te verbeteren? | Productcode noodzakelijk? |
|---|---|---|---|
| Hoofdcontouren en verbindingen niet exact referentietrouw; onduidelijke smalle verbindingen zijn handmatig geïnterpreteerd | WORKFLOW | Ja: nauwkeuriger lokale tracing, vergelijking en kleine Add/Remove-strokes. | Niet aangetoond. |
| NE en enkele zuidelijke kustdelen nog te rustig of lokaal rechtlijnig | WORKFLOW | Ja: doelgerichtere middelgrote baaien, kapen en Freehand-puntbewerking. Er is nog puntbudget over. | Niet aangetoond. |
| Sommige eilandjes blijven afgerond, elliptisch of brushachtig | CONFIGURATION | Ja: meer maatwerk per eiland, kleinere overlappen en gerichtere combinatie van vormen. Footprintvariatie alleen is geen vervanging van tekenen. | Niet aangetoond. |
| Macro-, meso- en microvariatie nog onvoldoende geologisch samenhangend | WORKFLOW | Ja, door bewuster art direction en minder generiek verdeelde detailacties. | Niet aangetoond. |
| Te grote Roughen-stroke wordt veilig geweigerd op complexe verbonden kust | CONFIGURATION | Kortere, zachtere strokes zijn toegepast. Onderliggende veilige-geometriecontrole blijft behouden. | Geen defect of noodzakelijke codefix bewezen. |
| Elk bewaard contoursegment blijft lineair; op hoog zoomniveau kan tessellatie zichtbaar zijn | RENDERING | Meestal met passende puntverdeling/native smoothing te beperken. | Alleen als echte bewerkbare spline-kusten als nieuwe eis worden gesteld; niet nodig voor iedere resterende contourfout. |
| Geen automatische, referentiegestuurde silhouetreproductie | MISSING FEATURE | Handmatig bestaande tools gebruiken is wel mogelijk. | Voor zo'n automatische nieuwe workflow wel; niet nodig om huidige contouren verder te verfijnen. |
| Geen gespecialiseerde kustassets gebruikt | ASSET | Geen tekortkoming binnen deze scope: landgeometrie heeft geen artworkassets nodig. | Nee; ontbrekende assets zijn geen verklaring voor deze kustvormen. |

## Expliciete antwoorden op de zes productievragen

1. **Hoeveel beter?** De hoofdligging en bewerkbare kustvariatie zijn verbeterd en de grove V1-facetten minder dominant. De meeste visuele criteria gaan van 1–2 naar 3. De uitkomst blijft vereenvoudigd; geen claim van overtuigende premium-referentietrouw.
2. **Meeste kwaliteitswinst?** Opnieuw geauthoriseerde Freehand-hoofdcontouren leverden de grootste geografische winst. Echte Add/Remove en fijnere canonieke Roughen leverden kustvariatie. Footprint-/richtingvariatie hielp tegen identieke eilandvormen. Hoge stroke-roughness leverde geen winst en is volledig uitgeschakeld.
3. **Wat blijft zichtbaar?** Te rustige kusten, enkele hoekige of ronde brushvormen, minder fijn kust-/eilandenweefsel en onnauwkeurige lokale topologie ten opzichte van de referentie.
4. **Kan dat via instellingen/werkwijze beter?** Voor een belangrijk deel ja. De finale grootste ring heeft 281 punten, minder dan de 512-limiet; het totaal 3349 is minder dan 10.000. De proef heeft het bestaande authoringvermogen niet volledig uitgeput.
5. **Welke punten vereisen daadwerkelijk code?** Voor de concrete resterende vormfouten is dat niet aangetoond. Een nieuwe automatische referentiegestuurde workflow of echte spline-geometrie zou productwerk vergen, maar is geen bewezen voorwaarde voor de volgende kwaliteitsstap. Geen codeverandering voorstellen als vervanging voor nauwkeuriger authoring.
6. **Is de Land Tool voldoende voor professionele wereldkaartcontouren?** Zij is functioneel voldoende voor een bewerkbare, gelaagde wereldkaartbasis met organische kustbewerking. **Deze V2-proef bewijst nog niet dat het referentie-/professionele eindniveau is bereikt.** Meer gerichte handmatige productie en onafhankelijke artistieke acceptatie zijn nodig. Evenmin bewijst de proef dat professionele kwaliteit zonder codewijziging onmogelijk is.

De audit/productieproef en technische deliverables zijn afgerond. De visuele premiumacceptatie blijft open; dit wordt niet als een nieuw compleet Elyra-product of geaccepteerd artpakket aangeboden.
