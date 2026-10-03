# Contextual Inspector

Select an object, then choose **Properties** on the right. The summary stays visible while scrolling and identifies the object, layer and meaningful world dimensions. A generated Floor uses its room layer name; an opening shows its actual width, not its technical selection box. Multiple selections show their count and shared controls. Nothing selected shows a short empty state.

## Primary controls

- **Floor / Area:** material mode, choose/replace pattern, pattern scale or solid color, opacity.
- **Wall:** reusable wall preset, thickness in the captured unit, wall material. Changing a preset chooses its default thickness; a subsequent thickness edit is an explicit override.
- **Stamp:** asset identity; proportional world width/height, position, rotation and flips in Transform.
- **Label:** text, local font picker, size, color and alignment.
- **Path:** stroke, physical stroke width and color. Road/Border have their specialized class/style and width; roads expose outline width. River has preset, mouth width, smoothing, color and outline toggle, with width setup and detailed appearance folded away.
- **Marker:** name, visual mode, type, style/icon and prominence. Illustrated mode retains the existing asset chooser. Size is summarized and the normal Transform section exposes world dimensions.
- **Door / Window:** opening width, position, type and door state. Attachment/unit details and opening commands are folded away.

World units are used when the map defines a physical scale. Maps without a defined physical scale retain their existing map-coordinate fields; the inspector does not invent a conversion. Native route/wall scale references remain explicit. Pixel dimensions, coordinates and object IDs are under **Advanced**.

## Editing

Numeric transforms commit with **Enter** or when leaving the field; **Escape** discards the pending field value. Single-object geometry uses uniform scaling and relative rotation, so the fields reset to 100% and 0° after an edit. Stamp dimensions preserve aspect ratio and center. Wall transform omits padded bounding-box width/height; use thickness or uniform scale instead. Undo/Redo uses the existing native history.

Pattern scale and river numeric styling retain their existing live preview/gesture history. Text content commits on leaving its textarea. Selects and colors update immediately.

**Apply** remains for marker plus linked-label drafts, opening drafts, multi-selection scale+rotation and the existing detailed appearance editors. These commit related fields as a validated atomic edit. Editing the independent Transform controls or changing selection can discard an un-applied detailed draft; apply it first when you want to keep it.

## Secondary sections and actions

**Geometry** contains node editing and polygon/path diagnostics; it opens automatically during active node editing so finishing/cancelling remains available. **Actions** contains Edit shape, Create boundary walls, Fill selected area with scatter, copy/duplicate/delete and relevant asset actions. **Layer and arrangement** contains the existing layer, order and alignment operations. Existing detailed style editors remain available under **Appearance details**, **Style details**, or **Text layout and links**.

Terrain/geographic controls are folded for Regional/World Areas and Areas carrying land metadata. Ordinary battlemap floors omit them. No stored metadata is removed.

Sections remember their expansion per object type for the current session. Closed editors are unmounted, not merely visually hidden. Different object types do not share expansion preferences.

## Width and keyboard

Drag the left edge of the inspector. Default width is 320 px; bounds are 280–520 px. Width is stored in this browser's local preferences, outside project data. Paired fields show labels above inputs when narrow and inline at wider widths. Widening reduces the remaining canvas width; the existing canvas toolbar wraps as necessary.

Focus the resize edge and use **Left/Right** (10 px), **Shift+Left/Right** (40 px), or **Home/End** (minimum/maximum). Tabs retain arrow-key navigation. Disclosure buttons use normal Tab, Space and Enter, expose their expansion state and have visible keyboard focus. The three modes are **Scene**, **Properties**, and **Map**. Scene consolidates Layers and Objects into one hierarchy; it remains open while selection changes. Properties reads the same selection.
