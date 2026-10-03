# World-scale stamp sizing investigation — 24 September 2026

## Outcome

The user confirmed the issue resolved during the investigation. No production sizing, renderer, UI, data or format changes were retained. In the inspected saved battlemap, the placed asset was the **Compacte boekenkast** (5 ft default, 50 logical px), not the **Grote gebogen boekenwand** (20 ft default). The former correctly occupies one 5 ft cell. The latter should occupy four cells, or 200 logical px on the supplied 50 px/cell map. No factor-of-two conversion defect was reproduced on the Library placement path.

Library management selection and the editor's active placement asset are separate. Selecting a library card inspects metadata; it does not replace the active stamp. Use **Map editor → Place asset → choose the intended stamp**. The browser regression deliberately starts with a different active stamp, inspects another in Library, then explicitly chooses it in the editor.

The library screenshot's 400 px preview alone cannot establish placed geometry: it reflects the map context active while viewing the library. The supplied screenshot did not include the complete fallback explanation. We did not infer a mathematical defect from it.

## Canonical units and pipeline

- `service/libraryPacks.ts` → `assetManifest.ts` / `library.ts`: validates imported defaultSize, source aspect ratio and applicable map types; persists the original sizing mode, dimensions, unit and lock flag in library columns. `publicAsset` exposes those as defaultSize, while `assetFromRow` normalizes the SQLite lock boolean.
- `remoteLibrary.toAsset` → `chooseAsset`: retrieves the selected ID's defaults. `adoptLibraryAsset` retains them on the asset passed to the placement tool. Image natural dimensions supply the aspect ratio, not world-to-pixel scale.
- `useStampPlacement` previews with `placementSize`; `projectStore.place` calls `createPlacedObject` with the current full map. `resolvePlacementSize` is the shared conversion. Positions snap separately.
- Objects persist full width/height in **logical map pixels**. Conversion: `worldWidth × metresPerAssetUnit / (distancePerCell × metresPerMapUnit) × cellSize`. One foot is exactly 0.3048 metres. With equal units this reduces to `worldWidth / distancePerCell × cellSize`.
- Locked height derives from source aspect ratio. Center offsets use half extents only for x/y positioning; width/height remain full extents. Missing/inapplicable physical scale produces the existing explicit native-size fallback.
- `EditableStamp` and `objectNodeProps` pass the stored width/height unchanged to Konva. `MapContent` attaches the selection Transformer to that node. `ObjectProperties` displays the same logical dimensions (rounded to two decimals), not a separate world size.
- `gatherProject` / `parseProject` preserve object geometry. Zoom changes the Stage transform only. DPR changes canvas backing resolution only. `export/render.ts` uses the same node transform and stored image dimensions; `renderScene` applies export scale through `toCanvas({pixelRatio: scale})`.

## Focused validation

- `npx vitest run src/domain/worldStampSizing.test.ts src/domain/placement.test.ts`: **22 passing tests**. Added coverage for 2.5/5/10/15/20 ft at 5 ft/cell, 10/20 ft at 10 ft/cell, 50/100/140 px cells, metre and cross-unit conversion, source aspect ratios, height-only and unlocked dimensions, bounds/center transforms and explicit native fallbacks.
- `node tests/persistence/world-stamp-sizing.mjs`: real ZIP metadata import into an isolated service, real asset chooser and pointer placement in Chrome, Properties and Konva image/selection geometry. 10 ft is 100 logical px and exactly two cells at 50%, 100%, 200% and 400% zoom, at DPR 1 and 2. 1×/2× PNG exports measure 100/200 red stamp pixels against 50/100 px cells. Save/reload preserves width. No screenshot-only acceptance assertions. Evidence is written under ignored `.qa.local/world-stamp-*`.
- `npx eslint src/domain/worldStampSizing.test.ts tests/persistence/world-stamp-sizing.mjs`: passes.
- `npm run build`: passes, including client and service TypeScript checks, production builds and bundled-font resource validation. No separate duplicate typecheck or full unrelated suite was run.

Test-harness iterations corrected the permitted development origin, accessible selectors and an asynchronous startup wait. They did not require production changes.

## Limits and preservation

An independent pre-existing limitation was reproduced for **Project assets**: project manifests omit library sizing defaults, so selecting an embedded image uses native sizing. This is not the user's confirmed Library route; after the user reported resolution, no format extension was introduced to address that separate issue. Existing placed geometry is unaffected by this limitation and by this investigation.

No saved objects were resized or migrated, and no user data was written. No Windows package or ZIP was rebuilt. No push, merge, release, upload or deployment occurred. The repository had no existing develop branch (unborn master, existing files untracked), so no branch change or commit was made.
