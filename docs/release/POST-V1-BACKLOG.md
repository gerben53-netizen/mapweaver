# Uitgestelde auditbevindingen

Alleen resterende bevindingen; opgeloste punten staan in het hoofdrapport.

| ID / prioriteit | Impact | Aanbevolen vervolg en controleerbaar resultaat |
|---|---|---|
| MW-AUD-011 — Medium | Merkbare vertraging bij 1.000 objecten; pan/zoom circa 1,7 s en tien sleepstappen circa 2,1 s in deze headless meting | Profileer dezelfde 20/100/1.000-fixtures op beoogde desktop. Splits inputwachttijd, React/Konva-render en history-serialisatie. Optimaliseer de gemeten oorzaak; vergelijk dezelfde reeks zonder regressies in selectie/undo/export. Geen willekeurige FPS-garantie. |
| MW-AUD-006 — Low | Patroonvelden bevatten onleesbaar lange decimalen | Voeg display-/draftformattering toe met volledige modelprecisie bij ongewijzigde invoer; regressie op openen/sluiten van properties zonder mutatie. |
| MW-AUD-012 — Low | Wederzijdse store-import bemoeilijkt verdere uitbreiding en initialisatie | Bij eerstvolgende command-refactor coördinatie losmaken van wederzijdse store-import; identiteit, selectieopschoning en historygrenzen gelijk houden. |
| MW-AUD-013 — Informational / verificatie | Firefoxgedrag onbekend doordat browser niet startte | In een betrouwbare lokale Firefox-omgeving `npx playwright test --project=firefox` draaien en browserversie noteren; bij productfouten ernst opnieuw bepalen. |

Aanvullende testdiepte (geen vastgesteld defect): screenreader, native 200%-browserzoom, langdurige RSS/GPU-geheugenmeting, fysieke quota-uitputting en browserupgrade van een echte oude installatie. Deze controles zijn geen reeds behaalde acceptatieclaims.
