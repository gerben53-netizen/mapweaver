# Map effects and frames

Open **Map → Effects & map frame**. Choose Fog, Vignette and Frame settings, then **Apply map effects**. Apply is one undo step; unfinished form changes do not alter the saved map. All effects start off on existing and new maps.

Fog presets are Soft Mist, Dense Fog, Cold Mist and Arcane Haze. Scope can be Whole map or any existing Area, including its holes. Hide/delete that Area to hide its mist; restore it with undo. Missing Area references are shown in the scope selector. Mist detail controls density, softness, scale and tint. Fog covers artwork but stays below labels, places and cartographic elements. Enabling fog moves those annotations above ordinary artwork while preserving each group's relative order.

Vignette presets are Subtle Dark, Parchment Edge and Dramatic Dark. Amount sets strength; radius and softness adjust the transition. It always follows the current map shape and is optional.

Frame presets are Minimal, Classic, Parchment, Fantasy Ornate, Elven and Dark Ornamental. Show map frame toggles visibility without discarding settings. Inset and thickness use map pixels; opacity and tint are independent. The vector frame resizes with the map, including wide/tall maps. It is protected from canvas selection and movement; edit it in Map settings. Keep labels away from the outer edge: vignette and frame render above map artwork and text.

Select an editable stamp and expand **Properties → Stamp shadow & glow**. Enable a soft terrain shadow or arcane glow, adjust the settings, then **Apply stamp effects**. Shadow accepts offset, blur, opacity and color; glow accepts radius, opacity, softness and color. Effects follow stamp rotation/mirroring. Source assets remain unchanged. Shadows are not automatically applied to all assets. Native Scatter containers, Areas and map elements do not receive these stamp-only controls; ordinary stamps produced by the world generator do. River halo and text halo retain their own existing controls.

PNG export includes enabled effects/frame at 1× or 2× with the same map-relative size. Transparent export removes the base map color only; selected atmosphere and frame still paint transparent overlays. Editor handles never appear in PNG. Effects extending outside the map itself are intentionally cropped.

One global or Area-masked fog field is supported. Area mask boundaries are not feathered. Large effects use bounded cached silhouettes; extreme enlarged exports can reveal their finite raster resolution. No whole-map themes, animation, external resources or source-image modifications are involved.

## Battlemap premiumdefaults

Bestaande en nieuwe battlemaps tonen **ARL C (standaard)** in Voorbeeld en gebruiken dit profiel bij PNG- en Campfire-export. Bewerken houdt de native muurartwork en de goedkope Stamp Soft Shadow. De tijdelijke Voorbeeld-diagnose OFF/B/C wordt niet opgeslagen en verandert export niet.

In **Effects & map frame → Rendering** kies je een opgeslagen **Map ARL override** (standaard/OFF/B/C). Apply maakt één undo-stap. **Stamp Soft Shadow** volgt standaard de kaartmodus: aan op Battlemap, uit op Regional/World. Een expliciete kaartkeuze of individuele **Stamp Soft Shadow override** blijft behouden, ook bij dupliceren, variantwissel en reload. Kies Default om weer te erven. Environmental Detail en Generated Wall-componenten krijgen geen extra Stamp Soft Shadow.

Geen bulkkaartmigratie: defaults worden bij renderen opgelost. Save/autosave hoeft daarvoor geen hoogwaardige bitmap te maken. Zie ADR-0066 voor het optionele renderingveld in projectformaat 12.
