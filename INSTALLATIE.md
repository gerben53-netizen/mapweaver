# Mapweaver installeren en gebruiken

## Wat is Mapweaver?

Mapweaver is een lokale kaartmaker voor battlemaps, interieurs, regionale kaarten en wereldkaarten. Bouw kaarten met afzonderlijk bewerkbare objecten en exporteer het resultaat als PNG. Een account of cloudverbinding is niet nodig.

## Systeemeisen

Doelplatform: Windows 10 of 11, x64, met een recente Edge, Chrome of Firefox. Node.js, npm en Git zijn niet nodig. Aanbevolen, geen gecertificeerd minimum: 8 GB geheugen, een scherm van minstens 1280 × 720 en 1 GB vrije ruimte voor de installatie, plus ruimte voor uw eigen kaarten, afbeeldingen en back-ups. Grote kaarten en exports vragen meer geheugen.

## Installeren

1. Kopieer of download `Mapweaver-Setup-<versie>.exe` naar uw computer.
2. Open het bestand. Installeer uitsluitend een exemplaar van een vertrouwde bron. Deze release is niet digitaal ondertekend; Windows kan daarom een waarschuwing tonen. Controleer herkomst en bestandsnaam voordat u doorgaat.
3. Volg de installatie. De standaardlocatie is `%LOCALAPPDATA%\Programs\Mapweaver`. Beheerderrechten zijn niet nodig.
4. Kies eventueel een bureaubladsnelkoppeling.
5. Start Mapweaver vanuit het Startmenu of aan het einde van de installatie.

## Eerste start

Mapweaver start op de achtergrond en opent de editor in uw standaardbrowser. Het M-pictogram staat in het systeemvak, eventueel onder de verborgen pictogrammen. Het browservenster sluiten stopt Mapweaver niet; gebruik **Stop Mapweaver** of het systeemvakmenu.

Bij een volledig nieuwe gegevensmap worden de database en 77 standaardstamps aangemaakt. Een bestaande bibliotheek wordt behouden en niet opnieuw gevuld. De laatste kaart wordt heropend als die bestaat; anders kunt u een campagne en een nieuwe kaart maken.

De lokale service is alleen bereikbaar op uw eigen computer. Er hoeft geen firewallpoort te worden geopend.

## Wat zit standaard in Mapweaver?

De editor bevat lagen, selectie, stamps, gebieden, paden, muren, deuren/ramen, brushes, rasters, undo/redo, lokale opslag en PNG-export. Stamp Soft Shadow is beschikbaar. Living Root gebruikt 28 productiecomponenten. Er zijn 32 Painterly Terrain-materialen, 46 Painterly World-stamps en 31 geïllustreerde nederzettingen/landmarks. Acht gecureerde lettertypefamilies plus Liberation Sans en hun licenties zijn inbegrepen.

De standaardstamps zijn vooral voor regionale en wereldkaarten. De bibliotheek kan assets filteren op kaarttype. Eigen interieur- of battlemapillustraties kunt u toevoegen. Er worden geen persoonlijke campagnes, voorbeeldkaarten, ontwikkelbibliotheek of QA-bestanden geïnstalleerd.

## Wat kun je zelf toevoegen?

Importeer PNG-, JPEG- of WebP-afbeeldingen als stamps, achtergronden of fill patterns. De Asset Library ondersteunt Mapweaver-assetpakketten als ZIP. Ondersteunde Wall sets kunnen als materiaalpakket worden geïmporteerd. Een willekeurige map met generatorcomponenten wordt niet automatisch een nieuwe generator. Fill patterns kunnen voor gebieden en de Battlemap Texture Brush worden gebruikt; willekeurige afbeeldingen worden geen nieuwe ingebouwde World Terrain Brush-materialen.

Extra lettertypebestanden importeren wordt niet ondersteund. Gebruik de meegeleverde lettertypen in de fontkiezer voor voorspelbare weergave en export. Bewerkbare `.mapweaver`-kaarten kunnen worden geïmporteerd. Campfire-export is beschikbaar; dit is geen Campfire-import of cloudkoppeling.

## Assets en asset packs

**Standaardassets** horen bij de installatie. In een nieuwe bibliotheek zijn de twee stampcollecties meteen beschikbaar; terrain en Living Root verschijnen in hun gereedschappen. **Geïmporteerde packs** zijn extra verzamelingen die u zelf toevoegt. **Persoonlijke assets** zijn uw eigen geïmporteerde afbeeldingen.

Open de **Asset Library**, kies de packimport en controleer de preview en opgeloste wijzigingen voordat u de import bevestigt. Packs verschijnen als bibliotheekassets en, waar het pack dat definieert, in collections/categorieën. Verwijder geselecteerde assets met de bestaande verwijderactie en controleer de gebruikswaarschuwing. Er is geen algemene knop die een complete packinstallatie aan/uit zet. Assets met een inactieve kwaliteitsclassificatie worden niet aangeboden voor nieuwe plaatsing; bestaande kaartverwijzingen blijven bestaan. Een update brengt verwijderde standaardassets niet stilzwijgend terug.

## Maps maken en opslaan

Maak een campagne en kaart, kies kaartafmetingen en plaats objecten. De app slaat lokaal op; controleer de opslagstatus voordat u afsluit. Exporteer een `.mapweaver`-bestand voor een afzonderlijke bewerkbare kopie, of PNG voor een afbeelding. Uw eigen gegevens staan buiten de programmamap in `%LOCALAPPDATA%\Mapweaver`.

## Updaten

Sla uw werk op en maak een back-up. Stop Mapweaver. Voer vervolgens de nieuwere installer uit, met dezelfde installatiemap. De installer controleert een veilige stop voordat bestanden worden vervangen. Kaarten, campagnes en geïmporteerde assets blijven behouden; bestaande schemamigraties worden gebruikt. Een update reset de bibliotheek niet.

## Verwijderen

Gebruik Windows **Instellingen → Apps → Mapweaver → Verwijderen**. De applicatie wordt verwijderd; persoonlijke gegevens blijven standaard bewaard. Bij opnieuw installeren worden die gegevens hergebruikt.

Voor een volledige reset: maak eerst een gecontroleerde back-up, stop en verwijder Mapweaver, en verwijder daarna zelf `%LOCALAPPDATA%\Mapweaver`. Dit wist ook kaarten, campagnes en geïmporteerde assets. Browsergebonden herstelbuffers en voorkeuren kunnen apart in de sitegegevens van de gebruikte browser staan; wis die alleen nadat uw werk veilig is opgeslagen/geëxporteerd.

## Back-up

Gebruik **Project → Storage** voor de bestaande back-up/herstelfuncties. Voor een bestandsback-up: stop Mapweaver en kopieer de volledige map `%LOCALAPPDATA%\Mapweaver`, niet alleen de database. Deze bevat SQLite, kaarten/campagnegegevens, oorspronkelijke afbeeldingen, previews, instellingen, herstelpunten en logs. Exporteer belangrijke kaarten daarnaast als `.mapweaver`.

Browserherstelbuffers zijn geen vervanging voor een back-up en worden niet meegenomen door alleen de gegevensmap te kopiëren. Een expliciet aangepaste gegevenslocatie staat bij **Project → Storage**; maak dan van die locatie een back-up.

## Problemen oplossen

- **Geen venster:** controleer het verborgen systeemvak en kies **Open**. Een tweede start opent de bestaande instantie.
- **Startfout:** stop een oudere Mapweaver-instantie. Verwijder geen database of lockbestanden om een fout te omzeilen. Gebruik **Diagnostics** in het systeemvak en **Project → Storage** voor diagnose. Service-lifecyclelogs staan onder `logs` in de gegevensmap; de launcher toont startfouten in zijn diagnosevenster.
- **Stop of update geblokkeerd:** sla werk op en sluit andere Mapweaver-tabbladen. Een update forceert geen actieve databasewriter.
- **Import mislukt:** lees de fout/preview. Controleer formaat en grootte; een ZIP met willekeurige afbeeldingen heeft niet automatisch geldige packmetadata.
- **Onverwachte browserproblemen:** probeer een recente Edge, Chrome of Firefox. Behoud herstelgegevens totdat uw kaart veilig is opgeslagen.

## Versie

De versie staat bij Mapweaver in Windows Apps en bij **Eigenschappen → Details** van `Mapweaver.exe`. Installer, programma en lokale service gebruiken dezelfde releaseversie. Bewaar deze versie bij een foutmelding.
