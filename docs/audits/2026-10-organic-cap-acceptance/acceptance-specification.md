# Mapweaver — Organic Stroke Cap Acceptance Specification

**Status:** Voorgestelde acceptatiecriteria  
**Scope:** Organic Soft, Rugged en Fine  
**Baseline:** Bestaande native exports vóór Cap Refinement  
**Uitgangspunt:** Eén gerichte correctie-iteratie

## 1. Meetprincipe

Meet begin- en eindcaps afzonderlijk en vergelijk deze met de bestaande stroke-body.

Een cap is acceptabel wanneer deze:

1. Geen opvallende afgeronde uitstulping vormt.
2. Geleidelijk aansluit op de stroke-body.
3. De breedte en organische structuur van de stroke behoudt.
4. Geen nieuwe geometrische artefacten introduceert.

Gebruik dezelfde startgeometrie, stroke-trajecten, seeds, brushgroottes en renderinstellingen vóór en na de correctie.

**Normaliseer geometrische metingen op de nominale brushdiameter D.** Daarmee blijven verschillende brushgroottes vergelijkbaar.

## 2. Meetbare kwaliteitsindicatoren

### M1 — Cap Bulge Ratio (CBR)

Meet de maximale ongewenste zijdelingse uitstulping van de cap ten opzichte van de lokale stroke-body.

Berekening:

`CBR = maximale extra halve breedte / nominale brushdiameter`

Bepaal de lokale bodybreedte uit het aangrenzende stabiele stroke-middengedeelte. Gebruik een robuuste lokale referentie, bijvoorbeeld de mediaan van de halve breedtes over het aangrenzende bodyvenster.

**Voorlopige acceptatiegrenzen:**

- CBR ≤ 0,10: PASS.
- CBR 0,10–0,15: REVIEW.
- CBR > 0,15: FAIL.

De cap mag dus hoogstens 10% van de nominale brushdiameter extra uitstulpen ten opzichte van de aangrenzende body.

### M2 — Cap Transition Continuity (CTC)

Meet hoe abrupt de stroke-breedte verandert bij de overgang van cap naar body.

Berekening:

`CTC = maximale absolute breedteverandering tussen opeenvolgende meetdoorsneden / D`

Gebruik meetdoorsneden met een vaste wereldafstand, onafhankelijk van de oorspronkelijke stroke-sampling.

**Voorlopige acceptatiegrenzen:**

- CTC ≤ 0,08: PASS.
- CTC 0,08–0,12: REVIEW.
- CTC > 0,12: FAIL.

Controleer daarnaast visueel of geen abrupte knik aanwezig is. Een vloeiende breedteovergang kan nog steeds een zichtbare contourknik bevatten.

### M3 — Body Preservation (BP)

Meet de geometrische verandering buiten de cap-overgangszones.

Vergelijk de oude en nieuwe stroke-body via een symmetrisch verschilmasker.

`BP = 1 − (oppervlak symmetrisch verschil / oppervlak oorspronkelijke body)`

**Acceptatie:**

- BP ≥ 0,98.
- Geen nieuwe gaten.
- Geen verdwenen karakteristieke uitstulpingen.
- Geen herkenbaar verlies van de Rugged-structuur.

Wanneer de bestaande diagnostische polygon-difference faalt, gebruik dan een reproduceerbare rastermaskervergelijking met gedocumenteerde resolutie.

Rapporteer een niet-beschikbare geometrische meting als `null`, niet als nul.

### M4 — Cap Improvement (CI)

Vergelijk de capuitstulping vóór en na de correctie.

`CI = (CBR_before − CBR_after) / CBR_before`

**Acceptatie:**

- Minimaal 50% reductie van de capuitstulping bij relevante probleemgevallen.
- De absolute CBR moet daarnaast voldoen aan de PASS-grens.

Een reductie van 50% is niet voldoende wanneer het eindresultaat nog steeds een duidelijk herkenbare ronde lob bevat.

Wanneer de oorspronkelijke CBR nul of verwaarloosbaar is, geldt uitsluitend de absolute CBR-grens; rapporteer CI als niet toepasbaar.

### M5 — Geometry Validity

Alle nieuwe footprints en resulterende Areas moeten voldoen aan de bestaande geometrische veiligheidscontroles.

**Acceptatie:**

- 0 zelfsnijdingen.
- 0 ongeldige polygonringen.
- 0 onverwachte losse fragmenten.
- 0 onbedoelde gaten.
- 0 regressies in Land Add/Remove.
- 0 regressies in undo/redo en archive-roundtrip.

Ongeldige geometrie mag veilig worden geweigerd. Een onverwacht geweigerde bewerking telt echter wel als mislukking van het betreffende testgeval.

### M6 — Round Regression

De bestaande Round Brush is de controlevariant.

**Acceptatie:**

- Exact dezelfde uitvoergeometrie.
- Byte-identieke native PNG-export onder identieke omstandigheden.
- Geen wijzigingen aan standaardinstellingen of samplingsemantiek.

## 3. Testmatrix

Gebruik minimaal de volgende tien geometrische testgevallen.

| Test | Stroke | Wat meten? |
|---|---|---|
| T01 | Lang horizontaal | Begin- en eindcap |
| T02 | Lang verticaal | Oriëntatieonafhankelijkheid |
| T03 | Diagonaal | Tangentafhandeling |
| T04 | Vloeiende S-bocht | Cap/body-overgang |
| T05 | Scherpe bocht | Knikken en zelfsnijding |
| T06 | Korte stroke | Overlappende capzones |
| T07 | Zeer korte stroke | Minimumlengte |
| T08 | Eén click/dab | Losse footprint |
| T09 | Overlappende strokes | Union en geometrische stabiliteit |
| T10 | Northreach-kust | Praktische visuele kwaliteit |

Voer T01–T10 uit voor Organic Soft, Rugged en Fine.

Dat levert **30 testgevallen** op. Meet begin- en eindcap afzonderlijk waar die bestaan.

Voor click/dab geldt geen gerichte capmeting: valideer footprintvorm en geometrische correctheid.

Bij zeer korte strokes zonder stabiele body zijn CBR, CTC en BP mogelijk niet betekenisvol. Gebruik daar afzonderlijke acceptatie op vorm, continuïteit en geometrische geldigheid. Forceer geen misleidende metriek.

## 4. Verplichte native beelden

Lever per brushvariant minimaal:

- Volledige stroke.
- Detail van het begin.
- Detail van het einde.
- Kort strokevoorbeeld.
- Gebogen strokevoorbeeld.
- Native Northreach-kaartuitsnede.

Maak daarnaast een vaste vóór/na-contactsheet waarin de originelen en nieuwe exports onder exact dezelfde omstandigheden zijn opgenomen.

**De eindbeoordeling gebeurt op normale kaartzoom.** Vergrote technische detailbeelden zijn aanvullend bewijs.

## 5. Onafhankelijke visuele beoordeling

Geometrische scores zijn noodzakelijk maar niet voldoende.

Beoordeel iedere brushvariant op een schaal van 1–5 voor:

- Herkenbaarheid van afzonderlijke brushafdrukken.
- Natuurlijkheid van start- en eindcaps.
- Vloeiende aansluiting op de body.
- Behoud van karakteristieke organische vormen.
- Afwezigheid van nieuwe scherpe of vlakke cap-artefacten.

**Voorlopige visuele acceptatie:**

- Minimaal 4/5 per criterium.
- Geen duidelijk storende ronde eindlobben op normale kaartzoom.
- Geen aantoonbare verslechtering ten opzichte van de vorige Rugged-baseline.

Rapporteer wie de beoordeling uitvoerde. Een door Codex toegekende score is een voorlopige interne beoordeling, geen onafhankelijke artistieke acceptatie.

## 6. GO / ADJUST / REJECT

### GO — Productiegeschikt

Alle volgende voorwaarden moeten gelden:

1. Alle relevante CBR- en CTC-metingen voldoen aan PASS.
2. De oorspronkelijke probleemgevallen halen minimaal 50% capverbetering.
3. Body Preservation is minimaal 98%.
4. Alle verplichte geometrische en technische controles slagen.
5. Round blijft byte-identiek.
6. De visuele beoordeling voldoet aan de kwaliteitslat.
7. De native Northreach-proef toont geen duidelijk herkenbare eindlobben.

### ADJUST — Verbeterd, niet geaccepteerd

Van toepassing wanneer:

- de geometrie technisch geldig is;
- aantoonbare kwaliteitswinst bestaat;
- maar één of meer capcriteria niet worden gehaald.

Rapporteer exact welk criterium faalt, voor welke brushvariant en welk testgeval.

Start niet automatisch een extra correctieronde.

### REJECT — Correctie ongeschikt

Van toepassing wanneer:

- geen betekenisvolle verbetering optreedt;
- de stroke-body substantieel verslechtert;
- ongeldige geometrie ontstaat;
- Round-regressie optreedt;
- of de implementatie onevenredige technische complexiteit introduceert.

## 7. Vereiste meetrapportage

Lever een machineleesbaar bestand:

`cap-acceptance-results.json`

Met per testgeval minimaal:

```json
{
  "brush": "organic-rugged",
  "testId": "T01",
  "brushDiameter": 40,
  "capStart": {
    "cbrBefore": null,
    "cbrAfter": null,
    "ctcAfter": null,
    "improvement": null
  },
  "capEnd": {
    "cbrBefore": null,
    "cbrAfter": null,
    "ctcAfter": null,
    "improvement": null
  },
  "bodyPreservation": null,
  "geometryValid": null,
  "nativeExportVerified": null,
  "decision": "NOT_MEASURED"
}
```

Vervang `null` uitsluitend door daadwerkelijk gemeten waarden.

Documenteer:

- De afbakening van cap- en bodyzones.
- De gebruikte sampleafstand.
- De rasterresolutie indien rastervergelijking wordt gebruikt.
- De meettoleranties.
- Eventuele niet-toepasbare metingen.
- De herkomst van de native exports.

## 8. Voorwaarden voor definitieve acceptatie

De bovengenoemde numerieke grenzen zijn **voorlopige engineeringgrenzen**. Ze zijn nog niet empirisch gekalibreerd op de bestaande Mapweaver-exports.

Laat Codex daarom vóór het definitieve GO-besluit controleren of de meetmethode overeenkomt met wat visueel als een storende eindlob wordt ervaren.

Wanneer bijvoorbeeld een zichtbaar storende Rugged-cap toch CBR ≤ 0,10 scoort, is de metriek of de grens onvoldoende geschikt. Rapporteer dat expliciet en geef geen automatische GO.

Stel de grenzen niet achteraf bij uitsluitend om een test te laten slagen. Elke voorgestelde aanpassing vereist een onderbouwde visuele vergelijking en expliciete goedkeuring.

**Een technisch groen meetrapport mag nooit een zichtbaar onvoldoende kustlijn alsnog premiumwaardig verklaren.**