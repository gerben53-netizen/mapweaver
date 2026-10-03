# ADR-0002: Session command history

- Status: accepted
- Date: 2026-09-23

## Decision

Use one central command/transaction layer with a default limit of 100 entries. Each entry has a human-readable label and before/after snapshots containing only map, objects and ordered layers. Existing immutable Zustand actions share unchanged arrays/objects between snapshots; the library is never copied. Compare serialized model content at completion, not on pointer frames, to omit no-ops. This is simpler to audit for compound layer deletion, pattern editing and exact identifier restoration than separate inverse implementations for every current action.

Continuous editing begins one transaction before previews and commits at the existing completion boundary. Cancellation restores its before state without an entry. Other project commands explicitly call the same layer. Undo/redo is blocked during unfinished gestures. Direct hydration is deliberately not subscribed: future new/open/recovery calls reset after hydration; save marks clean. The clean point is a model signature, so returning to equal content becomes clean even if history was trimmed.

Background bytes must outlive a replaced background for undo. A separate session registry retains original blobs referenced by current or retained history documents and discards unreachable resources after branch changes, trimming and reset. History holds identifiers only. Rendering still owns reference-counted decoded images and object URLs. Library assets are unaffected.

## Consequences

Atomic restore includes exact generated identifiers and ordered references. Editor state is excluded; restore cleans invalid selection and falls back from a removed active layer. The implementation relies on immutable project mutations. Command completion does an O(model size) content comparison, acceptable for the current model; optimize with measured evidence if needed. History is bounded by step count, not bytes. Referenced background resources can consume significant memory but are not decoded solely for history. No persisted history or project-file format is introduced.
