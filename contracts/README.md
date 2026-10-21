# Visceral data contract (schemaVersion 1)

This folder is the single agreement between the **pipeline** (Python, writes the data) and the **web app** (TypeScript, reads it). Do not change it without bumping `schemaVersion` and updating both sides.

- `organs.json`: authoritative organ-group list. **Its order is the column order of every per-organ array below.**
- `make_fixture.py`: generates a small, fake but schema-correct dataset in `fixtures/data/` for web development and tests (`py -m uv run --project ../pipeline python make_fixture.py`).
- `fixtures/data/`: output of the fixture generator. The web app loads it until the real pipeline output exists.

The pipeline writes the real files to `web/public/data/`; the web app fetches them from `${import.meta.env.BASE_URL}data/`.

## Conventions
- JSON only, UTF-8, no `NaN`/`Infinity`. A missing value is `null` and means *not available*, which is different from `0`.
- Numbers are rounded to 4 significant digits.
- `count` is absolute (persons, not thousands). `rate` and `ageStdRate` are **per 100,000 population**.
- Sex ids: `both`, `male`, `female`. Age-group ids follow WHO GHE bins: `all`, `0_4`, `5_14`, `15_29`, `30_49`, `50_59`, `60_69`, `70_plus`.
- Measure ids: `deaths`, `dalys`.
- Metric ids: `count`, `rate` (crude/age-specific), `ageStdRate` (direct age standardization with the **WHO 2026** standard population; **only for age group `all`**).
- Location ids: ISO-3 codes plus `WLD` (world = sum of all countries).
- Organ-group values come from summing GHE causes mapped to that group (`causes.json`). Only causes with relation `primary` are summed, and each cause has **at most one** primary group, so groups never double-count. Parent causes are never summed together with their children.

## Files

### `manifest.json`
```jsonc
{
  "schemaVersion": 1,
  "datasetRelease": "WHO GHE 2023",
  "mappingVersion": "0.1.0",
  "generatedAt": "2026-10-20T00:00:00Z",
  "standardPopulation": "WHO2026",
  "years": [2000, 2010, 2015, 2019, 2020, 2021, 2022, 2023],
  "sexes": [{"id": "both", "label": "Both sexes"}, {"id": "male", "label": "Male"}, {"id": "female", "label": "Female"}],
  "ageGroups": [{"id": "all", "label": "All ages"}, {"id": "0_4", "label": "0–4"}, "..."],
  "measures": [{"id": "deaths", "label": "Deaths"}, {"id": "dalys", "label": "DALYs (disability-adjusted life years)"}],
  "metrics": [
    {"id": "count", "label": "Total"},
    {"id": "rate", "label": "Rate per 100,000"},
    {"id": "ageStdRate", "label": "Age-standardized rate per 100,000", "ageGroups": ["all"]}
  ],
  "organs": ["brain", "eyes", "..."],            // == organs.json order
  "locations": [
    {"id": "WLD", "name": "World", "kind": "world"},
    {"id": "AFG", "name": "Afghanistan", "kind": "country"}
  ],
  "colorDomains": {                              // fixed [min, max] over ALL locations/years/sexes for organ-kind groups,
    "deaths.ageStdRate": [0.1, 250.0],           // so colors are comparable across filters. Key = measure.metric
    "deaths.rate": [0, 0], "deaths.count": [0, 0], "dalys.ageStdRate": [0, 0], "dalys.rate": [0, 0], "dalys.count": [0, 0]
  },
  "provenance": {
    "sources": [{"id": "who_ghe_2023", "citation": "…", "url": "…", "terms": "…", "retrievedAt": "2026-10-20"}],
    "notes": ["…"]
  }
}
```

### `causes.json`
```jsonc
{
  "schemaVersion": 1,
  "mappingVersion": "0.1.0",
  "causes": [
    {"code": 1130, "name": "Ischaemic heart disease", "parent": 1100, "level": 3,
     "organ": "heart", "relation": "primary",        // "primary" | "none" (parent or excluded)
     "rationale": "ICD-10 I20-I25; heart muscle ischaemia"}
  ]
}
```

### `locations/{ID}.json` (one per location, e.g. `locations/USA.json`, `locations/WLD.json`)
```jsonc
{
  "schemaVersion": 1,
  "location": "USA",
  "population": { "2023": { "both": { "all": 340000000, "0_4": 18000000, "...": 0 }, "male": {}, "female": {} } },
  "values": {
    "deaths": {
      "2023": {
        "both": {
          "all":  { "count": [/* one per organ */], "rate": [], "ageStdRate": [] },
          "0_4":  { "count": [], "rate": [] }
        },
        "male": {}, "female": {}
      }
    },
    "dalys": {}
  },
  "topCauses": {                                     // all ages only; up to 5 causes per organ group, sorted desc by count
    "deaths": { "2023": { "both": { "heart": [ {"code": 1130, "count": 900000, "rate": 265.1} ] } } },
    "dalys": {}
  }
}
```

### `summary/{year}.json` (cross-country comparison, ranking, clustering)
```jsonc
{
  "schemaVersion": 1,
  "year": 2023,
  "locations": ["WLD", "AFG", "..."],              // row order
  "values": {
    "deaths": { "both": { "ageStdRate": [[/* per organ */] /* per location */], "rate": [[]] }, "male": {}, "female": {} },
    "dalys": {}
  }
}
```

### `analysis/*.json` (Phase 4)
Figure data for the Analysis page, one file per figure. Each has `{ "schemaVersion": 1, "id", "title", "description", "data": [...] }`.
