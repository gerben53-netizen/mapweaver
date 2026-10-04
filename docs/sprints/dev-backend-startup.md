# Diagnose and fix development backend startup

## Acceptance

`npm run dev` starts the service and frontend together, gates frontend availability on real service health, propagates one service port, surfaces startup/runtime failure, stops its owned backend/frontend, and never needs Campfire connectivity. Independent QA uses non-default ports and isolated data. User data and existing processes remain untouched.

## Diagnosis

The original package script ran only `vite --host 127.0.0.1`. README required a second terminal running `dev:service`. There was no root dev orchestrator or one-click dev launcher. The Vite proxy and service independently defaulted to 47831; neither allocated a dynamic port. Frontend-only startup made no backend binding attempt, so no backend exception/exit code existed to capture in that path. Reproduced unchanged startup on QA ports 49181/49182: Vite served UI, proxied health returned 502 with ECONNREFUSED, direct health refused connection. Process inventory found no existing Mapweaver/Vite instance. Relevant history shows the frontend-only command predates recent API publishing changes; no wholesale revert needed.

## Correction

`package.json` calls `scripts/dev.mjs`. Topology: npm → dev orchestrator → service build, then owned Node service child; orchestrator starts Vite in-process only after successful health carrying that child's PID. MAPWEAVER_PORT is passed unchanged to child and explicit proxy override. MAPWEAVER_DEV_PORT/--port sets the frontend origin and strict Vite port. No console-log parsing. Default dev storage is isolated `.development.local`, overridable explicitly. Build failure, service spawn/exit, readiness timeout and frontend binding failures stop the session. Backend stdout/stderr are inherited. Service entry now prints the underlying exception message in addition to its existing diagnostic. Existing healthy service is detected before building/spawning and reported without duplicate start; it is not terminated or silently attached to. Second-start returns 1 with reuse/port guidance. Backend-only dev:service remains available.

## Evidence

- Four Node regression tests passed (`node --test scripts/dev.test.mjs` after build:service): configuration, real isolated backend + Vite proxy, immediate child exit prevents frontend, delayed child exit closes frontend and rejects session.
- Thirteen relevant service tests passed: lifecycle.test.ts and startupProject.test.ts.
- Typecheck and targeted ESLint for scripts/dev.mjs, scripts/dev.test.mjs and service/main.ts passed.
- Full npm run build passed including read-only Campfire provenance check, client compile/build, service compile/build and eight font families/license verification. Separate initial service build passed. Existing chunk-size/ineffective dynamic import warnings remain informational.
- Canonical npm run dev with .qa.local/dev-backend-smoke, service 49181 and client 49182: four checks spanning 30 seconds returned 200 for direct health, proxied health and frontend; matching backend PID throughout. No persistent proxy errors or delayed crash.
- Second canonical start rejected the detected service before spawning another backend.
- Failure smoke with explicitly invalid filesystem-root directory was safely rejected before storage creation: INVALID_DIRECTORY, detailed message, backend exit 1, root dev exit 1, no Vite.
- Ctrl+C closed both QA ports. No arbitrary process was killed.

No dependency upgrades, user storage reset/migration, credentials, remote calls/publication, contract mutation, artwork, Windows packaging or push. Service changes require restarting dev; only client HMR is supported. No broad browser/application suite was run for this startup-only fix.
