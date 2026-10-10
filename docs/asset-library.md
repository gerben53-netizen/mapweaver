# Asset library — user and technical guide

## Maptype en categorieën

De permanente **Maptype**-filter boven de resultaten biedt **Alle**, **Battlemap**, **Regional map** en **World map**. Mapweaver heeft geen afzonderlijk City map-domeintype; gebruik de ondersteunde kaartmodus. De filter blijft staan wanneer je door de resultaten scrolt, zoekt of een categorie/familie selecteert. De linker categorieboom is de primaire navigatie, met de huidige locatie als breadcrumb boven de lijst. Als je de boom verbergt, worden subcategorieën boven de resultaten beschikbaar.

Een nieuw geopende kaartcontext kiest automatisch het kaarttype. Binnen diezelfde context blijft je expliciete filterkeuze staan, ook bij wisselen van tab of heropenen van de bibliotheek. Zonder kaartcontext gebruikt de bibliotheek je laatst expliciet gekozen filter, of **Alle**. Die voorkeur staat alleen in lokale UI-opslag; een kaartcontext overschrijft de beginweergave maar verandert de voorkeur niet. Wanneer lokale browseropslag geblokkeerd is, blijft de keuze tijdens de sessie beschikbaar.

Maptype, categorie inclusief subcategorieën, zoeken/tags, favorieten en assetrol werken samen met AND-semantiek. Categorieaantallen volgen de actieve filters. Een asset met meerdere kaarttypen verschijnt eenmaal in iedere passende weergave. Ontbrekende/lege toepassingsmetadata betekent **alle kaarttypen**, zodat historische generieke assets zichtbaar blijven. **Alle** is geen assettype en wijzigt geen metadata. Een stampfamilie blijft één item met haar bestaande varianten en revisions.

Filterwissels wissen de bulkselectie en melden dit. Een nog onderweg zijnde oude Select all-respons kan verborgen assets niet opnieuw selecteren. Sorteren wijzigt de scope eveneens; Grid/List/Compact verandert alleen de presentatie. **Clear filters** herstelt Alle en wist zoeken, categorie en favorieten.

**Collections zijn niet meer beschikbaar als organisatiemethode in de Asset Library**, ook niet in bulkacties, de docked browser of de importbestemming. Gebruik categorieën, tags en favorieten. Historische collectiegegevens en packmetadata blijven niet-destructief behouden voor import/export en library-undo. Er is geen databasemigratie, geen verwijdering van assets en geen wijziging van bestaande kaartverwijzingen. Canonieke taxonomie, expliciete mapping van onbekende importcategorieën en identity/revisionchecks blijven gelden.

Open **Asset library**. Stamps and Fill patterns have separate tabs and a shared category tree. Projects remains global; project Save and Export PNG appear in the Map editor. Library metadata saves itself; its undo/redo never changes editor history.

## Find and organize

A category always includes every descendant, even while collapsed. All assets searches the entire active type. Search matches title, original filename, description and tags using case-insensitive NFKC-normalized text. Sorting uses the same normalized title and stable ID ties. Category changes retain search text. Direct / total counts use the current type, maptype, search and favorite filters. Clear filters explains and removes an empty search scope.

Manage categories in the left panel: create root, select a parent and create a subcategory, rename, drag a category onto its new parent, or use **Move category** with the keyboard. The Move dialog also offers Root. Eight levels are supported. Deleting a category previews its direct assets/children and destination: they move to its parent, or root/Uncategorized. Sibling-name conflicts block the whole operation. No image files are deleted by tree operations.

Use checkboxes, Ctrl/Cmd-click and Shift-click for selection. Shift selects the contiguous range on the displayed page. **Select all results** explicitly selects the full matching set across pages and shows its count. Changing the scope clears selection with feedback. Actions include move, add/remove tags, favorite/unfavorite, also use in the other role, View usage, ZIP/JSON export and retained removal. Tags are merged/removed individually. Mixed selection does not replace unedited fields.

**Also use as fill pattern/stamp** creates a separate logical role sharing the original bytes. It does not change the other role's metadata. View usage includes saved projects, material registrations and prefab definitions, plus separately identified active editor/clipboard/history references. **Remove assets…** preflights the entire selection and shows named persistent blockers. Assets used on saved maps (including trashed maps), the current unsaved map, wall sets or retained prefab definitions remain protected: Mapweaver does not introduce missing-asset placeholders through deletion. No selected asset is removed when any persistent dependency blocks the batch.

Clipboard, undo/redo, tool choices and previews do not block explicit removal. Confirming removal clears dependent clipboard assemblies/labels and prunes their groups; unrelated clipboard objects remain available. Editor history stores full map snapshots, so the current editor’s whole undo/redo stack is cleared **only if it references a removed asset**. Skipping individual snapshots could restore an inconsistent map. Unrelated history survives and the saved/dirty baseline is preserved. Affected tool choices, previews and recent scatter sets are reset. This cleanup occurs only after the service commits; a failed request leaves these editor buffers intact. Library Undo/Redo actions that remove assets use the same transient cleanup and persistent protection.

Removal clears category/collection memberships, favorite, tags and other asset metadata while preserving category and collection definitions. Immutable files and a tombstoned identity remain for recovery. **Library Undo** explicitly restores the removal while its entry is retained (ten recent commands in the running service); it does not restore discarded editor history/clipboard. Full backups remain the durable recovery route.

Re-import treats a deleted image as fresh metadata while intentionally reusing its type/hash identity and immutable bytes. Removed records are excluded from preview duplicate warnings; active assets retain the existing Keep/Fill/Overwrite policies. Matching collection names (normalized) **and descriptions** reuse the existing collection, adding memberships once. Category mapping still requires the existing explicit import choices. Re-importing does not change the pack or project schema.

Grid, List and Compact retain the selected IDs. Both side panels can be collapsed. At narrow widths the details pane overlays the right side and can be hidden. Full titles are available via the native accessible title and the detail input.

## Edit metadata and defaults

Title, description, tags and provenance save on blur or Enter. Description supports multiline text. Saving/Saved/errors appear with the field. Invalid input stays available; Escape restores the value before editing. Retry after fixing input; after a revision conflict refresh, inspect the other change, and explicitly discard/re-enter the draft. Navigating away from unsaved input requires an explicit discard decision. Lifecycle Stop attempts valid pending metadata writes and refuses to discard invalid/conflicting drafts.

Original filename is immutable provenance, separate from title. An omitted imported title strips only the last extension and replaces underscores with spaces; numeric prefixes remain. Ambiguous existing titles are warned about. No metadata is rendered as HTML and source URLs are never fetched.

Stamp default modes:

- Native: natural pixels, limited to one quarter of map width/height, without upscaling.
- Grid: width/height in cells multiplied by battlemap Cell size. Example: 2 × 1 at 50 px/cell becomes 100 × 50 map pixels.
- World: feet/metres. A battlemap needs explicit **Map → Canvas settings → Physical distance per cell**. Example: 10 ft at 5 ft/cell and 50 px/cell becomes 100 px. Regional/World maps use the geographic width service. 10 ft equals 3.048 m.

Aspect lock derives the missing dimension from the source aspect ratio. If a manifest supplies both locked dimensions, they must agree to 0.1%. Each dimension is finite, greater than zero and at most 1,000,000; resolved geometry is also bounded by the existing map-coordinate limit. Choose applicable map types, or no selection for any. The details panel previews size on the current map and explains native fallback for incompatible/missing scales.

Use current selection size accepts exactly one instance of this stamp. It captures local dimensions, including already-applied group scaling, without using the rotated bounding box. Regional/World selection is captured in metres; battlemap selection in cells. The editor also offers **Save this size as the asset default** and **Reset selection to asset default size**. Reset preserves centre/rotation/mirror, reports skipped objects and is one undo. Library changes never resize existing stamps, scatter instances, patterns or walls.

## Import and transfer

Choose **Import assets** and an optional destination. Select PNG/JPEG/WebP files with sidecars or `mapweaver-assets.json`, or one ZIP. Images without a manifest use native sizing. Nested image paths belong in a ZIP; loose browser-selected files are addressed by their exact chosen filenames.

1. Validate the files; inspect all entries, paths, warnings and errors.
2. Explicitly allow missing category creation and/or mapping matching existing category paths. Manifest paths are root-relative. An optional visible root prefix creates a separate namespace without hidden nesting.
3. Choose Keep existing, Fill only missing fields, or Overwrite present fields. Conflicting sidecar/collection metadata requires an explicit source choice and a fresh preview.
4. **Review resolved changes** shows the actual resulting metadata and categories without saving files or rows. Resolve errors before proceeding.
5. **Confirm import** commits the entire reviewed batch. One error blocks the batch. Other-tab changes require a new preview.

Missing fields never clear existing data. Overwrite applies explicit empty descriptions/tags/provenance or an empty categoryPath; Fill only supplies fields that are currently absent (including native size or Uncategorized). Keep retains the existing item while preserving historical pack memberships. Asset IDs and project references survive all policies. A matching item in a different role does not silently donate its title/category.

A sidecar is `basename.mapweaver.json`, using the same envelope and exactly one asset entry. Collection manifests and ZIPs use `mapweaver-assets.json` at the root. Entries match exact relative paths, never an ambiguous basename or hash. SHA-256, when provided, must match bytes. ZIPs reject traversal, absolute/drive paths, Windows-normalized collisions, device names, symlinks, encrypted/unsupported entries and expansion bombs. Image headers and decoded content must agree.

Downloadable files: `public/asset-templates/mapweaver-assets.schema.json`, the sidecar plus its PNG, collection template and complete `eryndor-example.zip`. The simple original desk image is CC0. Generate and structurally validate them with `node scripts/asset-templates.mjs`; service tests additionally use the runtime parser and actual image decoder.

ZIP export includes the public manifest and one copy of each shared blob. Selection export includes metadata and the category tree; **Export category / collection ZIP** includes both supported roles and preserves empty categories. Metadata-only JSON explicitly excludes images. Keep original specialized wall-set ZIPs for wall-set transfer; registered atlases cannot be exported as loose images by this command. Full backups preserve the complete library and projects, including wall-set registrations.

## Version 1 contract and limits

Required envelope: `schemaVersion: 1`, `assets: []`. An optional `collection: {title, description}` groups all entries. Each asset requires `file` and `type: stamp | fillPattern`. Optional fields: title, originalName, description, categoryPath (array), tags, defaultSize, applicableMapTypes, sha256, author, source, license and favorite.

Extensions: `categories: [{path: string[], sortOrder: nonnegative integer}]` preserves empty categories/order; `collections: [{title,description,members:[{file,type}]}]` preserves membership. Multi-role entries share a file but have distinct types. OriginalName preserves the source filename when exported bytes have hash-based paths. Categories map by explicitly approved normalized paths, never by an external UUID. Unknown version-1 fields are ignored with warnings; unsupported schema versions and asset types are refused. External IDs do not authorize local overwrites.

For legacy optional title/description/categoryPath/tags/defaultSize/applicableMapTypes/author/source/license, null is normalized to absence. Required fields, booleans, SHA and individual dimensions do not accept null. Export omits absent values. Empty text/tags are explicit values; empty categoryPath means Uncategorized. Unknown properties are not stored. Structural JSON Schema is supplemented by runtime semantic checks requiring source pixels, archive paths, category ancestry and collection references.

Limits: title 120, category/tag 80, description 4,000, author 240, source/license 1,000 and original filename 255 characters; 30 normalized tags; 8 category levels; 1,000 asset entries, 2,000 category definitions and 200 collections per pack; 128 MiB aggregate expanded/import/export bytes, 20 MiB per image, 2,002 ZIP entries, 200× expansion ratio. Existing image pixel/dimension limits also apply. A pack may contain at most 1,000 assets; export larger libraries in subsets or use full backup. Metadata text is plain text only.

Previews are bounded to one per service and expire after 15 minutes. A second preview replaces the first. Preview cancellation writes no assets. Commit uses atomic file writes, one SQLite transaction and a durable owned-path cleanup journal. Service startup recovers interrupted imports conservatively. Search results arrive in 60-item pages; thumbnails load near the viewport and use the existing bounded cache. No original images are loaded simply to list a category.

Implementation and architectural reasoning: [ADR 0018](adr/0018-advanced-asset-library.md). Measurements and exact validation coverage: [Sprint 23 report](sprints/sprint-23-advanced-asset-library-report.md). Prefabs are implemented; see [reusable compositions](prefabs.md). The [asset authoring kit](asset-authoring/README.md) documents the complete current schema 1/2/3 contract, templates and runtime validator.

Full backups deliberately retain legacy reserved sizing fields verbatim, including old conflicting width/height values that predate the editor. New/edited profiles and public pack imports use the stricter aspect/range rules. Inspect and explicitly correct such a legacy profile before transferring it as a new public asset pack; existing project pixels and backup recovery do not depend on that correction.


## Editor map applicability

The ordinary editor stamp/fill-pattern picker now defaults to the active map type. Universal assets (empty applicability) remain included; an explicit incompatible type is omitted. Show assets for all map types deliberately removes this filter. The service `/api/v1/library` query accepts optional `mapType` (`battlemap`, `regional-map`, `world-map`), applied before counts and pagination. Omitting it retains existing global-library behavior. This filter neither mutates assets nor affects existing objects. Specialized wall/scatter/prefab browsers remain unchanged.

## Asset explorer sidebar

Categories, Collections and Favorites remain distinct. The sidebar starts with collapsed category branches. Selecting a category or opening its disclosure focuses that branch: its ancestors and immediate children are available, while unrelated branches close. Collapse all changes presentation only; Expand current path reveals the selected location again. Neither action clears asset selection. Normal category navigation retains asset search and the additive Favorites filter, clears collection scope and clears asset selection with existing feedback.

The main pane shows the location name, filtered asset count and a clickable full-path breadcrumb. Every segment and Up navigates to its category; long paths scroll horizontally and expose their full text in tooltips. Compact immediate-child chips show descendant-inclusive filtered counts. Their area is height-bounded, keeping thumbnails visible. The six most recently visited categories are available through Recent locations with full-path names.

Search library still searches asset title, filename, description and tags on the service. In addition, a bounded-height Categories result section matches normalized category paths across the full taxonomy, independent of current category/collection. Duplicate names show their parent paths. Choosing a category search result or recent location clears search, Favorites and collection filters, selects that location, opens only its path, scrolls it into view and gives its tree row keyboard focus (or breadcrumb when the sidebar is hidden).

Navigation counts include descendants and follow active type/search/Favorites/collection filters. Show empty categories is off by default and uses a separate **unfiltered, all-asset-type** descendant count. A category containing only fill patterns is not truly empty while browsing stamps. Zero matching assets is not the same as an empty category. The selected path remains visible even if it becomes empty. Showing empty categories makes them available for management with muted text; nothing is deleted or merged.

Category indentation is 9 px per level, capped after three steps. Full names wrap rather than collapsing into fragments. Full paths and direct/total counts remain available in row tooltips. The sidebar keeps its existing width. Up/Down/Home/End move between visible navigation rows; Right opens a branch or focuses its first child, Left collapses or focuses its parent, Enter/Space selects. Breadcrumbs and child chips are native keyboard-accessible buttons. Existing drag-to-parent, Move category, creation, rename, deletion, import and export remain available.

Location, search, Favorites/collection scope, branch state, empty visibility and recent categories are session-only UI state: retained across workspace switches/remounts, reset on full page reload. They are not asset metadata or map content. No persistent taxonomy or database schema migration is introduced. See the [navigation sprint report](sprints/library-navigation.md) for evidence and the empty-root audit.

## Pattern scale and current world dimensions

Select a patterned Area and adjust **Properties → Pattern scale**. Repeat scale updates live: `0.5` makes each tile half as large and repeats twice as often in each direction; `1` retains native size. The supported range is `0.01–100`. Enter or leaving the field commits one undo step; Escape cancels. Invalid values never reach the canvas. Stretch fits the retained frame and disables repeat scale. Other appearance fields retain their Apply action.

Object Properties shows current world dimensions prominently when a physical map scale exists, with logical pixels below. Pixel Width/Height remain editable; world dimensions are read-only and follow geometry and current map units. For example, 200 px at 50 px/cell and 5 ft/cell is 20 ft. Zoom and export resolution do not change that value. Without a physical scale, only pixels appear. **Asset settings → Asset default** shows available library defaults separately from current object size.


## Generator-ready world stamps

Stamp details now include an optional **Generator metadata** section with explicit Save/Discard, validated semantic type, roles, biomes, themes, weight, scale variation, rotation and spacing. Normal stamps remain unchanged. Default placement size and applicable map types continue to use their existing fields. Bulk semantic editing is deferred.

Packs with generator metadata use manifest schema 3; schema 1/2 packs remain accepted. ZIP import, duplicate handling, export/re-import and library history preserve the optional metadata. The service database upgrades to version 8 with a pre-migration backup; the map document format is unchanged. Import the [24-stamp starter pack](../public/world-assets/mapweaver-world-engraved.zip) normally, or download it from the import dialog. Full vocabulary, examples and deterministic query fallback are in the [generator asset guide](generator-assets.md).
