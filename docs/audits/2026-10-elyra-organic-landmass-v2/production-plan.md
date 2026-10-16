# Elyra organic landmass V2 — productieplan

Acceptatie vóór authoring: uitsluitend bewerkbare native landmassa-Areas, geen stamps, labels, decoratie, terrain paint, bitmapachtergrond of referentiepixels. 2400×1600, 18000 km, oorspronkelijke 3:2-compositie. Bronrevisie `50b1d2e45b17457c03502e92ea1f7f7597b0da04`; afzonderlijke branch `codex/elyra-organic-landmass-v2`.

Ronde 1: opnieuw handmatig getraceerde Freehand-hoofdcontouren, belangrijke archipels en zee-engten; beperkte bestaande contour-Smooth. Echte native export zonder coastline-effecten. Vergelijk visueel met referentie en V1, corrigeer geografische fouten vóór ronde 2.

Ronde 2: echte Land Add/Remove voor grote en middelgrote baaien/kapen, kleine onregelmatigheden en eilanddetails; variabele Organic, Island, Peninsula en Coastline Detail-footprints. Lokale Smooth Coast alleen met gebieds- en topologiebewaking; geen generieke globale oversmoothing. Roughness-stroke blijft nul; kleur/zee blijven gelijk aan ronde 1. Verander geen oorspronkelijke kaart.

Technische acceptatie: centrale projectvalidatie, native Area-/landbudgetten, archive encode/decode, werkelijke editor en Preview, native PNG-export, geometrie-/exportroundtrip, bewijs van gebruikte functies met parameters en voor/na-nodeaantallen. Vergelijkingsmontage uitsluitend uit origineel en echte exports; duidelijk als rapportbewijs. Geen productcodewijziging, push, Windows-package of Primary-writes. Eén eigen lokale auditcommit.
