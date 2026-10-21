# Analysis test fixtures

These JSON files are small, unchanged row slices of the real WHO-derived analysis export, not synthetic estimates. Tests import these copies rather than reading `public/`. Index and findings metadata are retained in full to verify ordering and references.

The samples retain both measures, all observed years for the three trend groups, representative labeled countries, both centroid patterns and all standards. Missing muscle-method values, zero sex-ratio endpoints, and the tiny negative reconstructed eye-centroid rate are intentional regression cases. That last value is floating-point roundoff in the exported back-transformation; canonical burden values are not altered.

Refresh slices when the pipeline output changes, retaining these edge cases. Sample sizes in rendered tests describe these slices; the live page reads the full export. WHO attribution and terms in the repository's `THIRD_PARTY_NOTICES.md` apply.
