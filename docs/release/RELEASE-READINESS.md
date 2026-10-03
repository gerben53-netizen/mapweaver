# Releaseadvies — Mapweaver 1.0.0

**GO voor de geteste desktopworkflow in Chromium.**

Datum: 23 september 2026. Getest: Windows, Chromium 153.0.8010.12, Node 24.17.0 / npm 11.13.0. Formaat 2 (leest ook 1), Dexie-schema 3. Branch master met één worktree, geen commit beschikbaar; oorspronkelijke bestanden waren untracked. Dit advies betreft de huidige lokaal gewijzigde werkboom, geen gepubliceerd artefact.

## Onderbouwing

- 157/157 unit-/component-/integratietests en 7/7 browserproeven slagen; kernworkflow extra 3/3 herhaald. Volledige lint, TypeScript en productiebuild slagen.
- Save/open/save, zelfstandig project in schoon browserprofiel, typed-assetmigratie en transactionele migratiefout tonen in de geteste gevallen geen dataverlies.
- Autosave/recovery, New/Open-waarschuwingen, undo/redo en corrupte/onveilige invoer zijn gecontroleerd. Gevonden import-/autosave-/persistente-grensfouten zijn gerepareerd.
- Echte PNG's op 1×/2× kloppen dimensioneel; transparantie en Roll20-tekst gecontroleerd, uitvoer visueel zonder editor-UI. Productie-preview exporteert zonder runtimefout.
- 1280×720 en 1920×1080 zijn visueel beoordeeld. Pickerfocus en kernsneltoetsen werken; axe editor/picker meldt 0 overtredingen.
- npm audit meldt 0 bekende kwetsbaarheden. Geen externe netwerkverzoeken vanuit de gemeten productieflow.

## Bevindingen en resterende grenzen

14 bevindingen: **10 Fixed, 3 Deferred, 1 Open**. Niet opgelost inclusief Deferred: **0 Critical, 0 High, 1 Medium, 2 Low, 1 Informational**. Geen bekende releaseblokker binnen de bewezen scope; geen verplichte productfix meer vóór deze beperkte releaseaanbeveling.

Resterend: merkbare vertraging bij 1.000 objecten (Medium), lange decimalen in patroonvelden en een wederzijdse store-import (Low). Firefox 155.0/Playwright-build 1543 kon niet starten en is **Blocked**, niet geslaagd. Geen claim van gelijke performance of compatibiliteit in niet-geteste browsers/apparaten. De opslaglimiet van 10.000 objecten is geen performancegarantie.

Native 200%-browserzoom, screenreader, langdurige native/GPU-geheugenbelasting, fysieke quota-uitputting en een echte oude browserinstallatie-upgrade zijn niet uitgevoerd. Wel getest: 200%-CSS-reflowproxy, fake-indexeddb-migratie inclusief rollback, gesimuleerde schrijffout en korte URL/cache-opruimcyclus. Recovery blijft geen backup; downloadstart kan de uiteindelijke OS-write niet bevestigen.

Voor een bredere browser-/toegankelijkheidscertificering gelden de aanvullende controles uit het testverslag. Dit zijn grenzen van het huidige bewijs, geen stilzwijgende Pass-statussen. Dit GO is geen toestemming of opdracht om te publiceren; er is niets extern uitgevoerd.

## Rapporten

- [Volledige audit en requirementsmatrix](FULL-AUDIT-REPORT.md)
- [Tests, commando's, mislukte tussenruns en browsermatrix](TEST-REPORT.md)
- [Security en data-integriteit](SECURITY-AND-DATA-INTEGRITY-REPORT.md)
- [UX, toegankelijkheid en prestaties](UX-ACCESSIBILITY-AND-PERFORMANCE-REPORT.md)
- [Uitgestelde bevindingen](POST-V1-BACKLOG.md)
- [Oorspronkelijke baseline](BASELINE.md)

Ruwe bewijzen staan lokaal onder genegeerde `.audit.local/`; reproduceerbare generators en tests staan in scripts/ en tests/e2e/. Geen push, merge, publicatie, deployment, upload of cloudwijziging. Er zijn alleen lokale devtools geïnstalleerd en openbare package-/browserdownloads gebruikt.
