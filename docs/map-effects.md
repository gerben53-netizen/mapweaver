# Map effects and frames

Open **Map → Effects & map frame**. Choose Fog, Vignette and Frame settings, then **Apply map effects**. Apply is one undo step; unfinished form changes do not alter the saved map. Fog, vignette, frame and custom directional shadow/glow start off. Battlemap Soft Shadow is inherited and rendered automatically.

Fog presets are Soft Mist, Dense Fog, Cold Mist and Arcane Haze. Scope can be Whole map or any existing Area, including its holes. Hide/delete that Area to hide its mist; restore it with undo. Missing Area references are shown in the scope selector. Mist detail controls density, softness, scale and tint. Fog covers artwork but stays below labels, places and cartographic elements. Enabling fog moves those annotations above ordinary artwork while preserving each group's relative order.

Vignette presets are Subtle Dark, Parchment Edge and Dramatic Dark. Amount sets strength; radius and softness adjust the transition. It always follows the current map shape and is optional.

Frame presets are Minimal, Classic, Parchment, Fantasy Ornate, Elven and Dark Ornamental. Show map frame toggles visibility without discarding settings. Inset and thickness use map pixels; opacity and tint are independent. The vector frame resizes with the map, including wide/tall maps. It is protected from canvas selection and movement; edit it in Map settings. Keep labels away from the outer edge: vignette and frame render above map artwork and text.

Select an editable stamp and expand **Properties → Stamp shadow & glow**. Enable a custom directional shadow or arcane glow, adjust the settings, then **Apply stamp effects**. Shadow accepts offset, blur, opacity and color; glow accepts radius, opacity, softness and color. Effects follow stamp rotation/mirroring. Source assets remain unchanged. Applicable Battlemap stamps render Soft Shadow automatically, including existing stamps after reload. The Soft Shadow checkbox shows the rendered effective state. Its checkbox and Default/On/Off selector apply immediately in one undo step; Apply stamp effects is only needed for custom directional shadow/glow. An explicit Soft Shadow Off remains off. Native Scatter containers, Areas and map elements do not receive these stamp-only controls; ordinary stamps produced by the world generator do. River halo and text halo retain their own existing controls.

PNG export includes enabled effects/frame at 1× or 2× with the same map-relative size. Transparent export removes the base map color only; selected atmosphere and frame still paint transparent overlays. Editor handles never appear in PNG. Effects extending outside the map itself are intentionally cropped.

One global or Area-masked fog field is supported. Area mask boundaries are not feathered. Large effects use bounded cached silhouettes; extreme enlarged exports can reveal their finite raster resolution. No whole-map themes, animation, external resources or source-image modifications are involved.

## Battlemap premiumdefaults

Bestaande en nieuwe battlemaps tonen **ARL C (standaard)** in Voorbeeld en gebruiken dit profiel bij PNG- en Campfire-export. Bewerken houdt de native muurartwork en de goedkope Stamp Soft Shadow. De tijdelijke Voorbeeld-diagnose OFF/B/C wordt niet opgeslagen en verandert export niet.

In **Effects & map frame → Rendering** kies je een opgeslagen **Map ARL override** (standaard/OFF/B/C). Apply maakt één undo-stap. **Stamp Soft Shadow** volgt standaard de kaartmodus: aan op Battlemap, uit op Regional/World. Een expliciete kaartkeuze of individuele **Stamp Soft Shadow override** blijft behouden, ook bij dupliceren, variantwissel en reload. Kies Default om weer te erven. Environmental Detail en Generated Wall-componenten krijgen geen extra Stamp Soft Shadow.

Geen bulkkaartmigratie: defaults worden bij renderen opgelost. Save/autosave hoeft daarvoor geen hoogwaardige bitmap te maken. Zie ADR-0066 voor het optionele renderingveld in projectformaat 12.

## Architectural Shadows op kaartniveau

Onder **Map → Battlemap Rendering → Architectural Shadows** staan de effectieve instellingen. **Contact Shadow ingeschakeld**, **Donkere kern**, **Zachte uitloop** en **Schaduwsterkte** werken direct, zonder Apply. Iedere wijziging is via undo/redo herstelbaar. **Herstel standaard** verwijdert de override.

De standaard voor nieuwe en bestaande battlemaps zonder opgeslagen override is aan, kern **3 px**, extra uitloop **7 px**, sterkte **55%**. Bereiken: kern 0–8 px, uitloop 0–20 px en sterkte 0–80%. Expliciet uit en nul blijven uit/nul na bewaren en herladen. De kern heeft constante maximale sterkte; de uitloop neemt soepel af tot nul. Kies een smalle kern/uitloop voor subtiel contrast, een grotere kern voor sterker architecturaal contrast. Meer sterkte verandert de breedte niet.

Pixels zijn canonieke kaartpixels op 1× export; bij de gebruikelijke 10 px/ft is een kern van 3 px 0,3 ft. 2× verdubbelt de uitvoerpixels, niet de fysieke breedte. Zoomen verandert de effectbreedte op de kaart niet.

De contactschaduw volgt de **samengestelde zichtbare muurfootprint**, inclusief organische alpha-randen. Een vloerpolygon of Material Brush is niet nodig: schaduw verschijnt aan beide zichtbare zijden, ook op een lege achtergrond. Overlap en T-aansluitingen hebben geen interne schaduwnaad; deuren onderbreken uitsluitend de eigen muur. De uitloop blijft begrensd rond echte uiteinden. Dit is een niet-directioneel leesbaarheidseffect en geen dynamische verlichting.

ARL OFF verbergt de ARL-effecten. B toont de ingestelde contactschaduw; C voegt de materiaalgebonden Structural Separation Edge en interne Wall Mass Reinforcement toe. Contact Shadow uit schakelt uitsluitend contact uit, niet de overige C-componenten. Ongeschikte/ongeregistreerde muurmaterialen behouden hun native weergave.

Bewerken blijft snel en toont geen dure ARL-herberekening. Voorbeeld herberekent na een kaartwijziging; PNG en de Campfire-bitmap gebruiken dezelfde actuele renderer. Opslaan/autosave bewaart de instellingen, niet een verplichte render. De render wijzigt geen muurgeometrie, brushpixels, deuren, LOS of Campfire-contract.
