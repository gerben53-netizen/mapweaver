# Vijf kwaliteitswinsten ter beoordeling

Geen goedgekeurd sprint- of commitplan; eerst gebruikersprioriteiten beoordelen.

| Rang | Verbetering | Prioriteit / bereik | Waarom / afhankelijkheid |
|---|---|---|---|
| 1 | Geografische vormkwaliteit en zachte, schaalbewuste kust-/terreinovergangen | P1 · World/Regional, deels City | Grootste zichtbare verschil met Blando: vormen en overgangen vóór extra decoratie. R1; native topology/renderer gedeeld houden. |
| 2 | Consistente geaccepteerde assetfamilies en zoom-/projectieacceptatie | P1 · alle typen | FIX/onbeoordeeld is geen Premium; vul City-daken en ontbrekende battle-aankleding gericht aan. A1/A3/A4; strictly90° voor battle. |
| 3 | Maptype- en schaalpassende sizing/plaatsingspresets | P1 · alle typen | Voorkomt lege scatter of enorme symbolen en reduceert handwerk; huidige420km-proef concreet. A2/W1, bestaande defaultSize behouden. |
| 4 | Samenhangende City-authoring voor straten, percelen, wijken en gebouwen | P1 · City, hergebruik Regional/Battle | Zonder deze workflow blijft het een handmatig diagram; afhankelijk van productieassets en expliciet domeinbesluit. Geen City-modus geïmplementeerd in audit. |
| 5 | Cartografische compositie en labelhiërarchie met contrast-/overlapreview | P2 · World/Regional/City | Zorgt dat routes, plaatsnamen en titel op schaal leesbaar zijn; bestaande fonts/labels/automatic-label engine eerst benutten. W2, geen artworknabewerking. |

Losse betrouwbaarheidspoort: E1 (7 bestaande tests rood) eerst begrijpen en herstellen voordat een algemene productieclaim wordt gedaan. Pariteitsproeven van deze vier archives vervangen die testdekking niet. Geen herimplementatie van schaduwengine, nieuwe assets of automatische contractwijziging adviseren als snelle workaround.

Aanvullende betrouwbaarheidspoort E3/P2: isoleer de aangetroffen battlemap-afwijking tussen native request-gebonden en technische snapshot-export voordat renderpariteit voor alle aanroepcontexten wordt geclaimd. Bestaande native exports zijn onderling reproduceerbaar.
