# Environmental Detail

Environmental Detail voegt niet-destructieve gebruikssporen toe boven de ondergrond. Kies het gereedschap in de linker gereedschapsbalk. De elf normale presets gebruiken **production-1**: 44 gebundelde Premium PNG-componenten, vier varianten per preset. Bestaande DEV-strokes behouden hun diagnostische uiterlijk en worden niet automatisch vervangen.

## Surface en Decals

**Surface** schildert zachte, onregelmatige materiaalmodulatie: Dirt, Damp, Wear en Moss Wash. Dirt, Damp en Moss vermenigvuldigen de onderliggende kleur; Wear legt lichte gebruikssporen over de ondergrond. Opacity bepaalt de sterkte en Softness het verloop. De ondergrondafbeelding wordt nooit gewijzigd.

Surface begint met 25% opacity; Decals met 80%. Multiply stapelt bij herhaald schilderen: begin laag en bouw met korte strokes op. Ook met de productiecomponenten kan veelvuldig schilderen op hoge opacity de ondergrond sterk verdonkeren; er is geen verborgen darkness-clamp. Wear is op heel lichte paleissteen bewust subtiel: verhoog de opacity of gebruik een tweede korte pass. Op hout/donkere ondergronden is dezelfde slijtage duidelijker.

**Decals** strooit Cracks, Rubble, Gravel, Leaves, Small roots, Moss clumps of Wall-edge debris. Dit zijn opgeslagen instanties binnen één kaartgebonden detaillaag, geen gewone selecteerbare Stamps. De assetpicker wordt niet met detailcomponenten gevuld.

## Bediening

Kies Paint en sleep met de primaire muisknop. Eén afgeronde sleepactie is één undo-stap. Escape, focusverlies, pointercancel of wisselen van gereedschap annuleert een onafgeronde stroke. Space + slepen en de middelste muisknop blijven beschikbaar voor pan. De cursorcirkel toont de radius in kaartcoördinaten; zoom verandert het fysieke penseel niet.

- Radius en decalafmetingen verschijnen in feet wanneer de kaart een fysieke schaal heeft, anders in map pixels. Bij de canonieke battlemap-schaal geldt 10 px = 1 ft.
- Density is het gewenste aantal pogingen per 10.000 map-pixels², oftewel 100 ft² bij de canonieke schaal. Clipping, lokale overlapcontrole en edge bias kunnen het uiteindelijke aantal verlagen.
- Minimum/Maximum size bepalen de volledige canvasbreedte; de originele verhouding blijft behouden. Productiecomponenten gebruiken de toegestane uniforme schaal 0,5–2× hun nominale footprint. Rotation variation loopt van geen variatie tot ±180° rondom het canvascentrum. Visual variation kiest uit vier vaste productievarianten en varieert de dekking. Op kaarten zonder fysieke schaal wordt voor de nominale footprint de canonieke 10 map px/ft gebruikt; de bediening vermeldt dan map pixels.
- Gravel en Leaves op minimumschaal vormen samen een fijne, natuurlijke textuur. Verwacht bij 50% zoom geen afzonderlijk herkenbare steentjes of blaadjes. Gebruik grotere footprints voor herkenbare clusters en lagere density voor rustigere oppervlakken.
- Surface bepaalt de PNG-footprint uit tweemaal Radius en begrenst die tot de toegestane 0,5–2× nominale grootte. Een radius buiten dat bereik vergroot/verkleint het bronbeeld niet verder; Radius blijft wel de stroke-sampling en muurvoorkeur sturen. Gebruik voor brede oppervlakken meerdere naastgelegen strokes.
- **Prefer walls** gebruikt de functionele geometrie van zichtbare native Walls. Het geeft voorkeur aan de muurvoet binnen het beschilderde gebied; het versiert nooit automatisch alle muren en leest geen afbeeldingpixels.
- Erase raakt uitsluitend de gekozen detailmodus. Surface-erase vermindert bestaande masks met de ingestelde sterkte; herhaald wissen verwijdert verdere dekking. Decal-erase verwijdert instanties waarvan het centrum binnen de wisstroke ligt. Vloeren, Walls, Areas, gewone Stamps en de achtergrond blijven intact.
- Undo/redo herstellen de opgeslagen detaildata exact. Hide/Show en Lock/Unlock gelden voor de gehele detaillaag.

## Laagvolgorde en grenzen

Zodra een kaart Environmental Detail bevat, gebruikt editor én export dezelfde strata: achtergrond → normale Areas en bestaande materiaal-/terrainverf → Surface en vloerdecal → wall-edge debris → Paths/Walls/Openings → props en tekst → editoroverlays. Beide decaltiers staan onder de daadwerkelijke muurweergave. Muurartwork bedekt overlappende pixels volgens zijn eigen alpha; een decal mag onder een organische rand doorlopen. De bestaande muurweergave houdt openingen en eindpunten vrij: er is geen extra decalclip of onzichtbaar masker door een doorgang. Een gesloten deur kan uiteraard detail onder het deurblad bedekken. Binnen een stratum blijft de bestaande volgorde behouden. Ceiling-overlays blijven boven de inhoud en worden zoals eerder niet geëxporteerd. Kaarten zonder detaillaag houden hun oude objectvolgorde. Gewone Stamps worden door deze verbetering niet opnieuw gerangschikt.

Detail wordt aan de echte kaartgrenzen geknipt, niet aan afzonderlijke Area- of materiaalpolygonen. Daardoor kunnen roots, rubble en moss over een overgang van steen naar aarde lopen. Deze strata gelden voor de kaart als geheel; handmatig z-order tussen verschillende strata wordt dus vervangen door de beschreven volgorde zodra detail is toegevoegd.

Surface is geen kamergebonden verfmasker. Een brede Dirt-, Damp-, Wear- of Moss Wash-voetafdruk kan de ondergrond aan beide kanten van een muur moduleren; de muur bedekt alleen de overlap met zijn zichtbare lichaam. Prefer walls is een plaatsingsvoorkeur en geen kamerclip. Kamerbewuste Surface-masks blijven vervolgwerk: hiervoor is een expliciete keuze van de beschilderbare regio/zijde nodig, met betekenis voor openingen, open muren en latere muurverplaatsing. In deze verbetering worden Surface-strokes, opgeslagen decalposities en gebruikerskaarten niet herschreven. Bestaande Wall-edge Debris-strokes krijgen de betere laagvolgorde bij herladen.

## Opslag en export

Optioneel `map.environmentalDetail`, versie 1, bevat stabiele stroke-/instance-ID’s, seed, de toenmalige brushinstellingen, wereldpunten en concrete decaltransformaties. Elke stroke bewaart de vaste contentrevision (`dev-1` of `production-1`); productie-strokes bewaren daarnaast `pixelsPerFoot` zodat latere schaalinstellingen hun bestaande uiterlijk niet veranderen. Het bestaande projectformaat 12 blijft bruikbaar: ontbrekende data betekent geen detail. Er vindt geen automatische decoratie of datamigratie plaats. Save, autosave, heropenen en portable `.mapweaver`-bestanden gebruiken dezelfde data. Rendercaches worden nooit opgeslagen. Het doelapparaat moet dezelfde gebundelde componentrevision hebben; ontbrekende/corrupte productiebeelden geven een fout, geen stil DEV-alternatief.

PNG 1× en 2× gebruiken dezelfde renderer als de editor, met sparse tegels op de uitvoerresolutie. Productiebeelden worden vóór renderen op formaat, byteaantal en SHA-256 gecontroleerd. CPU-rasterbronnen en tegels voorkomen dat viewport-redraw de exportpixels laat variëren. Cursors en selectie komen niet in de PNG. Detail verandert de normale map dirty/revision-status. Campfire ontvangt het detail in de kaartbitmap; er worden geen semantische pebble-/decalobjecten aan het canonieke Map Contract toegevoegd. Campfire lighting, AO, fog en runtime-state zijn een afzonderlijke verantwoordelijkheid.

## Praktische grenzen

Gebruik meerdere korte strokes voor grotere kaarten. Per kaart gelden maximaal 1.024 strokes, 12.000 decals en 2 MiB detail-JSON; een stroke heeft maximaal 4.096 punten. Surface en productie-Decals gebruiken sparse 256-pixeltegels met een gedeelde cache van maximaal 32 MiB. De 44 gedecodeerde productiebronnen nemen samen maximaal 56 MiB in, met maximaal 16 MiB zachte Surface-patches. De exportgeheugencontrole houdt met deze buffers rekening. Nieuwe paints/erase reconstrueren alleen benodigde tegels; lange maskergeschiedenissen kunnen meer replaytijd kosten. Geen volledig exportbitmap per undo-stap.

## Productiecontent

De productiecomponenten staan in de gebundelde namespace `environmental-detail/production-1`, verdeeld in `surface` en `decals`; dit is geen `stamp`-assettype. De canonieke default-contentregistratie levert ze ook na normale `npm run dev` startup in Primary Development. Er worden geen 44 Stamp-cards of nieuwe bibliotheekcategorieën aangemaakt. Originele PNG-bytes, IDs, metadata en goedgekeurde center-anchors blijven behouden; afzonderlijke provenance legt de onafhankelijke productieacceptatie vast. Dit ZIP is geen importeerbaar Stamp-pack. De oude DEV-registry blijft uitsluitend voor bestaande strokes en tests beschikbaar.
