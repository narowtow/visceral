# Visceral anatomy

`visceral.glb` is the Meshopt-compressed anatomy built by `../../../assets/build_anatomy.py`: 26 named mesh nodes, 190,632 triangles, 1,131,696 bytes. Names match `../../../contracts/organs.json`; the thyroid is a stylized stand-in with `stylized: true` in its extras.

BodyParts3D 4.0, © The Database Center for Life Science, licensed under [CC Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

Source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/

License page: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (updated 2025-02-27 to CC BY 4.0; old license text remains in OBJ headers).

Modifications: selected source elements were grouped, renamed, converted to metres/Y-up/anterior +Z, centered, decimated and Meshopt-compressed. External ears were split by side. The thyroid was newly constructed as an explicitly stylized butterfly. The skeleton combines partof FMA23881 with explicit isa bone-family mappings for arms, legs, girdles, hands and feet: 258 deduplicated elements, 58,800 triangles. FJ2810 supplies the full-body skin shell, including limbs.

Lung surfaces are approximate envelopes derived from BodyParts3D bronchial/vascular trees using convex hulls, 8 mm voxel remeshing, smoothing and subdivision before reduction to 7,840 triangles per lung. Their extras include `derived: "envelope of BodyParts3D bronchial/vascular tree"`. Bronchi were regrouped with the trachea (7,840 triangles); pulmonary vessels were omitted as separate structures. These envelopes are simplified surfaces, not recovered lung parenchyma or pleura.

See `../../../assets/README.md` for reproducible build, source mapping, reports and validation commands. This simplified anatomy is an educational visualization, not a clinical reference.
