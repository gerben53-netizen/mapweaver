# Elyra — analyse en native authoringplan

Broncode: `7df6cea1565efe8897f6771cf7090bd24528cb04`; productcode gelijk aan `db4117e`. Eigen branch `codex/elyra-world-reproduction`. Vooraf aanwezig en niet door deze opdracht gewijzigd: ZIP van de vorige vierkaartenaudit.

De originele referentie is 1536×1024. De productiekaart gebruikt 2400×1600, dezelfde 3:2-compositie, 18000 km breed. Referentiecoördinaten worden handmatig vertaald met factor1,5625. Geen referentiepixels in kaartassets, background, brushes of fills. Het ongewijzigde origineel wordt uitsluitend naast de echte native export vergeleken.

Hoofdstructuur: noordwestelijk continent Northreach/Westmere met noordelijke sneeuwkappen en de Spine of Kaidar; noordoostelijk Frosthelm met zuidelijke Mistwood/Thornwild; centraal Aramoor; zuidwestelijk Sunveil; zuidoostelijk Khazrul; zuidelijk Talonara; westelijke Skjold/Cerulean-eilanden en zuidoostelijke Whispering Isles. Smalle zeestraten en de Emerald Deep blijven vrij. Niet willekeurig genereren: de silhouetten zijn de bindende basis.

Lagen van onder naar boven: landmassa’s/eilanden; sneeuw-, gras-, bos-, woestijn-, moeras- en vulkanische terrain-Areas; bestaande Terrain Brush-accenten; bestaande painterly vegetatie en gebergten; River/Road/Border-paden; semantische Places; afzonderlijke labels; cartouche, kompas, legenda en schaalbalk. Alle objecten blijven native en afzonderlijk selecteerbaar. Een bestaand frame zorgt voor kaartafwerking; de exacte geïllustreerde ornamenten zijn geen beschikbare production-assets.

Handmatige kustpunten, seedgestuurde plaatsing van bestaande stamps en bestaande domeinconstructors zijn de authoringmethode. Dit vermijdt honderden repetitieve UI-klikken zonder een nieuwe renderer te maken. De ongewijzigde App moet vervolgens het archive openen, objecten selecteren en één echte bewerking met undo doorlopen. De eindexport komt uitsluitend uit Export PNG → Download PNG.

Acceptatie: herkenbare relatieve geografie en klimaatverdeling; complete bewerkbare archive; geen referentiehash in de assetmanifesten; echte editor- en detailbeelden; bewezen native UI-download; archive-reopen en objectbewerking; kritische deelgebiedbeoordeling en scores1–5. Geen productfeatures of assets toevoegen, geen Primary-writes, geen push of Windows-package.
