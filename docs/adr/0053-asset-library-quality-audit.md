# ADR-0053 — Niet-destructieve kwaliteitsstatus en taxonomie-audit

Status: aangenomen, 3 oktober 2026.

## Besluit

De bibliotheek krijgt in SQLite-schema 10 één optionele JSON-kolom `assets.quality`. Deze bevat `classification`, `reason`, `semanticClass` en `softShadowDefault`. KEEP en FIX blijven beschikbaar voor nieuwe plaatsing; REPLACE, REJECT en DUPLICATE worden uit de bibliotheekquery, gewone assetlijst en generatorselectie gefilterd. Niet-geauditeerde nieuwe imports blijven beschikbaar zonder automatisch een Premium-keurmerk te krijgen.

Kwaliteit staat los van `deletedAt`. ID-resolutie, originele bytes, previews, projectreferenties en bestaande objecten blijven beschikbaar. Een audit verandert geen PNG, plaatsingsmaat, projectdocument of object-ID. Het schaduwadvies beïnvloedt uitsluitend nieuwe stamps: false wordt een opgeslagen off-override; true respecteert de kaartinstelling.

De optionele metadata wordt gevalideerd en in manifestversies 1–3 behouden bij export/import. Een gewone herimport zonder kwaliteitsveld wist een bestaande kwaliteitsbeslissing niet. Historische assets blijven via projectexport overdraagbaar.

De beoordeelde taxonomie-migratie controleert bibliotheekrevision, asset-ID en werkelijke SHA-256 voordat zij atomair metadata wijzigt. Oude categorie-ID's krijgen aliases naar hun nieuwe bestemmingen; oude tagtermen blijven zoekbaar via aliases. Alleen niet meer gebruikte oude taxonomienodes worden verwijderd. Er komt geen nieuwe browser of aparte assetdatabase.

## Gevolgen

Voor toepassing wordt een databaseback-up gemaakt. Oudere executables met schema 9 kunnen schema 10 niet lezen; gebruik de bijgewerkte bronversie of een later expliciet aangevraagde executable. Kaartformaat 12 verandert niet.

De eerste audit is een expliciete visuele beoordeling van één vastgelegde bibliotheek. De beslissingen zijn aan de inventarisfingerprint gebonden en mogen niet automatisch voor nieuw artwork worden hergebruikt. De battlemapkwaliteitsstandaard certificeert geen schuine atlasillustraties, losse renderercomponenten of achtergronden als Premium stamps.

Het Campfire-contract en de gekoppelde Campfire-omgeving worden niet aangepast.
