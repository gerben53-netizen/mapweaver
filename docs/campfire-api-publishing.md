# Kaarten naar Campfire sturen

API-publicatie is een aanvulling op **Export Campfire Map**. Je kunt Mapweaver zonder Campfire blijven gebruiken.

## Verbinding maken

1. Een Campaign-DM opent in Campfire **Campaign → Maps → MapWeaver verbindingen**.
2. Maak een verbinding voor de juiste campagne, met `MAP_CONTRACT_READ`, `MAP_IMPORT` en `MAP_IMPORT_STATUS`.
3. Bewaar de eenmalig getoonde token veilig. Campfire toont hem niet opnieuw.
4. Open de kaart in Mapweaver en kies **Naar Campfire sturen** bij de exportacties.
5. Vul een naam, de Campfire-basis-URL en de token in. De URL bevat uitsluitend het serveradres, bijvoorbeeld `https://campfire.example`; geen `/api`-pad, query of inloggegevens.
6. Kies **Verbinding testen**. Dit haalt alleen contract-discovery op; het verstuurt geen kaart.

De token bepaalt de campagne en Group. Mapweaver vraagt geen campagne-ID. Externe verbindingen vereisen HTTPS. Voor lokale ontwikkeling is HTTP alleen toegestaan naar numerieke loopbackadressen (`127.0.0.1` of `[::1]`), niet naar een LAN-host of een hostname die mogelijk anders wordt opgelost. Redirects worden geweigerd.

## Versturen en beoordelen

Configureer eerst een fysieke kaart-/rasterschaal. Mapweaver slaat de actieve kaart lokaal op, kiest de nieuwste gezamenlijk ondersteunde contractversie, valideert de geometrie en rendert dezelfde bitmap als bij bestandsexport. Licht- en ceiling-overlays komen niet in de bitmap; hun ondersteunde semantiek blijft in het contract.

**Naar Campfire sturen** verstuurt precies twee bestanden: canonieke JSON en de primaire PNG. Het verstuurt geen ZIP, assetbibliotheek of bewerkbaar Mapweaver-project. De daadwerkelijke PNG-afmetingen/MIME en de geadverteerde byte-, afmeting-, pixel-, grid- en lichtlimieten worden gecontroleerd. Campfire controleert daarnaast zijn uiteindelijke genormaliseerde media en thumbnails.

Na ontvangst toont Mapweaver:

> Wacht op beoordeling. De kaart is nog niet geïmporteerd. Beoordeel en bevestig hem in Campfire → Maps.

De Campaign-DM moet de kaart daar interactief bekijken en bevestigen. Mapweaver heeft geen bevestigingsactie en kan geen browsercookies of extra scope gebruiken om dit over te slaan.

Gebruik daarna **Status controleren**:

| Status | Betekenis |
| --- | --- |
| READY_FOR_REVIEW | Ontvangen; beoordeling en bevestiging in Campfire zijn nog nodig. |
| CONFIRMED | Geïmporteerd. |
| EXPIRED | Opnieuw sturen met een nieuwe aanvraag. Een Campfire-herstart kan een pending plan laten verlopen. |
| CANCELLED | Geannuleerd; een nieuwe aanvraag is mogelijk. |

Er is geen automatische polling of publicatie. Als een netwerkfout optreedt na versturen, kan dezelfde inhoud opnieuw worden geprobeerd met dezelfde opgeslagen aanvraag-ID. Voor gewijzigde inhoud wordt automatisch een nieuwe key gebruikt. De optie **Nieuwe beoordelingsaanvraag** maakt bewust een vervangende aanvraag. Verlopen/geannuleerde plannen krijgen automatisch een nieuwe key.

## Revisions en fouten

De map-ID blijft gelijk voor dezelfde kaart. Een echte kopie krijgt een eigen ID. Een betekenisvolle opgeslagen wijziging gebruikt de bestaande revision-logica. Mapweaver verandert IDs nooit om een revisionconflict te omzeilen.

- **Ongeldige token / onvoldoende scope:** controleer de verbinding in Campfire. Revoke, gewijzigde rollen, auth-versie of Group kunnen toegang ongeldig maken. Mapweaver stopt verdere aanvragen totdat je opnieuw configureert.
- **Geen gezamenlijk ondersteunde versie / schema wijkt af:** werk de ondersteunde Mapweaver-contractintegratie bij; verander het Campfire-contract niet vanuit Mapweaver.
- **Niet ondersteunde ramen of sky exposure:** een oudere contractversie mag die semantiek niet stil verwijderen. Gebruik een Campfire-versie die de betreffende gegevens ondersteunt.
- **Pakket te groot / ongeldig:** controleer afmetingen, PNG-grootte, fysieke schaal, geometrie en aantallen/bereik van lights. Grenzen komen uit discovery.
- **Revisionconflict:** controleer de bestaande kaart en revision in Campfire; maak geen nieuwe map-ID voor dezelfde kaart.
- **Stale/expired plan:** stuur een nieuwe beoordelingsaanvraag en beoordeel die opnieuw.
- **Campfire niet bereikbaar / HTTPS vereist:** controleer adres, verbinding en reverse-proxyconfiguratie. Browser-CORS-aanpassingen zijn niet nodig.

## Tokenbeveiliging en verwijderen

De token staat uitsluitend tijdelijk in het geheugen van de lokale service. Na een serviceherstart moet je hem opnieuw invoeren. Hij wordt niet opgeslagen in de database, kaarten, projectarchieven, backups of logs. De browser houdt hem tijdens invoer kort in het passwordveld; na succesvolle configuratie wordt dat veld gewist. Dit beschermt niet tegen een gecompromitteerde computer, geheugeninspectie of kwaadaardige code in dezelfde lokale applicatie.

**Verbinding verwijderen** wist lokale verbinding/ontvangstmetadata en de actieve token. Dit trekt de credential niet automatisch in Campfire in. Doe dat zelf in Campfire Maps. Voer vervolgens desgewenst een nieuwe token in. Bewaar tokens nooit in repositorybestanden of screenshots.

Als API-publicatie niet beschikbaar is, blijft **Export Campfire Map** werken voor handmatige import. Beide routes gebruiken dezelfde contract- en bitmapsemantiek. Campfire-runtimegegevens zoals tokens, fog, combat en DM-notities worden nooit door deze publicatie overschreven.
