# Battlemap Room Generator v1.1

Open a Battlemap and choose **Map → Generate Room…**. World and Regional maps do not offer this action.

Enter an optional room name, choose Rectangle, Square, Circle or Oval, then set the dimensions. Dimensions use the map's game scale (feet or metres); without a physical scale they use grid cells. They measure **usable interior space**. Walls grow outward from this boundary, including curved rooms. Square and Circle use one size/diameter. A 30 × 30 ft room with 2 ft walls has a 34 × 34 ft outer footprint and exactly 6 × 6 usable cells on a 5-ft grid. Changing thickness does not resize the floor or its pattern.

Interior dimensions must span 16–8192 map pixels; interior plus twice the wall thickness must fit the map's dimensions. Thickness must convert to 0.5–512 map pixels (for example 0.05–51.2 ft at 50 px per 5-ft cell). Door clearance and existing document, geometry, material and export-preview limits may impose tighter bounds. Nonfinite, zero and negative values are rejected. Existing centered walls retain their earlier limits and appearance.

Choose a solid floor color or an existing Project/Library fill pattern. **Find library floors** supports search and pagination. Pattern scale uses the normal native-image repeat scale, initially 1; it is not a new physical-size model. Walls offer the presets below, the current editor wall style and already imported wall sets. Selecting a preset resets thickness to its default; **Wall thickness** accepts an override in the displayed map units. Imported sets use their stored default thickness converted to these units. Import additional assets/materials through the existing Library/Wall workflows first.

| Wall preset | Default | Automatic join |
| --- | --- | --- |
| Simple Timber | 1 ft | Miter |
| Polished Wood | 1 ft | Miter |
| Living Wood | 2 ft | Round |
| Rough Heartwood | 3 ft | Bevel |
| Root Wall | 3 ft | Round |
| Stone | 3 ft | Miter |
| Rough Stone / Cave Rock | 5 ft | Bevel |

Defaults convert to metres on metric maps; without physical scale, one foot of preset thickness means 0.2 grid cells. These are reusable solid-color native styles, not new illustrated material assets. The same presets are available in native Wall Properties. Select the generated Walls object, open **Properties**, change **Wall → Thickness**, then press Enter or leave the field. This changes only the wall and derived opening depth/position; floor and opening width remain unchanged. Undo/Redo restores the edit. An outline on an outward wall stays inside its physical band.

Choose 0–4 doors, their physical/grid width, and Single, Double or Passage. The seed fixes placement and wall-set variation. **Randomize** and **Regenerate** change the seed and temporary preview; neither modifies the project. Invalid geometry or insufficient door clearance disables Create Room with an explanation. Cancel/Escape leaves the document unchanged.

**Create Room** places the room at the current viewport center, without grid snapping or collision avoidance. Pan before opening the wizard to choose a different position. As with manually placed objects, portions outside the map bounds are clipped in PNG export; no automatic repositioning or resizing takes place.

Every room creates exactly one ordinary visible, unlocked root layer, makes it active and ends layer Solo mode. The requested name becomes the layer name; blank names choose the first unused Room N. The layer contains a native Area floor, one closed native Wall path and its native Opening doors, ordered floor → wall → doors. Existing active layers receive nothing. Use normal Properties, path editing and Layers controls to edit, hide, lock, rename, reorder or remove components. The floor and wall remain independently editable; they are not live linked.

One immediate Undo removes the entire newly created room and layer. Redo restores its exact geometry, materials, IDs and assignments. Normal save/reopen and PNG export use native objects and the shared renderer. New walls persist optional `wall.alignment: "outside"`; absent alignment keeps old centered behavior, so existing v1 rooms are not resized or reinterpreted. See [ADR 0046](adr/0046-outward-room-walls.md).

No furnishing, decorations, scatter, wear, encounters, puzzles, clues, secret doors, corridors, room connections, multi-room/dungeon generation or AI are included. There is no Edit generated room/regeneration workflow after creation.
