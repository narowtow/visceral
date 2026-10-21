# Visceral anatomy build

Builds the contract's 26 modeled mesh nodes from the local BodyParts3D 4.0 archive. No network or extra Python packages are needed. Raw sources and intermediate output remain git-ignored; the compressed `web/public/models/visceral.glb` is the deployable artifact.

## Build on this machine

Run from the repository root in PowerShell:

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python assets/build_anatomy.py -- --source assets/source/bodyparts3d --out assets/build/visceral.raw.glb --report assets/build/report.json
npx --no-install --prefix web gltf-transform meshopt assets/build/visceral.raw.glb web/public/models/visceral.glb
```

`--python-exit-code 1` makes Blender propagate Python exceptions as a failing process exit code. A failed build records its error in the report and never replaces the final raw GLB. Missing required concepts, missing element files, empty organs, mismatched contract names and exceeded triangle ceilings are fatal.

The supplied archive produced **190,632 triangles**, **26 mesh nodes**, a **4,292,288-byte raw GLB** and a **1,131,696-byte Meshopt GLB**. The emitted body is approximately 1.720 m tall. These are measured results for the default budgets; different Blender versions or budgets may change exact output sizes.

## Source resolution and geometry

- `organ_sources.json` maps each exact contract meshName to a source tree and FMA concepts. `*_element_parts.txt` supplies the union of ELEMENT file IDs for each concept; `*_parts_list_e.txt` supplies English concept names. Compound elements are deduplicated. IDs with letter suffixes such as `FJ1656M` are valid. No mesh is chosen by guessing a filename.
- `colon` includes cecum, ascending, transverse and descending colon. The builder searches for an exact `sigmoid colon` table name and reports its absence. A sigmoid artery entry is not a substitute.
- The two external ears share an `isa` source element and are separated by source x sign (left positive, right negative). Testes also use the `isa` tree.
- BodyParts3D's lung concepts contain bronchial/vascular trees, with no lung surface. Each lung is a **derived approximation**: hull of the listed elements' actual vertices → 8 mm voxel Remesh → six Smooth iterations → one subdivision level → Decimate to ≤8,000 triangles (7,840 each in this build). The hull bridges the gaps that direct remeshing of sparse branches would leave as tubes. These rounded envelopes do not reconstruct pleura, fissures or exact medial concavities. Both nodes carry `derived: "envelope of BodyParts3D bronchial/vascular tree"`; the report records the derivation settings.
- `trachea` joins FMA7394 with right/left main bronchi FMA7395/FMA7396 and bronchial trees FMA26661/FMA26662: 95 deduplicated elements, 7,840 triangles. Source-header tests ensure every airway element is tracheal/bronchial and none is a pulmonary artery or vein. Vessels contribute only to the envelope inputs; their tubular geometry is omitted from the exported model.
- `thyroid` is explicitly **stylized**, not BodyParts3D thyroid geometry. Its two lobes and isthmus are about 4.7 cm wide, anterior to the trachea. Thyroid cartilage FMA55099 supplies a placement reference only; the trachea is the fallback reference.
- `skeleton` combines the 138 axial elements from partof FMA23881 with verified `isa` bone families: humerus, radius, ulna, femur, tibia, fibula, patella, clavicle, scapula, hip bone, carpals, metacarpals, finger phalanges, tarsals, metatarsals and toe phalanges. `additionalSources` records these explicit mappings; ELEMENT IDs shared across trees are deduplicated. The result uses 258 elements and 58,800 triangles, retaining both arms, legs, hands, feet and girdles under the 60,000 ceiling. Whole-limb partof concepts are avoided because they also contain soft tissues.
- FJ2810 supplies the full skin shell, including arms and legs. The compressed-artifact test checks vertices in all four limb regions for both skin and skeleton. Skin has 24,499 triangles. In the web scene it defaults to neutral cool-gray glass at opacity 0.035 (dark) / 0.055 (light), with depth writing disabled. Skeleton uses neutral bone color. Each outer layer shows its data color when selected or displayed alone; selected/alone skin uses opacity 0.22. The HTML switches control visibility.

OBJ coordinates are imported with `wm.obj_import(forward_axis='Y', up_axis='Z')` so Blender does not reinterpret their axes. Vertices are then converted from millimetres, Z-up, anterior −Y to `(x, z, −y) / 1000`. One common translation puts the final feet at y=0 and centers the whole body on x/z; individual organs are never recentered. The glTF exporter uses `export_yup=False` because the vertices already have web/glTF axes—enabling its default conversion would rotate them again.

Each node is joined into one mesh object, triangulated, given recalculated normals and smooth shading, simplified with a Decimate `ratio` when needed, and assigned one neutral material with no textures. Default triangle ceilings total 217,500; skin ≤25,000 and skeleton ≤60,000. Low-detail source meshes are kept as-is; only the derived lung envelopes receive subdivision to smooth their voxel contours before final reduction.

Override ceilings with `--budgets path/to/overrides.json`, e.g. `{"skin": 20000, "brain": 12000}`. Unknown names and non-integer ceilings below 100 are rejected.

The GLB includes `organ_id`, `stylized`, and `source_concepts` custom properties through `export_extras=True`. `source_concepts` is a JSON-encoded string for portability across Blender custom-property versions; the report contains the same IDs as an ordinary JSON array. The report also records element IDs/counts, missing elements, triangle counts before/after reduction, metre bounding boxes, placement references, warnings and the common translation.

## Validation

Validate source tables and OBJ headers without building meshes (also works with ordinary Python):

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python assets/build_anatomy.py -- --source assets/source/bodyparts3d --out assets/build/visceral.raw.glb --report assets/build/preflight.json --validate-only
```

Validate the compressed artifact's names and extras:

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python assets/build_anatomy.py -- --source assets/source/bodyparts3d --out assets/build/visceral.raw.glb --report assets/build/compressed-validation.json --inspect-glb web/public/models/visceral.glb
```

Standard-library tests, from the repository root:

```powershell
& ./pipeline/.venv/Scripts/python.exe -m unittest discover -s assets/tests -v
```

If that environment cannot launch, the same tests run with Blender's bundled interpreter:

```powershell
& 'D:\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python-expr "import sys, unittest; sys.path.insert(0, '.'); result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.discover('assets/tests')); assert result.wasSuccessful(), 'Anatomy source tests failed'"
```

Web tests include decoding the actual Meshopt GLB through Three's GLTFLoader, validating all contract names, orientation, bounds, provenance and lung volume without WebGL. A Blender geometry test checks that separated source branches become a connected, closed envelope. The scene automatically uses the model when present and falls back to schematic anatomy if absent or invalid. Camera reset/initial framing uses model bounds; selected outlines attach to their actual meshes and keep data colors intact. The runtime test moves the real camera under StrictMode/demand rendering with normal and reduced motion, from an idle loop after the schematic-to-GLB handoff.

## License and attribution

**BodyParts3D 4.0, © The Database Center for Life Science, licensed under CC Attribution 4.0 International.**

- Archive: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/
- Archive license: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

The archive's license page was updated on **2025-02-27** to CC BY 4.0, which applies to these assets. The OBJ headers still mention the older CC BY-SA 2.1 Japan license; those historical headers are not the current archive license.

Modifications: selected structures were joined into organ groups, split by side where needed, renamed, transformed to metres/Y-up, centered, decimated and Meshopt-compressed. Lung surfaces are approximate envelopes derived from BodyParts3D bronchial/vascular trees using convex hulls, voxel remeshing and smoothing. Bronchi were regrouped with the trachea; pulmonary vessels were omitted as separate structures. The thyroid is a newly created stylized stand-in. Derived lungs and stylized thyroid are identified in metadata. This anatomy is simplified educational geometry, not a clinical reference. See also `../THIRD_PARTY_NOTICES.md`; the repository's MIT source-code license does not replace the asset attribution requirements.
