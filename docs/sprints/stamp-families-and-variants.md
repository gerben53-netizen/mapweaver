# Stamp Families and Variants

Acceptance: one governed library card per family; stable cover and IDs; weighted choice once per placement; explicit Variant/Andere variant; exact history, copies, persistence, archive and PNG; immutable revisions and retained deprecated references; legacy maps unchanged.

Implementation: ADR-0060. No renderer, wall, material or Campfire changes. Production PQA assets and user databases are not rewritten.

The local six/seven bookshelf diagnostic pack and actual editor evidence are written to `deliverables.local/stamp-families/`. These geometric/color fixtures demonstrate behavior only and are not Premium artwork or production replacements. The same test pack is imported through the real modal review/confirmation workflow.

Validation results and timings are recorded in `browser-results.json` in that directory. Targeted domain tests cover weighted/excluded selection, direct persistence, legacy compatibility, exact undo/redo, duplicate/copy/paste and document parsing. Service tests cover governed family import, metadata, one-card search, archive transfer, additive revisions, retained references and invalid imports. Existing governance/storage/library/default-content and inspector/placement regressions are included.

Future PQA REPLACE consolidation requires reviewed semantic grouping and new family packs with compatible art, physical footprints and anchors. This sprint does not merge or delete existing assets or replace the backlog.

## Validatie op 4 oktober 2026

- 46 gerichte servicetests geslaagd (families, governance, library, opslag/migratie en default content); opslag/default-content met een 20s-testtimeout vanwege gelijktijdige lokale QA-belasting.
- 18 gerichte clienttests geslaagd (families/history/document, placement, inspector, asset removal, material picker).
- 10 echte browsercontroles geslaagd; nul page errors. Zes diagnostische varianten, twintig gewogen plaatsingen plus echte canvasclicks; expliciete variant en Andere variant; exact undo/redo; duplicate/copy/paste; lokale save/reload; portable archive; één embedded familiekaart; PNG; zevende variant in nieuwe revision zonder bestaande objects te veranderen.
- Gemeten eerste activation/adoption: circa 169ms voor zes kleine diagnostische PNG's. Alleen benodigde canvasafbeeldingen worden gedecodeerd. Dit is geen claim voor grote productiebeelden.
- Typecheck, gerichte ESLint, clientbuild en servicebuild geslaagd. Volledige build slaagde eerder; de definitieve herhaling is geblokkeerd door externe canonieke Campfire-contractdrift in `generate-schema.mjs`. Geen bron of generated contractkopie is aangepast. Contract-owner/provenance-refresh is een afzonderlijk afhankelijk vervolg.
- Diffcontrole uitgevoerd. Geen userdata, productie-artwork, Windows-package of remote acties.
