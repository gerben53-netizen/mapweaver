# Architecture and scope

See ADR-0067 for the adopted decision. Calibration is a similarity in image/map pixels; viewports convert CSS pixels separately. It never changes authored geometry or map dimensions. Rotation is applied in coordinate conversion and inversion, not to either camera. The fit uses centred sums to avoid unnecessary cancellation, rejects near-coincident pairs and limits scale. Pair residuals are visible in map pixels; two-pair exact fit is explicitly not an independent accuracy check.

One-way subscriptions avoid oscillation: only the chosen source drives the follower, with a synchronous reentrancy guard for target writes. No bidirectional mode. Align Views is explicit and uses the current source centre and scale. A narrower pane naturally shows a smaller geographical extent at equal screen scale; this is documented rather than claiming identical crops. Clamp limits are reported while centres remain aligned.

Reference state is outside the project/history adapter. Blob ownership stays in ReferenceView; it is revoked on replacement/clear/unmount. Component generation remounts clear calibration. Hide preserves the current session but deactivates links. Map dimension changes invalidate the fit without altering existing pairs or map data. Normal contour edits and undo/redo leave it unchanged. Preview unmounts the edit overlay and pauses linking; calibration still exists for resuming in Edit.

All markers live in editor DOM, not a Konva project layer. A calibration pick blocks pointer propagation only for that explicit action; regular tool behavior is otherwise untouched. No renderer reference-state import. Image decoding/import safeguards are reused; no new dependency or contract fork.

Persistent reference storage, independent validation landmarks, rotated viewport presentation, automatic tracing and matching exact rectangular extents across different aspect ratios are deferred. None is represented as implemented.
