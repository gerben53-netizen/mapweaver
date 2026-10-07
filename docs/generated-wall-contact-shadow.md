# Generated Wall contact grounding

All Generated Wall materials receive one restrained, nondirectional contact shadow beneath their artwork. The default is 2 map-pixel blur, neutral rgba(20,23,20,0.16), zero offset and six map-pixels of cache padding. At canonical 1× this is a subtle 1–3-pixel-class falloff; 2× export doubles its pixel size.

The shadow uses the final composed component alpha, after opening cuts. It is not a centerline stroke or a per-component shadow. Opening exclusions are reapplied after blur, so even narrow passages remain clear. Finite endpoints, curves and corners use the same artwork silhouette. Floors, Texture paint, Environmental Surface and floor/edge decals remain below wall grounding and artwork; structural stamps retain their separate Soft Shadow.

The result shares the existing bounded Generated Wall surface cache and its meaningful-input key. Camera movement and unrelated object edits reuse the cached image. A cold build temporarily holds an additional raster of the same bounded size; no persistent format or wall identity changes. Existing artwork is unchanged. This static contact cue is not Campfire ambient occlusion, directional lighting or baked daylight; future AO should account for its low-opacity contribution.

Focused regression coverage exercises four production materials, straight and broad/tight curved paths, right-angle/irregular corners, closed contours, finite endpoints, doorway exclusions and 0.5/1/3-ft widths. The editor and PNG exports call the same composed wall renderer.
