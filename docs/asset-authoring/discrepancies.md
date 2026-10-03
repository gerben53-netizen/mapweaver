# Audit findings and boundaries

Historical audit before the Premium Terrain sprint. The application now includes fourteen image-backed brush materials; see [Painterly Terrain](../premium-terrain.md). Importing arbitrary custom brush IDs/presets is still unsupported, and the authoring template remains an ordinary Area fill-pattern package.

Checked against current source and shipped Engraved/Painterly packs, 26 September 2026. **REQUIRED** runtime rules take priority over historical prose. **RECOMMENDED** quality statements in this kit are not additional schema constraints. **OPTIONAL** authoring metadata never installs new product capabilities.

| Finding | Authoring consequence |
| --- | --- |
| Request context assumes packageable Terrain Brush textures; current tool uses a fixed style registry and procedural textures. No premium image-backed brush package path exists in the inspected implementation. | Terrain template is explicitly Area fill only. The requested custom brush-pack acceptance item cannot be met without a separate feature change. No fictitious type/preset was introduced. |
| Older asset-library guide called prefabs a future sprint and emphasized version 1. Runtime accepts 1/2/3 and prefabs are implemented. | Guide cross-reference corrected; this kit documents current version selection and composition support. |
| Static JSON Schemas describe structure, but do not fully enforce decoded aspect ratios, image hashes, exact file/member dependencies, safe Windows filenames, ordered generator ranges or disabled-rotation zero bounds. | A schema-valid file can still fail import. CLI and tests use runtime preview plus transactional review, not a duplicated schema. |
| Existing asset template generator emits only the original v1 schema/examples; it does not generate the full current v2/v3 contract. | New example builder is separate and leaves those published schemas intact. |
| Missing root manifest is not invariably an error: importer scans images without metadata. | Explicit root inspection is part of author workflow; CLI intentionally mirrors runtime fallback. |
| License/README/provenance extras can be distributed in ZIP but are ignored by import/export. | Retain original distribution notices separately; supported per-asset strings survive. |
| Shared generator query relaxes filters, while world scatter enforces compatible theme/biome pools. | Both are described; do not promise a fallback will place unrelated art. |
| Source images and physical placement units are independent; fill repeat scale is an Area setting. | No invented pack pattern scale or brush-size field. |

No runtime package format, storage schema, image renderer, UI or generator behavior was changed for this kit. The only runtime-facing addition is a developer validator reusing existing import code in an isolated library. No new dependencies, network actions or Windows build are required.
