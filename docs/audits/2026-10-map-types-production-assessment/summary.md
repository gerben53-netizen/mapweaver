# Beoordeling

Geen van de vier voorbeelden haalt de opgegeven hoogwaardige referentie consequent. De voorbeelden laten de huidige pipeline zien, inclusief zichtbare tekortkomingen; geen verfraaiing buiten Mapweaver.

| Kaarttype | Oordeel | Sterkste bewijs | Voornaamste beperking |
|---|---|---|---|
| World | **Beperkt productierijp** | 277 bewerkbare objecten, 208 generatorstamps; echte PNG en archive-roundtrip | Hoekige hydro-/kustgeometrie, sterke halo, fragmentarische berg-/bosopbouw en beperkte labelhiërarchie in deze compositie |
| Regional | **Beperkt productierijp** | 197 objecten, 99 handmatig geschaalde terrainstamps; routes/rivieren/plaatsen | Wereldasset-defaults passen niet op 420 km; handmatige schaalomweg, repetitie en gebrekkige geografische aansluiting |
| City | **Niet productierijp** voor de gevraagde geïllustreerde kwaliteit | 103 native Areas/Paths/labels in een echte Regional-map | Geen City-modus, gebouw-/straat-/districtworkflow of passende gebouwbibliotheek; generieke footprints blijven schematisch |
| Battle | **Bruikbaar maar onvolwassen** | 42 objecten, 30 top-down stamps, native muren/deuren, premium vloeren; Preview ARL C en 100/75/50% | Meubelvarianten en bruikbare schaduw zijn aanwezig; fijnere aankleding, materiaalvariatie, schaal-/stijlcohesie en productieworkflow blijven achter |

**Meest productierijp: Battlemap.** De verticale productieketen is het compleetst: fysiek raster, native muren/openingen, geaccepteerde families, bruikbare Preview en PNG. De voorbeeldkaart is speelbaar zonder 2.5D; zie battle-map/export.png en zoom-100.png. Het oordeel is geen Premium-keurmerk voor alle 230 zichtbare stamps.

**Verst achter: City.** Een stadsplan is praktisch te tekenen, maar elk gebouw en elke straat moet met generieke geometrie worden opgebouwd. De 77 atlasstamps zijn geen bouwbare stadsbibliotheek; een complete stad als marker is geen vervanging voor individuele daken/bouwblokken. Crabwell-achtige kwaliteit is hiermee niet consequent produceerbaar.

Per type ontbreken vooral: World — coherent geografisch detail en uitgewerkte cartografische hiërarchie; Regional — schaalpassende assets/presets en geloofwaardige reisgeografie; City — samenwerkende gebouwen/straten/districten plus artwork; Battle — brede gelijkwaardige Premium-dekking en gecontroleerde materiaal-/aankledingsvariatie.

De vijf grootste kwaliteitswinsten staan in prioritized-recommendations.md. Ze scheiden assets, renderer, functies en workflow. Bestaande brushes, automatische labels en scatter zijn **niet als ontbrekend** geclassificeerd alleen omdat deze compositie ze niet volledig benut.

**Pariteit:** alle vier auditarchives openen in de echte editor; de bestaande renderfunctie levert vóór/na encode/decode dezelfde PNG bij gelijke opties (validation.json). De vier eind-PNG's zijn ook via de native UI gedownload. Edit is een snelle interactieve weergave en toont Battle ARL C niet volledig; gebruik Preview voor eindbeoordeling. De native landexports hebben een schaalbalk; de eerste technische roundtripproef had die uit. De definitieve proef gebruikt dezelfde opties als de UI en legt die expliciet vast. Exacte geschaalde screenshots zijn geen pixelpariteitsmeting. Geen claim over niet-geteste autosave, crashherstel of maximale kaartgrootte.

**Tests:** 83 bestaande gerichte tests: 76 geslaagd, 7 mislukt. Zes generatorpresets plus één geographyNetwork-roundtrip verwachten een map zonder het door parseProject toegevoegde campfireRevision:1. De failures zijn op de ongewijzigde bron aangetroffen; geen productcorrectie uitgevoerd. Dat bewijst test-/normalisatieverschil, niet automatisch dat elk export- of revisiepad veilig is. Geen volledige suite/typecheck/lint/build of performancecertificering.

**Nieuwe pariteitsbevinding E3:** World, Regional en City: native UI-download, technische render en archive-roundtrip zijn byte-identiek bij dezelfde opties. Battle: twee native UI-downloads zijn onderling identiek, en de technische archive-roundtrip is eveneens intern identiek, maar de native en technische paden verschillen op 118760 pixels binnen stampbounds (max kanaalverschil149; gemiddelde absolute kanaalafwijking0,401/255 over de gehele afbeelding). Zie battle-map/render-path-comparison.json, native-export.png en pipeline-export.png. export.png blijft de echte native UI-download. Oorzaak niet geïsoleerd; geen claim dat native Preview en UI-export onderling verschillen. Dit voorkomt een onterechte algemene pariteitsclaim.
