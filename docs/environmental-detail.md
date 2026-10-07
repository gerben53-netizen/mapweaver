# Environmental Detail

Environmental Detail voegt niet-destructieve gebruikssporen toe boven de ondergrond. Kies het gereedschap in de linker gereedschapsbalk. Alle elf huidige presets zijn **DEV/diagnostic**, geen Premium artwork.

## Surface en Decals

**Surface** schildert zachte, onregelmatige kleurmodulatie: Dirt, Damp, Wear en Moss wash. Dirt, Damp en Moss vermenigvuldigen de onderliggende kleur; Wear legt een lichte toon over de ondergrond. Opacity bepaalt de sterkte en Softness het verloop. De ondergrondafbeelding wordt nooit gewijzigd.

**Decals** strooit Cracks, Rubble, Gravel, Leaves, Small roots, Moss clumps of Wall-edge debris. Dit zijn opgeslagen instanties binnen één kaartgebonden detaillaag, geen gewone selecteerbare Stamps. De assetpicker wordt niet met detailcomponenten gevuld.

## Bediening

Kies Paint en sleep met de primaire muisknop. Eén afgeronde sleepactie is één undo-stap. Escape, focusverlies, pointercancel of wisselen van gereedschap annuleert een onafgeronde stroke. Space + slepen en de middelste muisknop blijven beschikbaar voor pan. De cursorcirkel toont de radius in kaartcoördinaten; zoom verandert het fysieke penseel niet.

- Radius en decalafmetingen verschijnen in feet wanneer de kaart een fysieke schaal heeft, anders in map pixels. Bij de canonieke battlemap-schaal geldt 10 px = 1 ft.
- Density is het gewenste aantal pogingen per 10.000 map-pixels², oftewel 100 ft² bij de canonieke schaal. Clipping, lokale overlapcontrole en edge bias kunnen het uiteindelijke aantal verlagen.
- Minimum/Maximum size bepalen de volledige footprintdiameter. Rotation variation loopt van geen variatie tot ±180°. Visual variation kiest uit vier diagnostische varianten en varieert de dekking.
- **Prefer walls** gebruikt de functionele geometrie van zichtbare native Walls. Het geeft voorkeur aan de muurvoet binnen het beschilderde gebied; het versiert nooit automatisch alle muren en leest geen afbeeldingpixels.
- Erase raakt uitsluitend de gekozen detailmodus. Surface-erase vermindert bestaande masks met de ingestelde sterkte; herhaald wissen verwijdert verdere dekking. Decal-erase verwijdert instanties waarvan het centrum binnen de wisstroke ligt. Vloeren, Walls, Areas, gewone Stamps en de achtergrond blijven intact.
- Undo/redo herstellen de opgeslagen detaildata exact. Hide/Show en Lock/Unlock gelden voor de gehele detaillaag.

## Laagvolgorde en grenzen

Zodra een kaart Environmental Detail bevat, gebruikt editor én export dezelfde strata: achtergrond → normale Areas en bestaande materiaal-/terrainverf → Surface → vloerdecal → Paths/Walls/Openings → wall-edge debris → props en tekst → editoroverlays. Binnen een stratum blijft de bestaande volgorde behouden. Ceiling-overlays blijven boven de inhoud en worden zoals eerder niet geëxporteerd. Kaarten zonder detaillaag houden hun oude objectvolgorde.

Detail wordt aan de echte kaartgrenzen geknipt, niet aan afzonderlijke Area- of materiaalpolygonen. Daardoor kunnen roots, rubble en moss over een overgang van steen naar aarde lopen. Deze strata gelden voor de kaart als geheel; handmatig z-order tussen verschillende strata wordt dus vervangen door de beschreven volgorde zodra detail is toegevoegd.

## Opslag en export

Optioneel `map.environmentalDetail`, versie 1, bevat stabiele stroke-/instance-ID’s, seed, de toenmalige brushinstellingen, wereldpunten en concrete decaltransformaties. Het bestaande projectformaat 12 blijft bruikbaar: ontbrekende data betekent geen detail. Er vindt geen automatische decoratie of datamigratie plaats. Save, autosave, heropenen en portable `.mapweaver`-bestanden gebruiken dezelfde data. Maskercaches worden nooit opgeslagen.

PNG 1× en 2× gebruiken dezelfde renderer als de editor, met maskertegels op de uitvoerresolutie. Cursors en selectie komen niet in de PNG. Detail verandert de normale map dirty/revision-status. Campfire ontvangt het detail in de kaartbitmap; er worden geen semantische pebble-/decalobjecten aan het canonieke Map Contract toegevoegd. Campfire lighting, AO, fog en runtime-state zijn een afzonderlijke verantwoordelijkheid.

## Praktische grenzen

Gebruik meerdere korte strokes voor grotere kaarten. Per kaart gelden maximaal 1.024 strokes, 12.000 decals en 2 MiB detail-JSON; een stroke heeft maximaal 4.096 punten. Surface gebruikt sparse 256-pixeltegels met een gedeelde LRU-cache van maximaal 32 MiB. Nieuwe paints/erase reconstrueren alleen benodigde tegels; lange maskergeschiedenissen kunnen meer replaytijd kosten. Geen volledig exportbitmap per undo-stap.

## Productiecontent

De huidige componenten staan uitsluitend in de gebundelde DEV-registry, buiten de gebruikersbibliotheek. De aparte contentnamespace is `environmental-detail`, verdeeld in `surface` en `decals`; dit is geen `stamp`-assettype. De standalone Production Spec beschrijft de toekomstige PNG-levering, stabiele rollen en vier varianten per rol. Registratie/import van echte Premium PNG-packs vereist nog een afzonderlijke integratiesprint: de huidige renderer gebruikt uitsluitend diagnostische vectoren en kleurmasks. Noem een productie-ZIP daarom nog geen importeerbaar Stamp-pack.
