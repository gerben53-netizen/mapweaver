# QA runtime recovery — 18 October 2026

Backend: 127.0.0.1:49571. Frontend: 127.0.0.1:49602. Both started through approved `require_escalated` local execution, without changing firewall, security settings or application networking. The ordinary sandbox remains restricted.

| Observation | Context | Actual result |
|---|---|---|
| Bind probe on both ports | sandbox | Both available; no bind error |
| Connect before starting services | approved local | `ECONNREFUSED` on both, expected because stopped |
| Connect after starting services | sandbox | `connect EACCES 127.0.0.1:49571/49602` |
| Backend `/api/v1/health` | approved local | HTTP 200, profile `qa`, dataProfile `QA`, schema 12 |
| Frontend reproduction HTML | approved local | HTTP 200 |
| Frontend `/api/v1/health` proxy | approved local | HTTP 200, same instance/generation/dataKey as direct backend |
| Actual in-app browser | browser | Editor loaded, existing macro imported, Reference View and four-point Calibrated Navigation work |

No `EPERM` or `EADDRINUSE` was observed. Earlier browser timeout was a failure to reach the sandbox-hosted listener, not evidence of port collision. The measured `EACCES` is at connect time, not bind time. Service startup logs contain no bind rejection and both processes stayed running through native UI downloads.

Configuration retained: `MAPWEAVER_RUNTIME_PROFILE=qa`; `MAPWEAVER_DATA_DIR=<repository>/.qa.local/land-precision/data`; `MAPWEAVER_PORT=49571`; `MAPWEAVER_DEV_ORIGIN=http://127.0.0.1:49572`. The existing audit-only Vite proxy uses that accepted origin and targets 49571. Primary Development is never selected. No new dataset or asset-copy replacement was made. Frontend build banner reads `unknown` because this audit config does not inject application build identity; branch and source SHA are independently recorded in production-plan.md. It is not a Primary runtime.

The original macro archive SHA-256 remains `019f9df837505e28b0a4319b7e0ee9dbfe0ba5d2f4a2aa646cfd5b6e68a735c2`; original macro JSON remains `c99c01e202eb483c2159fb1c2b187039469c3a53a7feba1797d1f6032d770bad`. Production resumed only after the real editor connection worked. See screenshots/runtime-recovered.png.

The audit helper's archive roundtrip calls existing gather/encode/decode/apply functions. `applyPrepared` detaches the active local document; the editor then correctly reports no local project open. Projects → Land Comparison QA → Open map Elyra V3 reopens the saved QA document normally. No product fix was made to hide this helper lifecycle effect.

Runtime recovery is verified. The user subsequently performed and confirmed one real Freehand gesture in the QA editor. Its saved nine-point Area was read from the same QA database, then reopened through the editor and converted to Landmass. All 36 previous objects stayed exact. The preserved macro was script-prepared and is not counted as another mouse-drawn Freehand action. The browser API limitation was resolved through this explicit user-assisted step, without injected pointer events or product changes. Final archive and actual UI export after database reopening match byte-for-byte.
