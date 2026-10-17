# Before / after comparison

The source Northreach audit is unchanged. This sprint uses a newly imported QA copy. [Original native PNG](../../audits/2026-10-northreach-premium-coastline-proof/northreach-native-export.png), [before](evidence/north-before.png), [after](evidence/north-after.png), [interactive evidence gallery](index.html).

The initial native UI export is byte-identical to the earlier Northreach native export: 67cf19b04f5b7f183d7368f378278f597fb67dbff4ea46eedae14cfc07a59de6. This confirms that ordinary pre-existing rendering is unchanged for this project.

The new UI operation selects ring 0, start 31, end 61, protects northcape point 46 and uses strength 50. Exactly 24 vertices change: 33–44 and 48–59. Endpoints 31/61, tangent neighbours 32/60, the protected point 46 and neighbours 45/47 are exact. The remaining main ring and all 35 other Areas are exact; total geometry point count stays 622. The result is deliberately a local softening, not a new whole-map reproduction.

After export SHA-256: 7a9f0642bbb6e02ad3d4c9888bfef301c9bad33aac09bcdef4e76e5e30507c19. It differs from before and matches the exports after database/archive reopen and with Reference View open. The reference therefore contributes no pixels to the PNG.

## Real UI screenshots

- [Before](screenshots/01-before.png)
- [Selected segment and protected cape](screenshots/02-selected-protected-cape.png)
- [Original/proposed preview](screenshots/03-local-preview.png)
- [Applied result](screenshots/04-after-local-smoothing.png)
- [Reference alongside editor](screenshots/05-reference-panel.png)
- [Bridge before](screenshots/06-bridge-before.png)
- [Unsafe strength rejected](screenshots/07-bridge-rejection.png)
- [Bridge preview](screenshots/08-bridge-preview.png)
- [Bridge after](screenshots/09-bridge-after.png)
- [Real mouse/keyboard reference pan and zoom at 1280×720](screenshots/10-reference-pan-1280.png)
- [Native Preview](screenshots/11-preview.png)

The bridge uses two fixed opposing points (5 and 14). Strength 50 is refused (>3% area change); strength 15 is accepted. Native [before](evidence/bridge-before.png) and [after](evidence/bridge-after.png); the saved [bridge archive](evidence/bridge-result.mapweaver) preserves those fixed coordinates and its single polygon after reopen.

These screenshots demonstrate the new Mapweaver interface. The evidence PNGs are actual native exports. HTML comparison crops are report views only, not extra renderers or modified PNGs. No claim of whole-map premium quality is made.
