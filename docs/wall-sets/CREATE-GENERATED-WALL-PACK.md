# Living Root component pack authoring

This is a component composition pack, not a fill texture or Wall Material atlas. The current production definition is `src/domain/livingRootProductionPack.json` (`production-1`); `src/domain/livingRootPack.json` retains the immutable development reference (`dev-1`). Both share the same component IDs and sizing/selection metadata.

Required roles: `root-long`, `root-medium`, `root-small`, `knot`. Optional: `root-end`, `moss`, `leaves`. Supply several visibly different primary roots and knots. Each image must be a transparent PNG, exactly top-down, lighting-neutral and oriented LEFT → RIGHT along the wall. Preserve branch protrusions and natural taper; do not bake a rectangle, floor, contact shadow, directional highlight or foliage blanket into the artwork. Clean must look convincing with no vegetation.

Each component declares `id`, `role`, `image`, positive `nominalLengthFt`, `nominalWidthFt`, and `weight`. Physical sizes include the source's graphic extent; keep padding modest and consistent. Current admission allows at most 64 components, each at most 2048 px/edge, with a shared 16M decoded-pixel budget. Resource paths are `/generated-walls/<immutable-pack-revision>/<component>.png`. No external URLs or runtime scripts.

A definition has `id`, immutable `revision`, `name`, `renderingMode: "generated"`, `generatorType: "living-root"`, `components`, `defaults` (`width` in feet; `organic`, `growth`, `overgrowth` from 0–1). Register validated data using `registerGeneratedDefinition` in the shared registry module and bundle the PNG directory. Retain old registrations and files so saved maps remain exact. There is no generated-pack ZIP import UI in v1.

`node scripts/build-generated-wall-fixtures.mjs` reproduces the development SVG-to-PNG fixtures. It is not a production-art generator. Never overwrite an already distributed revision to improve artwork; assign a new revision and re-run the 40×30-ft benchmark, Clean reference, open-door pixel checks and 1×/2× export checks.
