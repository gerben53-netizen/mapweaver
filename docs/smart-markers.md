# Smart map markers

Choose **Map Elements → Marker** or the **Place marker** shortcut. Configure the name, location type, style, icon, prominence and optional label, then choose **Place on map** and click the canvas. Escape cancels. A marker is ordinary editable map content, with layers, selection, undo, duplication and PNG export.

The picker provides Capital, City, Town, Village, Fortress/Castle, Ruin, Temple/Shrine, Harbor/Port, Cave, Dungeon, Tower, Camp, Landmark, Gate/Pass, Mine, Bridge, Custom and compact battlemap types (Point of interest, Objective, Entrance, Exit and Trap/Warning). Appropriate choices are prioritized for the active map type. Five styles are available: Minimal, Cartographic, Ornate Fantasy, Parchment/Explorer and Technical. Icons are built in; importing stamps is unnecessary.

Regional and world settlements normally include a label; battlemap points default to no label. Minor, Normal, Major and Primary control visual prominence without exposing raw importance. Each new map type gets appropriate initial defaults. Reopening the wizard on the same map type remembers the last choices. Duplicate an existing marker for quick repeated work.

Select a marker to edit its name, type, style, icon, prominence, label or appearance. **Change marker icon…** displays compatible artwork. A compatible icon survives type changes; otherwise the first compatible icon is chosen. Changing style explicitly resets its main/outline colors; changing icon keeps custom colors. Properties uses the existing **Apply properties** workflow.

A linked label moves with its marker. **Follow marker name** updates text on renaming. Disable it to enter custom text, or edit the label independently; direct text editing disables automatic name following. Select a label for font, halo, offset and other existing text controls. Show label creates/removes the first linked label in one reversible edit. Deleting a marker uses the existing dependent-object confirmation and undo.

**Advanced** retains exact X/Y, map-pixel or captured world-scale size, width and anchor. Changing map geography does not resize existing artwork. **Metadata** contains notes and tags. Legacy markers keep their exact appearance, dimensions, importance and asset symbol. Their custom asset picker remains under Advanced. **Use built-in marker…** is an explicit conversion, never an automatic migration.

PNG export uses the same icon and label painter and includes no selection frame or UI. Built-in markers need no asset records. Name + subtitle can be entered as a manually overridden multiline label; there is no separate subtitle field or automatic label-collision avoidance.

## Illustrated mode

Choose **Visual style → Illustrated** in the wizard or a Smart Marker's Properties. Pick a transparent city, village, fortress, harbor, ruin, tower, temple or landmark. The local painterly family has 31 illustrations; external asset packs can participate via [semantic tags](asset-authoring/illustrated-markers.md). The preview grid filters by marker type and map type, with theme/style-family filters and a manual override. A selected bundled image becomes a normal local library/project resource; it is portable with the map and reused by repeated placements.

New illustrated size uses 2.5% of the physical map width, type hierarchy and prominence. Capital > City > Town > Village by default. This exaggeration keeps atlas symbols readable and is not a real settlement footprint. **Illustrated width (km)** adjusts the current size with locked image aspect. Prominence also adjusts the linked label. Size mode and captured reference remain available in Advanced. Existing markers keep their exact geometry and appearance until explicitly edited.

The illustrated object remains the same semantic Place, with name, note, tags, importance, selection and layer behavior. No hidden Stamp is created. Linked labels and Automatic Labeling keep existing semantics and do not duplicate names. Return to **Symbol** explicitly to use its retained vector icon. Apply/undo treats the marker and linked name as one change. Choosing an image then cancelling leaves the map unchanged; the image may remain available in the local Library.
