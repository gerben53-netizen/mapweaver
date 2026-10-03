# Asset Library Navigation & Category UX — 26 September 2026

## Goal and acceptance criteria

Keep deep categories readable without an expanded taxonomy dominating the library. Provide clickable full-path context, immediate-child browsing, category search/jump, branch focus, collapse/reveal, truthful descendant counts, reversible empty-category visibility and keyboard access. Preserve category identities, membership, asset search, Favorites, Collections, drafts and management operations. Validate targeted tests, TypeScript, scoped lint, production build and a realistic isolated browser fixture at 1280 × 720.

## Delivered navigation

One combined design: a focused tree, a full breadcrumb and compact child chips above asset results. Selecting or expanding a branch closes unrelated branches. Collapse all and Expand current path change presentation without changing the selected category or selected assets. Indentation is capped at 35 px total (8 px base + three 9 px steps); names wrap. Existing sidebar width is unchanged.

The main header gives location and filtered asset count. Breadcrumb segments and Up navigate through parents. The full path is available as text and tooltip; long paths scroll horizontally. Immediate-child chips have descendant-inclusive filtered counts and a bounded-height container. Six recent locations use full paths in a dropdown. There is no extra navigation mode, resizer or generic history stack; Up and breadcrumbs provide hierarchy navigation without adding competing controls.

Asset search retains its established matching and server pagination. Category search additionally matches NFKC-normalized full paths and shows duplicate names with parent context, independent of current location. A search/recent jump clears text, Favorites and collection scope to reveal the category's actual contents, opens only its path and focuses the revealed tree row (or breadcrumb with a hidden sidebar). Ordinary category clicks preserve text/Favorites filtering as before. Favorites stays additive; Collections stays a separate curated grouping.

Up/Down/Home/End move through visible navigation rows. Right expands or enters a branch; Left collapses or focuses the parent; Enter/Space selects. Breadcrumbs and chips are native buttons. Disclosure and empty-category controls do not clear asset selection; changing scope still does, with existing feedback and draft protection.

Navigation state persists through workspace switches and component remounts within this browser session. Full page reload resets it. No identifiers are persisted into a different service/library or into map content. Existing grid/list/compact selection behavior remains unchanged.

## Counts and empty-root audit

Existing `direct` and `total` are still filtered counts; `total` includes descendants. The response adds derived `libraryTotal`, aggregated across all live assets and all roles, independent of query/Favorites/Collections. Only a genuinely empty subtree is hidden by default. A zero-match category with content in another role is not hidden. Show empty categories exposes empty rows in muted text. The selected ancestry remains visible even after it becomes empty.

The service performs one grouped SQL count and propagates it through its already indexed ancestry. The client memoizes a category ID/children/path index per response, reused for navigation and search; the tree no longer scans the whole category array for each nested child. Existing 60-asset pages and lazy thumbnails remain intact.

Code audit: category rows contain identity, name, parent, ordering and timestamps, but **no category-origin field**. Fresh storage seeds only Uncategorized. Schema-5 migration retained earlier flat categories as roots. Pack import creates explicitly approved paths (including explicit empty definitions and optional prefixes); users can also create roots directly. Removing assets preserves category definitions. Thus old/imported/user-created empty roots are all possible. Palace and Paleis are distinct names, not normalized duplicates, and cannot safely be merged. Their exact historical origin in the user's library cannot be inferred from the model or screenshot; no private production library was opened or rewritten for this audit. This sprint hides genuine emptiness and preserves full context, without inventing origin claims.

No category, asset membership, collection or project migration. `libraryTotal` is derived API data only; no database schema change.

## Validation and evidence

- 13 targeted client tests passed across category navigation, LibrarySidebar, workspace navigation, existing removal and details. Includes breadcrumb path/navigation, duplicate-name search, child chips, jump/filter clearing, branch focus, collapse/reveal, true-empty hiding, capped indentation, session persistence, keyboard behavior and asset-selection preservation.
- 18 service library tests passed, including new filtered-versus-unfiltered descendant counts and update after asset removal. Existing pack, metadata, search, pagination, Favorites, Collections and safe-removal tests remain green.
- TypeScript: standalone `npm run typecheck` passed during implementation; final `npm run build` also compiled both client and service, including all final test files.
- Scoped ESLint passed for all changed TypeScript implementation/test files. Production build and eight bundled font-family integrity checks passed. The existing >500 kB chunk advisory remains.
- Real Chrome production browser fixture: **600 assets, 309 categories**, seven-level main path, duplicate Bedrooms names, genuinely empty Palace/Paleis roots, Favorites and collection. Script exercises deep navigation, breadcrumb, child cards, category search/jump, collapse/reveal, empty visibility, keyboard-only tree navigation, original asset search, Favorites and Collections. API category records before/after navigation are identical. No page errors and no sidebar horizontal overflow. Screenshots visually inspected at 1280 × 720.
- Automated traversal of seven category clicks plus the debounced result request was under one second in the recorded run; this is a local automation timing, not a human usability timing or benchmark for very large image collections. Raw final timing is in validation.json.
- Initial test accessible-name whitespace and test-only TypeScript issues were corrected. The final build and checks passed. No unrelated broad suite, Windows packaging or external action was run.

Artifacts (ignored local deliverables):
- `deliverables.local/Library-Navigation/before-1280.png`
- `deliverables.local/Library-Navigation/after-deep-1280.png`
- `deliverables.local/Library-Navigation/child-categories-1280.png`
- `deliverables.local/Library-Navigation/category-search-1280.png`
- `deliverables.local/Library-Navigation/validation.json`

Browser harness: `scripts/validate-library-navigation.mjs`. It uses a new `.qa.local/library-navigation-*` dataset, checks the spawned service identity and closes its own helpers. `--before` captures the pre-change production build only when that build is available. The retained before screenshot was captured before rebuilding; rerunning `--before` against a new build is not a historical comparison.

## Files and limits

Implementation: `src/library/categoryNavigation.ts`, `CategoryBrowser.tsx` and its CSS Module; `LibrarySidebar.tsx` and its CSS Module; `LibraryWorkspace.tsx`; derived type in `src/domain/library.ts`; count aggregation in `service/library.ts`. Targeted client/service tests, browser harness, `docs/asset-library.md` and this report added/updated.

Session-only state intentionally resets on reload. There is no persistent Back history or sidebar resizing. The tree is not virtualized; only the focused branch is expanded and results are paginated. Category matches and child chips use bounded-height scrolling rather than discarding matches. Thousands of assets with large real thumbnails were not separately benchmarked. No automatic merges, deletion, flattened taxonomy, package creation, push, publication or deployment occurred.
