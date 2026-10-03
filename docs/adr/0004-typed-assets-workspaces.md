# ADR-0004 — Typed assets and editor workspaces

Date: 2026-09-23. Status: accepted for Sprint 10.

## Context

A stamp and a fill pattern use different placement interactions. The old untyped library and v1 manifest let the same logical ID serve both, so merely filtering the UI would leave invalid references possible. Asset management also occupied permanent canvas space.

## Decision

Use `AssetKind = 'stamp' | 'fillPattern'`, validate it in picker, store, resolver and project parser, and offer explicit cross-type logical copies. Dexie v3 shares library blobs via blobId with uniqueness per type/contenthash. Upgrade uses persisted recovery use and defaults unused old library assets to stamp. Mixed assets split deterministically without changing stamp references or deleting source bytes.

Write portable format v2. v1's lack of type is real ambiguity, so it is read through a central structural validation and deterministic migration rather than silently extending v1. Shared paths avoid embedding identical bytes twice. See [format v2](../architecture/mapweaver-format-v2.md) for exact compatibility and limits.

Use editor-only workspace/inspector/picker status instead of routing. A separate library manages local assets; native modal pickers select typed local or embedded project assets. Tools use click placement or rectangular drawing. Preserve the mounted canvas and each inspector scroll area across workspace/tab switches. No new UI framework or icon dependency is needed for the small SVG set.

## Consequences

Earlier generated projects remain readable; new v2 files need the updated application. Recovery migration is transactional and idempotent on reopening. The old session's unpersisted use cannot inform database migration. Source image sharing is explicit, and deletion is conservative when recovery uses the same hash. Native dialogs provide browser focus containment; trigger restoration is implemented and tested separately.
