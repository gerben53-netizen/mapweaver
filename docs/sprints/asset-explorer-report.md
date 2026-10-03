# Asset Library explorer sidebar and Windows package

## Delivered

The sidebar now separates Library filters, Categories, Collections and Manage. Flat boxed navigation buttons are replaced by compact rows. Folder-like category icons, indentation, parent disclosure and collection icons distinguish the structures. One trailing total replaces cryptic direct/total pairs; full paths and direct/total detail remain in tooltips. Existing filtered count semantics, additive Favorites, search retention, breadcrumb, category moves, import/export, metadata and selection behavior are unchanged.

Header + controls expose root-category and collection creation. Existing subcategory, rename, move and removal controls remain in Manage categories; export and collection management are separate from navigation. Empty sections offer compact creation links. Long names truncate; counts do not shrink. Existing Campaign Explorer selection, hover and focus tokens are reused, including an independent focus outline and selected left indicator. Category drag-to-parent retains its original backend validation and gains a dashed drop highlight.

Visible navigation rows support Up/Down/Home/End; categories support Left/Right collapse/expand or parent/child focus and Enter/Space selection. Disclosure clicks do not select the row. Tab reaches creation and management controls. Tree level, expanded and selected states are announced. Keyboard handlers only act on navigation rows, not text inputs.

Files: `src/library/LibrarySidebar.tsx`, its CSS Module and tests; `LibraryWorkspace.tsx`; `docs/asset-library.md`; `docs/portable-windows.md`; `tests/persistence/asset-explorer-package.mjs`. No storage schema, renderer or filter algorithm changed. No develop branch exists in this unborn checkout; existing work was preserved.

## Validation

- Six focused tests passed across LibrarySidebar, LibraryWorkspace removal and LibraryDetails; navigation, tree controls, selected/expanded state, counts, management/creation and existing metadata/removal behavior covered.
- Scoped ESLint passed for the three changed/new TypeScript files.
- `npm run build` passed, including client/service TypeScript compilation and bundled-font integrity checks. An initial test typing error was corrected before the final build.
- `node scripts/package-windows.mjs Mapweaver-AssetExplorer-20260924-Final` succeeded.
- Native packaged smoke: **passed**. The test launches the actual `Mapweaver.exe --test --no-browser`, opens the production client in Chrome at 1280 × 720, imports a sample asset, creates test categories/collection, exercises hierarchy, global filters, search retention, collection creation/selection, category management, ZIP export and asset selection/details. Sidebar has no horizontal overflow. Graceful stop/restart restores the last map/campaign. All 4,579 original package checksums verified before launch.
- Test data resides only in `.asset-explorer.local/1790278330871/data`; normal user data, campaigns, maps, libraries and backups were not opened or modified.
- Evidence: [results](evidence/asset-explorer/results.json), [sidebar/details screenshot](evidence/asset-explorer/library-1280.png). Screenshot shows the sidebar scrolled to management after export; its top filters are above the scroll position.
- Full unrelated suite, installer compilation and interactive tray-menu testing were not run. Native launcher start/stop/restart and production browser workflows were exercised automatically; screenshot was visually inspected.

## New package

Package: `C:\Users\gerbe\Documents\ChatGPT\Mapweaver\distribution.local\Mapweaver-AssetExplorer-20260924-Final`

Executable: `C:\Users\gerbe\Documents\ChatGPT\Mapweaver\distribution.local\Mapweaver-AssetExplorer-20260924-Final\Mapweaver.exe`

The final build includes all current features, runtime and font resources. An earlier intermediate package was based on the preceding production build; only the `-Final` package is the intended deliverable.

## Cleanup — awaiting direct approval

**Zero old package directories removed.** Automatic approval review rejected the deletion twice: it did not accept the explicit cleanup request in the attached prompt as authorization. The exact attached cleanup instructions and passed smoke result were re-read before retrying; the review still demanded direct user approval. No workaround was attempted. A direct confirmation question has been sent.

Retained pending approval:

- `C:\Users\gerbe\Documents\ChatGPT\Mapweaver\distribution.local\Mapweaver-SmartMarkers-20260924-Final`
- `C:\Users\gerbe\Documents\ChatGPT\Mapweaver\distribution.local\Mapweaver-AssetExplorer-20260924`

Their matching checksum lists remain too. Both targets were verified as direct children of the package root, containing Mapweaver.exe, without reparse points or running processes from those folders. The intended new package is excluded. Cleanup is therefore the only outstanding acceptance item; it is not yet true that only the new package remains.

No pushes, releases, uploads, deployments or cloud changes were performed.
