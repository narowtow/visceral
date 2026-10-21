# WHO GHE 2023 pipeline validation

PASS: nonnegative finite values, valid dimensions, unique keys; all measure/year pairs present

Validated **15,486,720 observations**, **35,520 population rows**, **185 countries**, and **218 causes** across both measures and all eight years.
Missing observations: **0**. Unexplained reconciliation failures: **[]**.

| Check | Maximum absolute difference | Maximum absolute relative error (%) | Outside tolerance |
|---|---:|---:|---:|
| sexes | 1.07288e-06 | 9.97561e-13 | 0 |
| ages | 7.7486e-07 | 9.37049e-13 | 0 |
| partition | 251.62 | 66.6666 | 76 |
| Children → parent level 0 | 251.62 | 66.6666 | 76 |
| Children → parent level 1 | 464114 | 33.441 | 27592 |
| Children → parent level 2 | 464114 | 367.594 | 28089 |
| Children → parent level 3 | 0.0697064 | 0.00179423 | 17 |
| Children → parent level 4 | 8.29459e-10 | 8.77645e-13 | 0 |

## Published cause-level death rates

Country deaths ASDRs now sum WHO-published primary-cause ASDRs, using WHO2026 at fine ages.
Parsed **1,900,320 rates**, **214 cause codes** per rate kind. Available years: **{'ASDR': [2000, 2010, 2015, 2019, 2020, 2021, 2022, 2023], 'CDR': [2000, 2010, 2015, 2019, 2020, 2021, 2022, 2023]}**.
Four count-workbook descendants (261, 262, 831, 832) are absent; all primary causes are present.

| Published primary sum vs All Causes | Pairs | Maximum absolute error per 100,000 | Maximum relative error (%) | Outside tolerance | Unexplained |
|---|---:|---:|---:|---:|---:|
| ASDR | 4,440 | 3.55484 | 0.245364 | 19 | 0 |
| CDR | 4,440 | 3.76797 | 0.34745 | 19 | 0 |

Count-derived cause-level crude rates: **950,160 pairs**, maximum absolute difference **5.22959e-12 per 100,000**, **0** outside tolerance.
There are 19 ASDR and 19 CDR primary-sum defects, all matching the previously pinned count-defect contexts.
Exact published-rate snapshots are in config/reference_reconciliation_exceptions.csv; they are retained, not repaired.

## Deaths ASDR method sensitivity

Tidy artifact: `data/interim/deaths_asdr_method_comparison.parquet` — **137,640 rows**, **3,775,383 bytes**.
Differences are **broad-bin minus published sum**. Relative differences below are percentages of the published sum.
Rows with a zero published sum have null relative differences and are excluded from relative quantiles.

| Organ group | Relative pairs | P05 (%) | Median (%) | P95 (%) |
|---|---:|---:|---:|---:|
| bladder | 4,388 | -19.963 | -5.197 | 8.047 |
| blood_immune | 4,440 | -14.799 | -4.321 | 2.992 |
| bones_joints | 4,440 | -28.753 | -10.973 | 5.107 |
| brain | 4,440 | -28.595 | -15.016 | 6.472 |
| breast | 4,404 | -13.948 | -3.116 | 2.978 |
| colon_rectum | 4,440 | -14.706 | -3.995 | 3.929 |
| congenital | 4,440 | -6.992 | -0.387 | 4.733 |
| diabetes_endocrine | 4,440 | -21.828 | -8.583 | 4.043 |
| ears | 4,356 | -19.075 | -5.771 | 4.604 |
| esophagus | 4,377 | -16.719 | -2.430 | 5.652 |
| eyes | 335 | -35.843 | -0.732 | 27.690 |
| gallbladder | 4,435 | -26.262 | -10.378 | 3.876 |
| heart | 4,440 | -26.980 | -14.334 | 6.559 |
| infections_systemic | 4,440 | -13.958 | -2.094 | 4.368 |
| injuries | 4,440 | -14.414 | -4.937 | 3.417 |
| kidneys | 4,440 | -26.011 | -11.127 | 4.966 |
| liver | 4,440 | -12.830 | -3.916 | 1.592 |
| lungs | 4,440 | -23.327 | -11.764 | 3.785 |
| maternal_neonatal | 4,440 | -9.814 | -0.338 | 6.618 |
| mental_substance | 4,429 | -9.902 | -1.528 | 2.613 |
| muscles | 0 | n/a | n/a | n/a |
| other_unallocated | 4,440 | -24.012 | -12.155 | 5.301 |
| ovaries | 2,960 | -7.813 | -0.751 | 2.864 |
| pancreas | 4,440 | -15.683 | -4.369 | 2.366 |
| prostate | 2,961 | -26.840 | -9.128 | 1.172 |
| skin | 4,440 | -29.393 | -12.498 | 4.763 |
| small_intestine | 4,400 | -29.007 | -12.644 | 7.033 |
| stomach | 4,440 | -19.585 | -7.372 | 2.900 |
| testes | 2,676 | -16.353 | 0.331 | 14.886 |
| thyroid | 4,273 | -16.971 | -1.871 | 11.737 |
| uterus_cervix | 2,961 | -6.850 | -1.353 | 2.820 |


## Broad-bin all-cause check (analysis artifact)

Differences are **ours minus WHO**, per 100,000 population.
ASDR here describes the retained broad-bin analysis method, not the exported country deaths ASDRs.

| Rate | Pairs | Min difference | Median difference | P95 difference | Max difference | Median relative difference (%) |
|---|---:|---:|---:|---:|---:|---:|
| ASDR | 4,440 | -1611.59 | -170.301 | 33.926 | 121.331 | -11.3061 |
| CDR | 4,440 | -5.22959e-12 | 0 | 2.95586e-12 | 5.22959e-12 | 0 |

## Global unallocated burden

| Year | Measure | Other/unallocated share (%) |
|---|---|---:|
| 2000 | dalys | 5.618576 |
| 2023 | dalys | 6.495589 |
| 2000 | deaths | 5.258421 |
| 2023 | deaths | 6.309554 |

## Export

**196 files**, **58,542,334 bytes** total (58.542 MB). Largest: `summary\2021.json` (**384,819 bytes**).

## World 2023: both sexes, all ages

| Organ group | Deaths (unrounded count) |
|---|---:|
| heart | 11,931,336.625 |
| lungs | 11,114,679.049 |
| brain | 10,457,779.544 |
| injuries | 4,772,357.360 |
| other_unallocated | 3,838,707.449 |
| diabetes_endocrine | 2,284,527.047 |
| infections_systemic | 2,159,531.600 |
| liver | 2,049,648.188 |
| maternal_neonatal | 2,021,224.073 |
| kidneys | 1,560,306.670 |

Exported organ sums are checked against source All Causes for WLD, USA, IND, NGA and JPN,
in 2000 and 2023, for both deaths and DALYs. The allowed error includes the sum of
four-significant-digit rounding bounds plus source reconciliation tolerance.


## Known source inconsistencies (retained, not corrected)

**WARN:** Code 20 excludes exactly code 260 (leishmaniasis), although its descendants and code 10 include it.
This explains the paired level-1/2 errors: children minus parent equals -260 at code 10 and +260 at code 20.
The semantic tree and disjoint primary mapping are retained; no published intermediate total is overwritten.
There are also 76 All Causes cases (38 deaths, 38 DALYs) where the three published level-1 categories sum
below the published root, and 17 small DALY stroke-subtype discrepancies. Exact keys and source values are
pinned in config/reconciliation_exceptions.csv. The build accepts only those exact cases and the tested
leishmaniasis identity; any unexplained discrepancy still fails the build. Raw errors remain in the tables.
No fabricated residual cause is added. Consequently the primary set partitions the source cause tree,
but it cannot reproduce an inconsistent source All Causes total exactly in those 76 cases.

Canonical values are absolute counts (source thousands multiplied by 1,000).
Reconciliation tolerance: absolute 0.01 persons/DALYs plus 1e-6 of the parent value.
Relative errors exclude zero denominators; absolute differences retain them.
Missing pairs are reported separately; no missing values are replaced with zero.

## Measured diagnostics

```json
{
  "observations": 15486720,
  "population": 35520,
  "missing_observations": 0,
  "countries": 185,
  "causes": 218,
  "schemas": "PASS: nonnegative finite values, valid dimensions, unique keys; all measure/year pairs present",
  "reconciliation": {
    "sexes": {
      "pairs": 5162240,
      "missing_pairs": 0,
      "signed_difference": {
        "min": -1.0728836059570312e-06,
        "p05": -4.092726157978177e-12,
        "median": 0.0,
        "p95": 4.092726157978177e-12,
        "max": 1.0132789611816406e-06
      },
      "absolute_difference": {
        "min": 0.0,
        "p05": 0.0,
        "median": 0.0,
        "p95": 2.1827872842550278e-11,
        "max": 1.0728836059570312e-06
      },
      "relative_difference_percent": {
        "min": -9.975613863791204e-13,
        "p05": -2.9179659399334436e-13,
        "median": 0.0,
        "p95": 2.923376058646438e-13,
        "max": 9.683716560992738e-13
      },
      "absolute_relative_difference_percent": {
        "min": 0.0,
        "p05": 0.0,
        "median": 2.13665869136607e-14,
        "p95": 3.5782263127458887e-13,
        "max": 9.975613863791204e-13
      },
      "outside_tolerance": 0
    },
    "ages": {
      "pairs": 1935840,
      "missing_pairs": 0,
      "signed_difference": {
        "min": -6.556510925292969e-07,
        "p05": -4.18367562815547e-11,
        "median": 0.0,
        "p95": 4.18367562815547e-11,
        "max": 7.748603820800781e-07
      },
      "absolute_difference": {
        "min": 0.0,
        "p05": 0.0,
        "median": 1.1368683772161603e-13,
        "p95": 1.4551915228366852e-10,
        "max": 7.748603820800781e-07
      },
      "relative_difference_percent": {
        "min": -9.104006567440676e-13,
        "p05": -2.5087619980082503e-13,
        "median": 0.0,
        "p95": 2.500331083336872e-13,
        "max": 9.370485367635412e-13
      },
      "absolute_relative_difference_percent": {
        "min": 0.0,
        "p05": 0.0,
        "median": 7.622479311546251e-14,
        "p95": 3.16687502961601e-13,
        "max": 9.370485367635412e-13
      },
      "outside_tolerance": 0
    },
    "partition": {
      "pairs": 71040,
      "missing_pairs": 0,
      "signed_difference": {
        "min": -251.62034760896836,
        "p05": -1.862645149230957e-09,
        "median": 0.0,
        "p95": 1.862645149230957e-09,
        "max": 5.662441253662109e-07
      },
      "absolute_difference": {
        "min": 0.0,
        "p05": 0.0,
        "median": 1.4551915228366852e-11,
        "p95": 3.958120942115784e-09,
        "max": 251.62034760896836
      },
      "relative_difference_percent": {
        "min": -66.66664611111744,
        "p05": -2.0434690005803253e-13,
        "median": 0.0,
        "p95": 2.00319516548094e-13,
        "max": 6.104111325798314e-13
      },
      "absolute_relative_difference_percent": {
        "min": 0.0,
        "p05": 0.0,
        "median": 5.4833359196324444e-14,
        "p95": 2.670792158715849e-13,
        "max": 66.66664611111744
      },
      "outside_tolerance": 76,
      "source_exceptions": {
        "explained_counts": {
          "pinned_all_causes_defect": 76
        },
        "unexplained_count": 0,
        "unexplained_examples": []
      }
    },
    "hierarchy_by_parent_level": {
      "0": {
        "pairs": 71040,
        "missing_pairs": 0,
        "signed_difference": {
          "min": -251.6203476089679,
          "p05": -1.862645149230957e-09,
          "median": 0.0,
          "p95": 1.862645149230957e-09,
          "max": 8.940696716308594e-07
        },
        "absolute_difference": {
          "min": 0.0,
          "p05": 0.0,
          "median": 1.8189894035458565e-11,
          "p95": 4.6566128730773926e-09,
          "max": 251.6203476089679
        },
        "relative_difference_percent": {
          "min": -66.66664611111744,
          "p05": -2.5249459036688925e-13,
          "median": 0.0,
          "p95": 2.4816419213776675e-13,
          "max": 7.813604467861044e-13
        },
        "absolute_relative_difference_percent": {
          "min": 0.0,
          "p05": 0.0,
          "median": 7.366509420946363e-14,
          "p95": 3.22198557716576e-13,
          "max": 66.66664611111744
        },
        "outside_tolerance": 76
      },
      "1": {
        "pairs": 213120,
        "missing_pairs": 0,
        "signed_difference": {
          "min": -464114.02106740884,
          "p05": -37.10583161402354,
          "median": -7.993605777301127e-15,
          "p95": 2.9103830456733704e-10,
          "max": 5.066394805908203e-07
        },
        "absolute_difference": {
          "min": 0.0,
          "p05": 0.0,
          "median": 6.139089236967266e-12,
          "p95": 37.1058316140234,
          "max": 464114.02106740884
        },
        "relative_difference_percent": {
          "min": -33.441004175639435,
          "p05": -0.07406476735291478,
          "median": -1.3992592108379479e-14,
          "p95": 2.5874654546320763e-13,
          "max": 8.72581716630451e-13
        },
        "absolute_relative_difference_percent": {
          "min": 0.0,
          "p05": 0.0,
          "median": 1.0313266114053226e-13,
          "p95": 0.0740647673529147,
          "max": 33.441004175639435
        },
        "outside_tolerance": 27592
      },
      "2": {
        "pairs": 1278720,
        "missing_pairs": 0,
        "signed_difference": {
          "min": -1.043081283569336e-07,
          "p05": -4.729372449219227e-11,
          "median": 0.0,
          "p95": 1.4551915228366852e-10,
          "max": 464114.02106737066
        },
        "absolute_difference": {
          "min": 0.0,
          "p05": 0.0,
          "median": 3.979039320256561e-13,
          "p95": 4.0745362639427185e-10,
          "max": 464114.02106737066
        },
        "relative_difference_percent": {
          "min": -9.794214242130791e-13,
          "p05": -2.7237757271446923e-13,
          "median": 0.0,
          "p95": 3.479908375800941e-13,
          "max": 367.5940523985989
        },
        "absolute_relative_difference_percent": {
          "min": 0.0,
          "p05": 0.0,
          "median": 8.559418514726366e-14,
          "p95": 4.0580223819424695e-13,
          "max": 367.5940523985989
        },
        "outside_tolerance": 28089
      },
      "3": {
        "pairs": 1065600,
        "missing_pairs": 0,
        "signed_difference": {
          "min": -0.06970635009929538,
          "p05": -7.275957614183426e-12,
          "median": 0.0,
          "p95": 5.9117155615240335e-12,
          "max": 0.0003304343103991414
        },
        "absolute_difference": {
          "min": 0.0,
          "p05": 0.0,
          "median": 5.995204332975845e-15,
          "p95": 3.637978807091713e-11,
          "max": 0.06970635009929538
        },
        "relative_difference_percent": {
          "min": -0.001794225811524743,
          "p05": -2.904666260583165e-13,
          "median": 0.0,
          "p95": 2.7150543486613693e-13,
          "max": 0.0001033620225607259
        },
        "absolute_relative_difference_percent": {
          "min": 0.0,
          "p05": 0.0,
          "median": 6.521551755472025e-14,
          "p95": 3.6678452333856666e-13,
          "max": 0.001794225811524743
        },
        "outside_tolerance": 17
      },
      "4": {
        "pairs": 71040,
        "missing_pairs": 0,
        "signed_difference": {
          "min": -8.294591680169106e-10,
          "p05": -4.618527782440651e-14,
          "median": 0.0,
          "p95": 4.263256414560601e-14,
          "max": 7.8580342233181e-10
        },
        "absolute_difference": {
          "min": 0.0,
          "p05": 0.0,
          "median": 0.0,
          "p95": 5.684341886080801e-13,
          "max": 8.294591680169106e-10
        },
        "relative_difference_percent": {
          "min": -8.776454843787805e-13,
          "p05": -2.0450340630030508e-13,
          "median": 0.0,
          "p95": 1.9801430396652432e-13,
          "max": 8.373993632604501e-13
        },
        "absolute_relative_difference_percent": {
          "min": 0.0,
          "p05": 0.0,
          "median": 0.0,
          "p95": 3.031553984286615e-13,
          "max": 8.776454843787805e-13
        },
        "outside_tolerance": 0
      }
    },
    "hierarchy_outside_tolerance": 55774,
    "hierarchy_source_exceptions": {
      "explained_counts": {
        "code_20_excludes_leishmaniasis": 55681,
        "pinned_stroke_precision_defect": 17,
        "pinned_all_causes_defect": 76
      },
      "unexplained_count": 0,
      "unexplained_examples": []
    },
    "population_sex": {
      "pairs": 11840,
      "missing_pairs": 0,
      "signed_difference": {
        "min": -1.4901161193847656e-08,
        "p05": 0.0,
        "median": 0.0,
        "p95": 0.0,
        "max": 7.450580596923828e-09
      },
      "absolute_difference": {
        "min": 0.0,
        "p05": 0.0,
        "median": 0.0,
        "p95": 0.0,
        "max": 1.4901161193847656e-08
      },
      "relative_difference_percent": {
        "min": -1.1364008187494127e-14,
        "p05": 0.0,
        "median": 0.0,
        "p95": 0.0,
        "max": 1.1367895568464962e-14
      },
      "absolute_relative_difference_percent": {
        "min": 0.0,
        "p05": 0.0,
        "median": 0.0,
        "p95": 0.0,
        "max": 1.1367895568464962e-14
      }
    },
    "population_age_group": {
      "pairs": 4440,
      "missing_pairs": 0,
      "signed_difference": {
        "min": -7.450580596923828e-09,
        "p05": 0.0,
        "median": 0.0,
        "p95": 0.0,
        "max": 7.450580596923828e-09
      },
      "absolute_difference": {
        "min": 0.0,
        "p05": 0.0,
        "median": 0.0,
        "p95": 0.0,
        "max": 7.450580596923828e-09
      },
      "relative_difference_percent": {
        "min": -1.13545598750514e-14,
        "p05": 0.0,
        "median": 0.0,
        "p95": 0.0,
        "max": 1.1361915443625852e-14
      },
      "absolute_relative_difference_percent": {
        "min": 0.0,
        "p05": 0.0,
        "median": 0.0,
        "p95": 0.0,
        "max": 1.1361915443625852e-14
      }
    }
  },
  "published_rates": {
    "ASDR": {
      "pairs": 4440,
      "missing_pairs": 0,
      "signed_difference": {
        "min": -1611.5859159348524,
        "p05": -418.16584683486707,
        "median": -170.3005219458264,
        "p95": 33.9259671623135,
        "max": 121.33089862351153
      },
      "absolute_difference": {
        "min": 0.012798502671216738,
        "p05": 12.125159423944268,
        "median": 170.3005219458264,
        "p95": 418.1658468348671,
        "max": 1611.5859159348524
      },
      "relative_difference_percent": {
        "min": -44.64150791226138,
        "p05": -21.37002813078975,
        "median": -11.306116082067696,
        "p95": 4.7884806868261105,
        "max": 23.5505097062722
      },
      "absolute_relative_difference_percent": {
        "min": 0.0014311465324733747,
        "p05": 1.4116900033713187,
        "median": 11.564829284212017,
        "p95": 21.45464540969188,
        "max": 44.64150791226138
      },
      "by_year": {
        "2000": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -630.7245743882233,
            "p05": -395.8748492490989,
            "median": -229.25214754023705,
            "p95": -9.583433706893722,
            "max": 55.050368808173516
          },
          "absolute_difference": {
            "min": 0.03178634711139239,
            "p05": 21.39732260540949,
            "median": 229.25214754023705,
            "p95": 395.8748492490988,
            "max": 630.7245743882233
          },
          "relative_difference_percent": {
            "min": -33.25631859928013,
            "p05": -22.839754522181526,
            "median": -12.178123816314985,
            "p95": -1.112578750307523,
            "max": 7.4794712128506635
          },
          "absolute_relative_difference_percent": {
            "min": 0.003755582374179103,
            "p05": 2.326865289900965,
            "median": 12.178123816314985,
            "p95": 22.839754522181522,
            "max": 33.25631859928013
          }
        },
        "2010": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -621.7436355041959,
            "p05": -331.9556860502986,
            "median": -174.59579486378493,
            "p95": 26.6300302791307,
            "max": 114.12586419148386
          },
          "absolute_difference": {
            "min": 0.5741159654663761,
            "p05": 17.916177944097768,
            "median": 174.59579486378493,
            "p95": 331.9556860502986,
            "max": 621.7436355041959
          },
          "relative_difference_percent": {
            "min": -36.18050548680488,
            "p05": -20.39653170540504,
            "median": -11.023467497183926,
            "p95": 3.6505616645394374,
            "max": 17.328453768653084
          },
          "absolute_relative_difference_percent": {
            "min": 0.07007428268408562,
            "p05": 1.9999311733340148,
            "median": 11.170759489728898,
            "p95": 20.396531705405035,
            "max": 36.18050548680488
          }
        },
        "2015": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -572.7759279840536,
            "p05": -331.20879414350196,
            "median": -138.25057750580913,
            "p95": 42.43515093823896,
            "max": 121.33089862351153
          },
          "absolute_difference": {
            "min": 0.6770754746786452,
            "p05": 14.343085035881291,
            "median": 138.25057750580913,
            "p95": 331.2087941435019,
            "max": 572.7759279840536
          },
          "relative_difference_percent": {
            "min": -33.928062058986626,
            "p05": -18.928411931593537,
            "median": -10.098747601350208,
            "p95": 6.295943776102449,
            "max": 23.5505097062722
          },
          "absolute_relative_difference_percent": {
            "min": 0.07183391412287712,
            "p05": 1.3521197726428174,
            "median": 10.298294486326059,
            "p95": 19.08937907471189,
            "max": 33.928062058986626
          }
        },
        "2019": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -550.6042880744271,
            "p05": -328.01260138520024,
            "median": -133.5134098725457,
            "p95": 37.68812650196716,
            "max": 107.01260853182231
          },
          "absolute_difference": {
            "min": 0.012798502671216738,
            "p05": 10.448252956069394,
            "median": 133.5134098725457,
            "p95": 328.01260138520024,
            "max": 550.6042880744271
          },
          "relative_difference_percent": {
            "min": -36.9534230308002,
            "p05": -19.45484289814666,
            "median": -10.426528959807522,
            "p95": 5.722065486634525,
            "max": 21.147369236377806
          },
          "absolute_relative_difference_percent": {
            "min": 0.0014311465324733747,
            "p05": 1.3623555484896304,
            "median": 10.70674279347186,
            "p95": 19.561135638279953,
            "max": 36.9534230308002
          }
        },
        "2020": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -650.293416860276,
            "p05": -453.508244737506,
            "median": -156.49976620631287,
            "p95": 37.68491615129698,
            "max": 112.68005770318734
          },
          "absolute_difference": {
            "min": 0.026438385588903657,
            "p05": 9.943188907092168,
            "median": 156.49976620631287,
            "p95": 453.5082447375059,
            "max": 650.293416860276
          },
          "relative_difference_percent": {
            "min": -37.93886348725285,
            "p05": -21.983453400382768,
            "median": -11.048099826469826,
            "p95": 5.196273608958969,
            "max": 19.97786130522494
          },
          "absolute_relative_difference_percent": {
            "min": 0.0034891311143502132,
            "p05": 1.2982356240044095,
            "median": 11.31486457187378,
            "p95": 21.98345340038276,
            "max": 37.93886348725285
          }
        },
        "2021": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -767.8465536379617,
            "p05": -478.4818692701575,
            "median": -175.61802907379638,
            "p95": 37.74366892507423,
            "max": 106.52159904642679
          },
          "absolute_difference": {
            "min": 0.6351724786052273,
            "p05": 11.100470047682741,
            "median": 175.61802907379638,
            "p95": 478.48186927015746,
            "max": 767.8465536379617
          },
          "relative_difference_percent": {
            "min": -40.58909449949509,
            "p05": -22.171539968039216,
            "median": -11.36893935440224,
            "p95": 5.177425806527385,
            "max": 21.06849346371962
          },
          "absolute_relative_difference_percent": {
            "min": 0.09529911922482981,
            "p05": 1.24434386544303,
            "median": 11.831998669096915,
            "p95": 22.171539968039205,
            "max": 40.58909449949509
          }
        },
        "2022": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -1611.5859159348524,
            "p05": -461.95604062523824,
            "median": -181.99107833183064,
            "p95": 39.212166885196304,
            "max": 112.66913136706307
          },
          "absolute_difference": {
            "min": 0.6012374768229165,
            "p05": 12.600133301315875,
            "median": 181.99107833183064,
            "p95": 461.9560406252381,
            "max": 1611.5859159348524
          },
          "relative_difference_percent": {
            "min": -44.64150791226138,
            "p05": -23.11447177641596,
            "median": -12.812514329977656,
            "p95": 5.439140266222276,
            "max": 22.60618358496815
          },
          "absolute_relative_difference_percent": {
            "min": 0.07946045554434711,
            "p05": 1.4701984600012035,
            "median": 13.46622964628262,
            "p95": 23.11447177641595,
            "max": 44.64150791226138
          }
        },
        "2023": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -1337.360548598852,
            "p05": -372.2912472171343,
            "median": -167.33164638161907,
            "p95": 37.8028564516287,
            "max": 112.76634233470327
          },
          "absolute_difference": {
            "min": 0.23636529747386703,
            "p05": 10.550405462995968,
            "median": 167.33164638161907,
            "p95": 372.29124721713424,
            "max": 1337.360548598852
          },
          "relative_difference_percent": {
            "min": -36.13167815557742,
            "p05": -20.947988711677066,
            "median": -12.086590615240116,
            "p95": 5.616610621325227,
            "max": 23.47734978633608
          },
          "absolute_relative_difference_percent": {
            "min": 0.03586914250643854,
            "p05": 1.3906605000649888,
            "median": 12.402785461354211,
            "p95": 21.12236088646133,
            "max": 36.13167815557742
          }
        }
      },
      "largest_relative_errors": [
        {
          "measure": "ASDR",
          "year": 2022,
          "location": "FJI",
          "sex": "male",
          "expected": 3610.06155773741,
          "actual": 1998.4756418025577,
          "relative_error": -0.4464150791226138
        },
        {
          "measure": "ASDR",
          "year": 2021,
          "location": "ARE",
          "sex": "male",
          "expected": 988.773938176344,
          "actual": 587.4395500235686,
          "relative_error": -0.4058909449949509
        },
        {
          "measure": "ASDR",
          "year": 2022,
          "location": "ARE",
          "sex": "male",
          "expected": 861.724002572123,
          "actual": 523.2497746704798,
          "relative_error": -0.3927872809523072
        },
        {
          "measure": "ASDR",
          "year": 2021,
          "location": "ARE",
          "sex": "both",
          "expected": 926.053834265358,
          "actual": 563.6895515516678,
          "relative_error": -0.3912993708418206
        },
        {
          "measure": "ASDR",
          "year": 2021,
          "location": "ARE",
          "sex": "female",
          "expected": 847.0342561412,
          "actual": 524.0163237926564,
          "relative_error": -0.3813516749843193
        }
      ]
    },
    "CDR": {
      "pairs": 4440,
      "missing_pairs": 0,
      "signed_difference": {
        "min": -5.229594535194337e-12,
        "p05": -2.7284841053187847e-12,
        "median": 0.0,
        "p95": 2.9558577807620168e-12,
        "max": 5.229594535194337e-12
      },
      "absolute_difference": {
        "min": 0.0,
        "p05": 0.0,
        "median": 3.410605131648481e-13,
        "p95": 3.865352482534945e-12,
        "max": 5.229594535194337e-12
      },
      "relative_difference_percent": {
        "min": -4.825076601470669e-13,
        "p05": -2.3077920246346685e-13,
        "median": 0.0,
        "p95": 2.39541805451977e-13,
        "max": 4.980441146530588e-13
      },
      "absolute_relative_difference_percent": {
        "min": 0.0,
        "p05": 0.0,
        "median": 4.7306002514173545e-14,
        "p95": 3.1013263345306997e-13,
        "max": 4.980441146530588e-13
      },
      "by_year": {
        "2000": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -5.002220859751105e-12,
            "p05": -3.637978807091713e-12,
            "median": 0.0,
            "p95": 3.637978807091713e-12,
            "max": 5.002220859751105e-12
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 3.410605131648481e-13,
            "p95": 4.320099833421409e-12,
            "max": 5.002220859751105e-12
          },
          "relative_difference_percent": {
            "min": -4.734506629169786e-13,
            "p05": -2.763791467403231e-13,
            "median": 0.0,
            "p95": 2.710632354893739e-13,
            "max": 4.980441146530588e-13
          },
          "absolute_relative_difference_percent": {
            "min": 0.0,
            "p05": 0.0,
            "median": 5.590896104475911e-14,
            "p95": 3.203462213140337e-13,
            "max": 4.980441146530588e-13
          }
        },
        "2010": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -4.774847184307873e-12,
            "p05": -3.183231456205249e-12,
            "median": 0.0,
            "p95": 2.7284841053187847e-12,
            "max": 4.320099833421409e-12
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 3.410605131648481e-13,
            "p95": 3.865352482534945e-12,
            "max": 4.774847184307873e-12
          },
          "relative_difference_percent": {
            "min": -4.646673800640524e-13,
            "p05": -2.5504227973089573e-13,
            "median": 0.0,
            "p95": 1.991928017773173e-13,
            "max": 4.12656267665462e-13
          },
          "absolute_relative_difference_percent": {
            "min": 0.0,
            "p05": 0.0,
            "median": 4.415933751034627e-14,
            "p95": 3.2247238039009153e-13,
            "max": 4.646673800640524e-13
          }
        },
        "2015": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -4.774847184307873e-12,
            "p05": -2.0463630789890885e-12,
            "median": 0.0,
            "p95": 2.34194885706528e-12,
            "max": 5.002220859751105e-12
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 3.410605131648481e-13,
            "p95": 3.637978807091713e-12,
            "max": 5.002220859751105e-12
          },
          "relative_difference_percent": {
            "min": -4.463464064376537e-13,
            "p05": -1.695574864204283e-13,
            "median": 0.0,
            "p95": 1.9116529770686523e-13,
            "max": 4.767452117959171e-13
          },
          "absolute_relative_difference_percent": {
            "min": 0.0,
            "p05": 0.0,
            "median": 4.874047675580672e-14,
            "p95": 2.9087299291966436e-13,
            "max": 4.767452117959171e-13
          }
        },
        "2019": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -5.002220859751105e-12,
            "p05": -1.3983481039758768e-12,
            "median": 0.0,
            "p95": 1.6598278307355837e-12,
            "max": 4.774847184307873e-12
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 3.410605131648481e-13,
            "p95": 3.251443558838208e-12,
            "max": 5.002220859751105e-12
          },
          "relative_difference_percent": {
            "min": -4.4936942971505253e-13,
            "p05": -1.3947017314212317e-13,
            "median": 0.0,
            "p95": 1.5591789646321873e-13,
            "max": 4.653931531614623e-13
          },
          "absolute_relative_difference_percent": {
            "min": 0.0,
            "p05": 0.0,
            "median": 4.549057095057091e-14,
            "p95": 2.624793251884571e-13,
            "max": 4.653931531614623e-13
          }
        },
        "2020": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -5.229594535194337e-12,
            "p05": -2.7284841053187847e-12,
            "median": 0.0,
            "p95": 3.024069883394976e-12,
            "max": 5.002220859751105e-12
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 3.410605131648481e-13,
            "p95": 4.092726157978177e-12,
            "max": 5.229594535194337e-12
          },
          "relative_difference_percent": {
            "min": -4.664834553453482e-13,
            "p05": -2.482428317361112e-13,
            "median": 0.0,
            "p95": 2.271176213925701e-13,
            "max": 4.947348471588562e-13
          },
          "absolute_relative_difference_percent": {
            "min": 0.0,
            "p05": 0.0,
            "median": 4.5253836055735484e-14,
            "p95": 3.277376787258969e-13,
            "max": 4.947348471588562e-13
          }
        },
        "2021": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -5.002220859751105e-12,
            "p05": -2.9558577807620168e-12,
            "median": 0.0,
            "p95": 3.251443558838208e-12,
            "max": 5.229594535194337e-12
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 3.410605131648481e-13,
            "p95": 4.092726157978177e-12,
            "max": 5.229594535194337e-12
          },
          "relative_difference_percent": {
            "min": -4.825076601470669e-13,
            "p05": -2.1537306416546482e-13,
            "median": 0.0,
            "p95": 2.587004506877961e-13,
            "max": 4.665773659379726e-13
          },
          "absolute_relative_difference_percent": {
            "min": 0.0,
            "p05": 0.0,
            "median": 4.6752829889682035e-14,
            "p95": 3.1546524130310256e-13,
            "max": 4.825076601470669e-13
          }
        },
        "2022": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -5.002220859751105e-12,
            "p05": -2.7284841053187847e-12,
            "median": 0.0,
            "p95": 3.183231456205249e-12,
            "max": 5.002220859751105e-12
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 3.410605131648481e-13,
            "p95": 3.865352482534945e-12,
            "max": 5.002220859751105e-12
          },
          "relative_difference_percent": {
            "min": -4.586241866744993e-13,
            "p05": -2.226859567545875e-13,
            "median": 0.0,
            "p95": 2.682493764863869e-13,
            "max": 4.595423093986104e-13
          },
          "absolute_relative_difference_percent": {
            "min": 0.0,
            "p05": 0.0,
            "median": 4.8264826496716925e-14,
            "p95": 3.1887884147584794e-13,
            "max": 4.595423093986104e-13
          }
        },
        "2023": {
          "pairs": 555,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -5.002220859751105e-12,
            "p05": -2.7284841053187847e-12,
            "median": 0.0,
            "p95": 1.8189894035458565e-12,
            "max": 5.002220859751105e-12
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 3.410605131648481e-13,
            "p95": 3.410605131648481e-12,
            "max": 5.002220859751105e-12
          },
          "relative_difference_percent": {
            "min": -4.4679881520932114e-13,
            "p05": -2.492230288791988e-13,
            "median": 0.0,
            "p95": 1.7916291379338583e-13,
            "max": 4.5424214462131983e-13
          },
          "absolute_relative_difference_percent": {
            "min": 0.0,
            "p05": 0.0,
            "median": 4.5649773030558146e-14,
            "p95": 2.9130103795561367e-13,
            "max": 4.5424214462131983e-13
          }
        }
      },
      "largest_relative_errors": [
        {
          "measure": "CDR",
          "year": 2000,
          "location": "BEL",
          "sex": "female",
          "expected": 1004.37304900906,
          "actual": 1004.373049009065,
          "relative_error": 4.980441146530588e-15
        },
        {
          "measure": "CDR",
          "year": 2020,
          "location": "ESP",
          "sex": "female",
          "expected": 1011.09127211832,
          "actual": 1011.091272118325,
          "relative_error": 4.947348471588562e-15
        },
        {
          "measure": "CDR",
          "year": 2021,
          "location": "BHS",
          "sex": "female",
          "expected": 1013.15158821302,
          "actual": 1013.1515882130151,
          "relative_error": -4.825076601470669e-15
        },
        {
          "measure": "CDR",
          "year": 2015,
          "location": "ITA",
          "sex": "male",
          "expected": 1049.24406915542,
          "actual": 1049.244069155425,
          "relative_error": 4.7674521179591705e-15
        },
        {
          "measure": "CDR",
          "year": 2020,
          "location": "GBR",
          "sex": "male",
          "expected": 1049.74828927191,
          "actual": 1049.748289271915,
          "relative_error": 4.76516219256768e-15
        }
      ]
    }
  },
  "unallocated_global_percent": [
    {
      "measure": "dalys",
      "year": 2000,
      "share_percent": 5.618575627931585
    },
    {
      "measure": "dalys",
      "year": 2010,
      "share_percent": 6.101779959188688
    },
    {
      "measure": "dalys",
      "year": 2015,
      "share_percent": 6.270144023942224
    },
    {
      "measure": "dalys",
      "year": 2019,
      "share_percent": 6.494717408778534
    },
    {
      "measure": "dalys",
      "year": 2020,
      "share_percent": 6.246927443779471
    },
    {
      "measure": "dalys",
      "year": 2021,
      "share_percent": 5.954027691949655
    },
    {
      "measure": "dalys",
      "year": 2022,
      "share_percent": 6.408309995967615
    },
    {
      "measure": "dalys",
      "year": 2023,
      "share_percent": 6.495589127753995
    },
    {
      "measure": "deaths",
      "year": 2000,
      "share_percent": 5.258421051124252
    },
    {
      "measure": "deaths",
      "year": 2010,
      "share_percent": 5.781794031043918
    },
    {
      "measure": "deaths",
      "year": 2015,
      "share_percent": 6.003403263590797
    },
    {
      "measure": "deaths",
      "year": 2019,
      "share_percent": 6.332734511887902
    },
    {
      "measure": "deaths",
      "year": 2020,
      "share_percent": 5.912353339638803
    },
    {
      "measure": "deaths",
      "year": 2021,
      "share_percent": 5.55155426632502
    },
    {
      "measure": "deaths",
      "year": 2022,
      "share_percent": 6.225348450281966
    },
    {
      "measure": "deaths",
      "year": 2023,
      "share_percent": 6.309554478079908
    }
  ],
  "reconciliation_failures": [],
  "published_cause_rates": {
    "rows": 1900320,
    "years": {
      "ASDR": [
        2000,
        2010,
        2015,
        2019,
        2020,
        2021,
        2022,
        2023
      ],
      "CDR": [
        2000,
        2010,
        2015,
        2019,
        2020,
        2021,
        2022,
        2023
      ]
    },
    "source_causes": 214,
    "absent_nonprimary_descendants": [
      {
        "code": 261,
        "name": "Visceral leishmaniasis",
        "relation": "none"
      },
      {
        "code": 262,
        "name": "Cutaneous and mucocutaneous leishmaniasis",
        "relation": "none"
      },
      {
        "code": 831,
        "name": "Major depressive disorder",
        "relation": "none"
      },
      {
        "code": 832,
        "name": "Dysthymia",
        "relation": "none"
      }
    ],
    "cause_level_crude_comparison": {
      "pairs": 950160,
      "missing_pairs": 0,
      "signed_difference": {
        "min": -5.229594535194337e-12,
        "p05": -2.1316282072803006e-14,
        "median": 0.0,
        "p95": 2.1316282072803006e-14,
        "max": 5.229594535194337e-12
      },
      "absolute_difference": {
        "min": 0.0,
        "p05": 0.0,
        "median": 2.220446049250313e-16,
        "p95": 4.263256414560601e-14,
        "max": 5.229594535194337e-12
      },
      "relative_difference_percent": {
        "min": -5.29256702920737e-13,
        "p05": -2.3261666076643685e-13,
        "median": 0.0,
        "p95": 2.335647409037152e-13,
        "max": 5.210092580822771e-13
      },
      "absolute_relative_difference_percent": {
        "min": 0.0,
        "p05": 0.0,
        "median": 6.63632017506778e-14,
        "p95": 2.974918867587076e-13,
        "max": 5.29256702920737e-13
      },
      "outside_tolerance": 0
    },
    "primary_partition": {
      "ASDR": {
        "pairs": 4440,
        "missing_pairs": 0,
        "signed_difference": {
          "min": -3.554836450168523,
          "p05": -4.547473508864641e-12,
          "median": 0.0,
          "p95": 4.547473508864641e-12,
          "max": 8.640199666842818e-12
        },
        "absolute_difference": {
          "min": 0.0,
          "p05": 1.1368683772161603e-13,
          "median": 1.5916157281026244e-12,
          "p95": 5.002220859751105e-12,
          "max": 3.554836450168523
        },
        "relative_difference_percent": {
          "min": -0.2453642005667429,
          "p05": -2.957733294526211e-13,
          "median": 0.0,
          "p95": 2.8102382594776075e-13,
          "max": 5.218031396492187e-13
        },
        "absolute_relative_difference_percent": {
          "min": 0.0,
          "p05": 1.1644628052566442e-14,
          "median": 1.0560240259443385e-13,
          "p95": 3.4646688075009534e-13,
          "max": 0.2453642005667429
        },
        "outside_tolerance": 19,
        "source_exceptions": {
          "explained_counts": {
            "pinned_all_causes_defect": 19
          },
          "unexplained_count": 0,
          "unexplained_examples": []
        }
      },
      "CDR": {
        "pairs": 4440,
        "missing_pairs": 0,
        "signed_difference": {
          "min": -3.767968499787912,
          "p05": -3.410605131648481e-12,
          "median": 0.0,
          "p95": 3.296918293926865e-12,
          "max": 9.208633855450898e-12
        },
        "absolute_difference": {
          "min": 0.0,
          "p05": 5.684341886080802e-14,
          "median": 7.958078640513122e-13,
          "p95": 4.547473508864641e-12,
          "max": 3.767968499787912
        },
        "relative_difference_percent": {
          "min": -0.3474501702459215,
          "p05": -3.354967017478088e-13,
          "median": 0.0,
          "p95": 3.3164011898435506e-13,
          "max": 9.083006093051246e-13
        },
        "absolute_relative_difference_percent": {
          "min": 0.0,
          "p05": 1.220874937904865e-14,
          "median": 1.1426875239654308e-13,
          "p95": 4.053826786735659e-13,
          "max": 0.3474501702459215
        },
        "outside_tolerance": 19,
        "source_exceptions": {
          "explained_counts": {
            "pinned_all_causes_defect": 19
          },
          "unexplained_count": 0,
          "unexplained_examples": []
        }
      }
    },
    "failures": []
  },
  "deaths_asdr_methods": {
    "path": "data/interim/deaths_asdr_method_comparison.parquet",
    "rows": 137640,
    "bytes": 3775383,
    "difference_definition": "broad_bin - published_sum",
    "relative_difference_definition": "(broad_bin - published_sum) / published_sum; null when published_sum=0",
    "by_organ": [
      {
        "organ": "bladder",
        "rows": 4440,
        "relative_pairs": 4388,
        "relative_difference_percent": {
          "min": -60.77094436435988,
          "p05": -19.962708784157044,
          "median": -5.196741449374143,
          "p95": 8.047084912330483,
          "max": 40.480434853479416
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -8.397939313307937,
            "p05": -1.4474258621021794,
            "median": -0.13403025174784033,
            "p95": 0.21386776927929266,
            "max": 2.5851988277973845
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.010373969616984184,
            "median": 0.1841762083256996,
            "p95": 1.4497534488780577,
            "max": 8.397939313307937
          },
          "relative_difference_percent": {
            "min": -60.77094436435988,
            "p05": -19.962708784157044,
            "median": -5.196741449374143,
            "p95": 8.047084912330483,
            "max": 40.480434853479416
          },
          "absolute_relative_difference_percent": {
            "min": 0.003998805004572429,
            "p05": 0.6276344667782398,
            "median": 6.3748405808464685,
            "p95": 21.084006547991866,
            "max": 60.77094436435988
          }
        }
      },
      {
        "organ": "blood_immune",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -51.13650793678182,
          "p05": -14.79912238080051,
          "median": -4.32093955258451,
          "p95": 2.991937551782054,
          "max": 20.908276540612654
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -12.642610161950628,
            "p05": -3.961490814402031,
            "median": -0.662070345001621,
            "p95": 0.45106072571351563,
            "max": 5.1494191074642615
          },
          "absolute_difference": {
            "min": 7.553747415656176e-05,
            "p05": 0.04986776531986719,
            "median": 0.7579770130922032,
            "p95": 3.966239439899001,
            "max": 12.642610161950628
          },
          "relative_difference_percent": {
            "min": -51.13650793678182,
            "p05": -14.79912238080051,
            "median": -4.32093955258451,
            "p95": 2.991937551782054,
            "max": 20.908276540612654
          },
          "absolute_relative_difference_percent": {
            "min": 0.0008709809556782568,
            "p05": 0.3899080292805229,
            "median": 4.7120741972602485,
            "p95": 14.850521414507313,
            "max": 51.13650793678182
          }
        }
      },
      {
        "organ": "bones_joints",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -60.29094287147917,
          "p05": -28.752796129406427,
          "median": -10.972809777790424,
          "p95": 5.106672107943895,
          "max": 37.63584199504852
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -12.68933701951031,
            "p05": -1.2300616720259068,
            "median": -0.18217206698998445,
            "p95": 0.18882744603038773,
            "max": 2.3445072607210715
          },
          "absolute_difference": {
            "min": 6.905750290522828e-07,
            "p05": 0.008292607089269634,
            "median": 0.21059631782491658,
            "p95": 1.246693853994045,
            "max": 12.68933701951031
          },
          "relative_difference_percent": {
            "min": -60.29094287147917,
            "p05": -28.752796129406427,
            "median": -10.972809777790424,
            "p95": 5.106672107943895,
            "max": 37.63584199504852
          },
          "absolute_relative_difference_percent": {
            "min": 0.0017053950995593098,
            "p05": 0.8215690092223206,
            "median": 11.510405840255556,
            "p95": 28.79591442712218,
            "max": 60.29094287147917
          }
        }
      },
      {
        "organ": "brain",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -52.13280143095845,
          "p05": -28.594566291169528,
          "median": -15.016296843037606,
          "p95": 6.471762343753416,
          "max": 31.85824953409724
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -313.1077601099438,
            "p05": -101.85284995053875,
            "median": -36.80560000968616,
            "p95": 8.205770916348316,
            "max": 34.28172268823373
          },
          "absolute_difference": {
            "min": 0.04512205783311174,
            "p05": 2.562467069078305,
            "median": 36.80560000968616,
            "p95": 101.85284995053877,
            "max": 313.1077601099438
          },
          "relative_difference_percent": {
            "min": -52.13280143095845,
            "p05": -28.594566291169528,
            "median": -15.016296843037606,
            "p95": 6.471762343753416,
            "max": 31.85824953409724
          },
          "absolute_relative_difference_percent": {
            "min": 0.03101909745753846,
            "p05": 1.9532065372217404,
            "median": 15.445239766661116,
            "p95": 28.62138857476062,
            "max": 52.13280143095845
          }
        }
      },
      {
        "organ": "breast",
        "rows": 4440,
        "relative_pairs": 4404,
        "relative_difference_percent": {
          "min": -58.18012690540897,
          "p05": -13.947702614249566,
          "median": -3.1160459194117656,
          "p95": 2.977854240728417,
          "max": 41.25438438031293
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -9.235477224627353,
            "p05": -1.4430883599543385,
            "median": -0.16381738252522982,
            "p95": 0.4419402415514949,
            "max": 2.4051315103553286
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.006291309560928548,
            "median": 0.23919064958952507,
            "p95": 1.6006419407153563,
            "max": 9.235477224627353
          },
          "relative_difference_percent": {
            "min": -58.18012690540897,
            "p05": -13.947702614249566,
            "median": -3.1160459194117656,
            "p95": 2.977854240728417,
            "max": 41.25438438031293
          },
          "absolute_relative_difference_percent": {
            "min": 0.0004620363711329554,
            "p05": 0.40421375888695027,
            "median": 3.539009496283949,
            "p95": 14.123597066973351,
            "max": 58.18012690540897
          }
        }
      },
      {
        "organ": "colon_rectum",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -39.96401066650342,
          "p05": -14.706243447483695,
          "median": -3.99453814804564,
          "p95": 3.929106778492403,
          "max": 19.881768771355414
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -14.860913461860878,
            "p05": -2.8361183262909466,
            "median": -0.4807735393440753,
            "p95": 0.6595827126067216,
            "max": 7.57395284797547
          },
          "absolute_difference": {
            "min": 0.0003053101888177423,
            "p05": 0.05944604413140079,
            "median": 0.5777773279458112,
            "p95": 2.8656418642766535,
            "max": 14.860913461860878
          },
          "relative_difference_percent": {
            "min": -39.96401066650342,
            "p05": -14.706243447483695,
            "median": -3.99453814804564,
            "p95": 3.929106778492403,
            "max": 19.881768771355414
          },
          "absolute_relative_difference_percent": {
            "min": 0.0012159148256417956,
            "p05": 0.44132372648808177,
            "median": 4.426713887414243,
            "p95": 14.770326210076426,
            "max": 39.96401066650342
          }
        }
      },
      {
        "organ": "congenital",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -21.224743417600283,
          "p05": -6.991618236311884,
          "median": -0.3866699550485788,
          "p95": 4.732605067356409,
          "max": 12.2593524696562
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -4.094041332710063,
            "p05": -0.3858610512535929,
            "median": -0.015613333817590003,
            "p95": 0.3278641717424407,
            "max": 1.17560806969672
          },
          "absolute_difference": {
            "min": 3.3310604716341174e-05,
            "p05": 0.0096674161781513,
            "median": 0.1089450272226058,
            "p95": 0.4728785055386169,
            "max": 4.094041332710063
          },
          "relative_difference_percent": {
            "min": -21.224743417600283,
            "p05": -6.991618236311884,
            "median": -0.3866699550485788,
            "p95": 4.732605067356409,
            "max": 12.2593524696562
          },
          "absolute_relative_difference_percent": {
            "min": 0.0006256898498641759,
            "p05": 0.18972935298310373,
            "median": 2.0289862519699,
            "p95": 7.4724832779979105,
            "max": 21.224743417600283
          }
        }
      },
      {
        "organ": "diabetes_endocrine",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -47.85291938571849,
          "p05": -21.8275037765489,
          "median": -8.582572664926143,
          "p95": 4.042605254542657,
          "max": 23.184045574392155
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -271.57840135508513,
            "p05": -22.73666663500439,
            "median": -5.639405861110461,
            "p95": 0.8251420731717213,
            "max": 11.32462882063001
          },
          "absolute_difference": {
            "min": 0.0008133772788054827,
            "p05": 0.1554907854501888,
            "median": 5.665319307946472,
            "p95": 22.736666635004397,
            "max": 271.57840135508513
          },
          "relative_difference_percent": {
            "min": -47.85291938571849,
            "p05": -21.8275037765489,
            "median": -8.582572664926143,
            "p95": 4.042605254542657,
            "max": 23.184045574392155
          },
          "absolute_relative_difference_percent": {
            "min": 0.008380351781448605,
            "p05": 0.8304966026934765,
            "median": 9.034445735064072,
            "p95": 21.98579064418585,
            "max": 47.85291938571849
          }
        }
      },
      {
        "organ": "ears",
        "rows": 4440,
        "relative_pairs": 4356,
        "relative_difference_percent": {
          "min": -70.58539555278418,
          "p05": -19.075111256685947,
          "median": -5.770721317500053,
          "p95": 4.603857826079096,
          "max": 51.61525602765258
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -1.2450500185075297,
            "p05": -0.024619560459946985,
            "median": -6.819395310138154e-05,
            "p95": 0.0007354320818402746,
            "max": 0.10400233635104694
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 1.5579067985922683e-07,
            "median": 0.00012747942460552273,
            "p95": 0.025166160608868345,
            "max": 1.2450500185075297
          },
          "relative_difference_percent": {
            "min": -70.58539555278418,
            "p05": -19.075111256685947,
            "median": -5.770721317500053,
            "p95": 4.603857826079096,
            "max": 51.61525602765258
          },
          "absolute_relative_difference_percent": {
            "min": 0.0009701623329885078,
            "p05": 0.4810601484443196,
            "median": 6.440906158315377,
            "p95": 19.55615604899346,
            "max": 70.58539555278418
          }
        }
      },
      {
        "organ": "esophagus",
        "rows": 4440,
        "relative_pairs": 4377,
        "relative_difference_percent": {
          "min": -54.94170251717059,
          "p05": -16.718907903986473,
          "median": -2.4303089125445454,
          "p95": 5.6520535090715205,
          "max": 24.52393807431142
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -6.040031581973164,
            "p05": -0.9415090718185384,
            "median": -0.07695210399223329,
            "p95": 0.12663943123252241,
            "max": 12.71002115206106
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.005268289668381681,
            "median": 0.10815333695083623,
            "p95": 0.9572909768427222,
            "max": 12.71002115206106
          },
          "relative_difference_percent": {
            "min": -54.94170251717059,
            "p05": -16.718907903986473,
            "median": -2.4303089125445454,
            "p95": 5.6520535090715205,
            "max": 24.52393807431142
          },
          "absolute_relative_difference_percent": {
            "min": 0.0013028558147461498,
            "p05": 0.26124361369985605,
            "median": 3.5167396617816324,
            "p95": 17.100386776741214,
            "max": 54.94170251717059
          }
        }
      },
      {
        "organ": "eyes",
        "rows": 4440,
        "relative_pairs": 335,
        "relative_difference_percent": {
          "min": -57.547548745865974,
          "p05": -35.84268789863073,
          "median": -0.7319177118006953,
          "p95": 27.69045225971592,
          "max": 51.687420648787295
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -0.09646050383994603,
            "p05": 0.0,
            "median": 0.0,
            "p95": 0.0,
            "max": 0.029400984224977667
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 0.0,
            "p95": 0.0005503448013059849,
            "max": 0.09646050383994603
          },
          "relative_difference_percent": {
            "min": -57.547548745865974,
            "p05": -35.84268789863073,
            "median": -0.7319177118006953,
            "p95": 27.69045225971592,
            "max": 51.687420648787295
          },
          "absolute_relative_difference_percent": {
            "min": 0.04236571061009865,
            "p05": 0.8156229547024637,
            "median": 10.711458826033367,
            "p95": 37.52070983195273,
            "max": 57.547548745865974
          }
        }
      },
      {
        "organ": "gallbladder",
        "rows": 4440,
        "relative_pairs": 4435,
        "relative_difference_percent": {
          "min": -41.696136823624826,
          "p05": -26.26219094607365,
          "median": -10.378100204124442,
          "p95": 3.8763672328242547,
          "max": 26.696379698809338
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -5.578672361289321,
            "p05": -1.902598533635577,
            "median": -0.4982555784663041,
            "p95": 0.18239116604193395,
            "max": 2.3255780730544267
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.034060087643469336,
            "median": 0.5267463839119424,
            "p95": 1.9195174639022274,
            "max": 5.578672361289321
          },
          "relative_difference_percent": {
            "min": -41.696136823624826,
            "p05": -26.26219094607365,
            "median": -10.378100204124442,
            "p95": 3.8763672328242547,
            "max": 26.696379698809338
          },
          "absolute_relative_difference_percent": {
            "min": 0.0020031092844611962,
            "p05": 0.9223048362434156,
            "median": 10.817069007821525,
            "p95": 26.29087180708995,
            "max": 41.696136823624826
          }
        }
      },
      {
        "organ": "heart",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -47.61117620036413,
          "p05": -26.980142085422035,
          "median": -14.334409733310405,
          "p95": 6.559366455826227,
          "max": 35.34369601118051
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -504.2360832708606,
            "p05": -124.15552565225742,
            "median": -40.90479822760932,
            "p95": 8.258301211418162,
            "max": 44.43020148239265
          },
          "absolute_difference": {
            "min": 0.05289169054819354,
            "p05": 2.92447756968181,
            "median": 40.961777278616594,
            "p95": 124.15552565225744,
            "max": 504.2360832708606
          },
          "relative_difference_percent": {
            "min": -47.61117620036413,
            "p05": -26.980142085422035,
            "median": -14.334409733310405,
            "p95": 6.559366455826227,
            "max": 35.34369601118051
          },
          "absolute_relative_difference_percent": {
            "min": 0.020009924934759143,
            "p05": 1.9070924591058405,
            "median": 14.863029331697696,
            "p95": 27.27914277664437,
            "max": 47.61117620036413
          }
        }
      },
      {
        "organ": "infections_systemic",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -55.11711047122212,
          "p05": -13.957744404916907,
          "median": -2.0935786053974805,
          "p95": 4.367561594284696,
          "max": 26.52746722989819
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -54.37809895011036,
            "p05": -5.058470222584022,
            "median": -0.3240256066370195,
            "p95": 1.4014270996035882,
            "max": 10.679418496718995
          },
          "absolute_difference": {
            "min": 1.432589256467054e-05,
            "p05": 0.025172359992208706,
            "median": 0.5432705106746383,
            "p95": 5.542676769447051,
            "max": 54.37809895011036
          },
          "relative_difference_percent": {
            "min": -55.11711047122212,
            "p05": -13.957744404916907,
            "median": -2.0935786053974805,
            "p95": 4.367561594284696,
            "max": 26.52746722989819
          },
          "absolute_relative_difference_percent": {
            "min": 0.0001877548315306224,
            "p05": 0.200832150063557,
            "median": 2.8978392362123198,
            "p95": 15.388799362292268,
            "max": 55.11711047122212
          }
        }
      },
      {
        "organ": "injuries",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -30.3079135631354,
          "p05": -14.414480289846747,
          "median": -4.936736589950948,
          "p95": 3.4166833730412054,
          "max": 20.38851396609008
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -39.81585022075933,
            "p05": -18.29199718887012,
            "median": -2.9956465903532834,
            "p95": 1.1053057507520725,
            "max": 33.88932310581413
          },
          "absolute_difference": {
            "min": 0.0009148335017812315,
            "p05": 0.18465855278188564,
            "median": 3.129477943796406,
            "p95": 18.39069052489481,
            "max": 39.81585022075933
          },
          "relative_difference_percent": {
            "min": -30.3079135631354,
            "p05": -14.414480289846747,
            "median": -4.936736589950948,
            "p95": 3.4166833730412054,
            "max": 20.38851396609008
          },
          "absolute_relative_difference_percent": {
            "min": 0.0051944904081747565,
            "p05": 0.4695022430069482,
            "median": 5.3708058900383575,
            "p95": 14.688614355971346,
            "max": 30.3079135631354
          }
        }
      },
      {
        "organ": "kidneys",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -50.79121396607942,
          "p05": -26.011175385997994,
          "median": -11.12702646533647,
          "p95": 4.966319789346633,
          "max": 28.478937614944357
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -104.45681207489218,
            "p05": -22.23165814960516,
            "median": -5.07040577891237,
            "p95": 0.8345572211491104,
            "max": 5.314876494162995
          },
          "absolute_difference": {
            "min": 0.0008373351045989352,
            "p05": 0.21729282733539662,
            "median": 5.07270394551189,
            "p95": 22.231658149605167,
            "max": 104.45681207489218
          },
          "relative_difference_percent": {
            "min": -50.79121396607942,
            "p05": -26.011175385997994,
            "median": -11.12702646533647,
            "p95": 4.966319789346633,
            "max": 28.478937614944357
          },
          "absolute_relative_difference_percent": {
            "min": 0.0035868690986782695,
            "p05": 1.0543650023808677,
            "median": 11.669971838648603,
            "p95": 26.06246655122753,
            "max": 50.79121396607942
          }
        }
      },
      {
        "organ": "liver",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -46.38065895118975,
          "p05": -12.829817213925894,
          "median": -3.916349580825309,
          "p95": 1.5920150603079604,
          "max": 14.084049221626177
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -52.73026250957383,
            "p05": -7.38225122703764,
            "median": -1.4745969787242306,
            "p95": 0.35144764544615587,
            "max": 3.952128815149308
          },
          "absolute_difference": {
            "min": 0.00034004861923264684,
            "p05": 0.04159729184311241,
            "median": 1.5054723312237943,
            "p95": 7.382251227037642,
            "max": 52.73026250957383
          },
          "relative_difference_percent": {
            "min": -46.38065895118975,
            "p05": -12.829817213925894,
            "median": -3.916349580825309,
            "p95": 1.5920150603079604,
            "max": 14.084049221626177
          },
          "absolute_relative_difference_percent": {
            "min": 0.0034558251723795694,
            "p05": 0.2188544677061315,
            "median": 4.056921757669722,
            "p95": 12.853404987291396,
            "max": 46.38065895118975
          }
        }
      },
      {
        "organ": "lungs",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -56.57724221371573,
          "p05": -23.327489858227157,
          "median": -11.76406020688141,
          "p95": 3.7845416384234407,
          "max": 27.212242897238582
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -430.29024999936905,
            "p05": -126.39110117313919,
            "median": -29.176522848557426,
            "p95": 4.14825864837547,
            "max": 30.565241595735927
          },
          "absolute_difference": {
            "min": 0.0009974366273439728,
            "p05": 1.2595137306427946,
            "median": 29.2026856297702,
            "p95": 126.39110117313923,
            "max": 430.29024999936905
          },
          "relative_difference_percent": {
            "min": -56.57724221371573,
            "p05": -23.327489858227157,
            "median": -11.76406020688141,
            "p95": 3.7845416384234407,
            "max": 27.212242897238582
          },
          "absolute_relative_difference_percent": {
            "min": 0.0009241194699587174,
            "p05": 1.1237591563320748,
            "median": 12.043437278776798,
            "p95": 23.333545199553047,
            "max": 56.57724221371573
          }
        }
      },
      {
        "organ": "maternal_neonatal",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -26.11668230882739,
          "p05": -9.814475581150015,
          "median": -0.3383511399254052,
          "p95": 6.6183391446508635,
          "max": 18.809874916560126
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -5.280177366301174,
            "p05": -0.770916969972136,
            "median": -0.023838030909121954,
            "p95": 3.029683843739713,
            "max": 10.969555874876718
          },
          "absolute_difference": {
            "min": 0.0001810535179416206,
            "p05": 0.02421936971511614,
            "median": 0.2990246880740155,
            "p95": 3.0448048741327836,
            "max": 10.969555874876718
          },
          "relative_difference_percent": {
            "min": -26.11668230882739,
            "p05": -9.814475581150015,
            "median": -0.3383511399254052,
            "p95": 6.6183391446508635,
            "max": 18.809874916560126
          },
          "absolute_relative_difference_percent": {
            "min": 0.0013025985502350785,
            "p05": 0.28413826447846424,
            "median": 2.956725698774407,
            "p95": 10.75730981936494,
            "max": 26.11668230882739
          }
        }
      },
      {
        "organ": "mental_substance",
        "rows": 4440,
        "relative_pairs": 4429,
        "relative_difference_percent": {
          "min": -40.64468437650332,
          "p05": -9.90204057677345,
          "median": -1.5277841250250659,
          "p95": 2.6126796597177995,
          "max": 35.312635646612605
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -3.3704296025366602,
            "p05": -0.4019987094653083,
            "median": -0.01924985431833337,
            "p95": 0.15062057909468643,
            "max": 1.6592727078922067
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0026483658157968387,
            "median": 0.04908653100304283,
            "p95": 0.4574857342824988,
            "max": 3.3704296025366602
          },
          "relative_difference_percent": {
            "min": -40.64468437650332,
            "p05": -9.90204057677345,
            "median": -1.5277841250250659,
            "p95": 2.6126796597177995,
            "max": 35.312635646612605
          },
          "absolute_relative_difference_percent": {
            "min": 0.006440715406733708,
            "p05": 0.17255753842872648,
            "median": 2.1799250401182118,
            "p95": 10.36491669158586,
            "max": 40.64468437650332
          }
        }
      },
      {
        "organ": "muscles",
        "rows": 4440,
        "relative_pairs": 0,
        "relative_difference_percent": {},
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 0.0,
            "p95": 0.0,
            "max": 0.0
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 0.0,
            "p95": 0.0,
            "max": 0.0
          },
          "relative_difference_percent": {},
          "absolute_relative_difference_percent": {}
        }
      },
      {
        "organ": "other_unallocated",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -45.53388537657851,
          "p05": -24.011854820465018,
          "median": -12.154909846849481,
          "p95": 5.3010636832178095,
          "max": 28.34527247858914
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -117.59431301618201,
            "p05": -27.813183679603544,
            "median": -9.60359425256766,
            "p95": 3.3594979472945994,
            "max": 20.397516451892685
          },
          "absolute_difference": {
            "min": 0.02375990618461543,
            "p05": 0.9151795692381495,
            "median": 9.846636976706826,
            "p95": 27.813183679603547,
            "max": 117.59431301618201
          },
          "relative_difference_percent": {
            "min": -45.53388537657851,
            "p05": -24.011854820465018,
            "median": -12.154909846849481,
            "p95": 5.3010636832178095,
            "max": 28.34527247858914
          },
          "absolute_relative_difference_percent": {
            "min": 0.03227587316592152,
            "p05": 1.347813642312676,
            "median": 12.439353988902782,
            "p95": 24.13823142577326,
            "max": 45.53388537657851
          }
        }
      },
      {
        "organ": "ovaries",
        "rows": 4440,
        "relative_pairs": 2960,
        "relative_difference_percent": {
          "min": -30.5297389799034,
          "p05": -7.813169815595651,
          "median": -0.7510064777419505,
          "p95": 2.8637627096556524,
          "max": 11.934441921026306
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -1.6483574914432513,
            "p05": -0.22504902532032361,
            "median": 0.0,
            "p95": 0.12871032316215247,
            "max": 0.7162400643815321
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 0.028446916938519584,
            "p95": 0.25694714916081457,
            "max": 1.6483574914432513
          },
          "relative_difference_percent": {
            "min": -30.5297389799034,
            "p05": -7.813169815595651,
            "median": -0.7510064777419505,
            "p95": 2.8637627096556524,
            "max": 11.934441921026306
          },
          "absolute_relative_difference_percent": {
            "min": 0.0011558965891967307,
            "p05": 0.14778900065679684,
            "median": 1.593553825464212,
            "p95": 8.388454283590399,
            "max": 30.5297389799034
          }
        }
      },
      {
        "organ": "pancreas",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -27.899404207301664,
          "p05": -15.68311524872615,
          "median": -4.369114687624438,
          "p95": 2.3661087296349153,
          "max": 17.155280184752637
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -4.110535844929256,
            "p05": -1.500736305128873,
            "median": -0.3235936089453073,
            "p95": 0.2878966383308802,
            "max": 2.4572852207373366
          },
          "absolute_difference": {
            "min": 8.287146726004835e-05,
            "p05": 0.03347714304356689,
            "median": 0.35653721855065434,
            "p95": 1.5083868855456077,
            "max": 4.110535844929256
          },
          "relative_difference_percent": {
            "min": -27.899404207301664,
            "p05": -15.68311524872615,
            "median": -4.369114687624438,
            "p95": 2.3661087296349153,
            "max": 17.155280184752637
          },
          "absolute_relative_difference_percent": {
            "min": 0.0010032168047548764,
            "p05": 0.29962156223894065,
            "median": 4.681529748556754,
            "p95": 15.688177725213256,
            "max": 27.899404207301664
          }
        }
      },
      {
        "organ": "prostate",
        "rows": 4440,
        "relative_pairs": 2961,
        "relative_difference_percent": {
          "min": -49.459151136551654,
          "p05": -26.839895777040546,
          "median": -9.12791803820738,
          "p95": 1.1717801553263745,
          "max": 25.55377189282052
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -77.3456788621399,
            "p05": -10.243459969657206,
            "median": -0.5220592109761935,
            "p95": 0.0,
            "max": 2.5375548377893153
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 0.5946827796884904,
            "p95": 10.24345996965721,
            "max": 77.3456788621399
          },
          "relative_difference_percent": {
            "min": -49.459151136551654,
            "p05": -26.839895777040546,
            "median": -9.12791803820738,
            "p95": 1.1717801553263745,
            "max": 25.55377189282052
          },
          "absolute_relative_difference_percent": {
            "min": 0.009219666010921761,
            "p05": 1.0996093903606614,
            "median": 9.194825013102438,
            "p95": 26.839895777040546,
            "max": 49.459151136551654
          }
        }
      },
      {
        "organ": "skin",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -50.49605741416089,
          "p05": -29.392506990765195,
          "median": -12.498394172872342,
          "p95": 4.762868215952096,
          "max": 29.479100012761926
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -31.72272802366472,
            "p05": -3.7934433358155237,
            "median": -0.7849037339130938,
            "p95": 0.25756423642684917,
            "max": 3.663439948506941
          },
          "absolute_difference": {
            "min": 0.00027173581066630703,
            "p05": 0.06150364788173734,
            "median": 0.8091200988574756,
            "p95": 3.7934433358155246,
            "max": 31.72272802366472
          },
          "relative_difference_percent": {
            "min": -50.49605741416089,
            "p05": -29.392506990765195,
            "median": -12.498394172872342,
            "p95": 4.762868215952096,
            "max": 29.479100012761926
          },
          "absolute_relative_difference_percent": {
            "min": 0.0034092496757575333,
            "p05": 1.19998661954753,
            "median": 12.860163948744495,
            "p95": 29.43747394192035,
            "max": 50.49605741416089
          }
        }
      },
      {
        "organ": "small_intestine",
        "rows": 4440,
        "relative_pairs": 4400,
        "relative_difference_percent": {
          "min": -50.87887877824517,
          "p05": -29.007303021270285,
          "median": -12.644055245664305,
          "p95": 7.033073970904671,
          "max": 32.445519769319944
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -81.45388621598266,
            "p05": -31.752874903007964,
            "median": -0.6149342237154181,
            "p95": 0.12338663774911515,
            "max": 3.775581932778877
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0062990448442781805,
            "median": 0.6261232981692637,
            "p95": 31.752874903007974,
            "max": 81.45388621598266
          },
          "relative_difference_percent": {
            "min": -50.87887877824517,
            "p05": -29.007303021270285,
            "median": -12.644055245664305,
            "p95": 7.033073970904671,
            "max": 32.445519769319944
          },
          "absolute_relative_difference_percent": {
            "min": 0.011633532935513072,
            "p05": 1.288188524596472,
            "median": 13.444868890388033,
            "p95": 29.03845027795947,
            "max": 50.87887877824517
          }
        }
      },
      {
        "organ": "stomach",
        "rows": 4440,
        "relative_pairs": 4440,
        "relative_difference_percent": {
          "min": -52.150172632723,
          "p05": -19.585184920977827,
          "median": -7.37219374047413,
          "p95": 2.9001023276880775,
          "max": 18.306507569709133
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -50.9220900496387,
            "p05": -6.2945027170822545,
            "median": -1.3603613964384156,
            "p95": 0.2946036263706697,
            "max": 21.133404006921126
          },
          "absolute_difference": {
            "min": 0.00024016546114946635,
            "p05": 0.07127062776743216,
            "median": 1.3920420387310406,
            "p95": 6.324232618231907,
            "max": 50.9220900496387
          },
          "relative_difference_percent": {
            "min": -52.150172632723,
            "p05": -19.585184920977827,
            "median": -7.37219374047413,
            "p95": 2.9001023276880775,
            "max": 18.306507569709133
          },
          "absolute_relative_difference_percent": {
            "min": 0.0038725756364023436,
            "p05": 0.6131769124404965,
            "median": 7.604190283435155,
            "p95": 19.58518492097783,
            "max": 52.150172632723
          }
        }
      },
      {
        "organ": "testes",
        "rows": 4440,
        "relative_pairs": 2676,
        "relative_difference_percent": {
          "min": -49.898384308516405,
          "p05": -16.353451544833202,
          "median": 0.3309917181138722,
          "p95": 14.886048995564199,
          "max": 51.64868779967187
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -0.5899380961941154,
            "p05": -0.03290917169057151,
            "median": 0.0,
            "p95": 0.020531490751262087,
            "max": 0.556680483609699
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 0.00143022532473161,
            "p95": 0.05549812531357398,
            "max": 0.5899380961941154
          },
          "relative_difference_percent": {
            "min": -49.898384308516405,
            "p05": -16.353451544833202,
            "median": 0.3309917181138722,
            "p95": 14.886048995564199,
            "max": 51.64868779967187
          },
          "absolute_relative_difference_percent": {
            "min": 0.0016032740697572384,
            "p05": 0.2569699217716334,
            "median": 3.216425324710578,
            "p95": 20.509794056101747,
            "max": 51.64868779967187
          }
        }
      },
      {
        "organ": "thyroid",
        "rows": 4440,
        "relative_pairs": 4273,
        "relative_difference_percent": {
          "min": -44.82095879933191,
          "p05": -16.97055415091831,
          "median": -1.8709939024776912,
          "p95": 11.737494337884641,
          "max": 41.31540364357502
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -1.6432196455261545,
            "p05": -0.20517677282891308,
            "median": -0.010662070091550124,
            "p95": 0.07592653878597555,
            "max": 0.7434667179527099
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0003889162278155306,
            "median": 0.027454490279143928,
            "p95": 0.2201429224940857,
            "max": 1.6432196455261545
          },
          "relative_difference_percent": {
            "min": -44.82095879933191,
            "p05": -16.97055415091831,
            "median": -1.8709939024776912,
            "p95": 11.737494337884641,
            "max": 41.31540364357502
          },
          "absolute_relative_difference_percent": {
            "min": 0.002930056004984406,
            "p05": 0.33775980293670055,
            "median": 4.420228226877447,
            "p95": 19.363910275365562,
            "max": 44.82095879933191
          }
        }
      },
      {
        "organ": "uterus_cervix",
        "rows": 4440,
        "relative_pairs": 2961,
        "relative_difference_percent": {
          "min": -23.609360383053264,
          "p05": -6.850370084892314,
          "median": -1.3530372457476,
          "p95": 2.8195781899898353,
          "max": 7.389863387453493
        },
        "comparison": {
          "pairs": 4440,
          "missing_pairs": 0,
          "signed_difference": {
            "min": -6.712856170874836,
            "p05": -1.437844347477875,
            "median": 0.0,
            "p95": 0.1760062712886174,
            "max": 1.2007444886864427
          },
          "absolute_difference": {
            "min": 0.0,
            "p05": 0.0,
            "median": 0.07038763337276688,
            "p95": 1.4378443474778781,
            "max": 6.712856170874836
          },
          "relative_difference_percent": {
            "min": -23.609360383053264,
            "p05": -6.850370084892314,
            "median": -1.3530372457476,
            "p95": 2.8195781899898353,
            "max": 7.389863387453493
          },
          "absolute_relative_difference_percent": {
            "min": 0.0005278815437979248,
            "p05": 0.16515599031588543,
            "median": 1.9478889770988408,
            "p95": 6.881802274543706,
            "max": 23.609360383053264
          }
        }
      }
    ]
  },
  "export": {
    "files": 196,
    "bytes": 58542334,
    "largest_file": "summary\\2021.json",
    "largest_bytes": 384819
  },
  "sanity_checks": {
    "world_2023_top_10_groups_by_deaths": [
      {
        "organ": "heart",
        "count": 11931336.625022633
      },
      {
        "organ": "lungs",
        "count": 11114679.048696963
      },
      {
        "organ": "brain",
        "count": 10457779.54438625
      },
      {
        "organ": "injuries",
        "count": 4772357.359617831
      },
      {
        "organ": "other_unallocated",
        "count": 3838707.4485153016
      },
      {
        "organ": "diabetes_endocrine",
        "count": 2284527.0473587853
      },
      {
        "organ": "infections_systemic",
        "count": 2159531.5996668614
      },
      {
        "organ": "liver",
        "count": 2049648.1881575845
      },
      {
        "organ": "maternal_neonatal",
        "count": 2021224.0733020506
      },
      {
        "organ": "kidneys",
        "count": 1560306.669789239
      }
    ],
    "world_2023_top_10_primary_causes_by_deaths": [
      {
        "cause_code": 1130,
        "name": "Ischaemic heart disease",
        "value": 9451255.822736595
      },
      {
        "cause_code": 1140,
        "name": "Stroke",
        "value": 6824859.579275515
      },
      {
        "cause_code": 1510,
        "name": "Injuries",
        "value": 4772357.359617831
      },
      {
        "cause_code": 1170,
        "name": "Respiratory diseases",
        "value": 4465753.784801159
      },
      {
        "cause_code": 940,
        "name": "Neurological conditions",
        "value": 2992878.5312049375
      },
      {
        "cause_code": 390,
        "name": "Lower respiratory infections",
        "value": 2693958.668357639
      },
      {
        "cause_code": 800,
        "name": "Diabetes mellitus",
        "value": 2022350.4793459256
      },
      {
        "cause_code": 490,
        "name": "Neonatal conditions",
        "value": 1812508.7926456442
      },
      {
        "cause_code": 680,
        "name": "Trachea, bronchus, lung cancers",
        "value": 1787090.3806991023
      },
      {
        "cause_code": 1120,
        "name": "Hypertensive heart disease",
        "value": 1593850.8986981178
      }
    ],
    "exported_totals_vs_all_causes": [
      {
        "location": "WLD",
        "measure": "deaths",
        "year": 2000,
        "who_all_causes": 50128297.1771035,
        "exported_organ_sum": 50128591.55,
        "difference": 294.3728964999318,
        "rounding_tolerance": 5406.143297177104
      },
      {
        "location": "WLD",
        "measure": "dalys",
        "year": 2000,
        "who_all_causes": 2845139942.1338634,
        "exported_organ_sum": 2845322500,
        "difference": 182557.8661365509,
        "rounding_tolerance": 561445.1499421338
      },
      {
        "location": "WLD",
        "measure": "deaths",
        "year": 2023,
        "who_all_causes": 60839595.91523293,
        "exported_organ_sum": 60836520.57,
        "difference": -3075.345232926309,
        "rounding_tolerance": 19816.854595915232
      },
      {
        "location": "WLD",
        "measure": "dalys",
        "year": 2023,
        "who_all_causes": 2884318194.650646,
        "exported_organ_sum": 2884344700,
        "difference": 26505.349353790283,
        "rounding_tolerance": 584434.3281946506
      },
      {
        "location": "USA",
        "measure": "deaths",
        "year": 2000,
        "who_all_causes": 2404343.0637724902,
        "exported_organ_sum": 2404449.18,
        "difference": 106.11622750991955,
        "rounding_tolerance": 348.9698430637725
      },
      {
        "location": "USA",
        "measure": "dalys",
        "year": 2000,
        "who_all_causes": 93904567.77978021,
        "exported_organ_sum": 93900330,
        "difference": -4237.7797802090645,
        "rounding_tolerance": 23058.91456777978
      },
      {
        "location": "USA",
        "measure": "deaths",
        "year": 2023,
        "who_all_causes": 3092432.39189754,
        "exported_organ_sum": 3092377.449,
        "difference": -54.94289754005149,
        "rounding_tolerance": 489.15793239189753
      },
      {
        "location": "USA",
        "measure": "dalys",
        "year": 2023,
        "who_all_causes": 126703362.790895,
        "exported_organ_sum": 126703810,
        "difference": 447.20910499989986,
        "rounding_tolerance": 37086.71336279089
      },
      {
        "location": "IND",
        "measure": "deaths",
        "year": 2000,
        "who_all_causes": 9048635.37845611,
        "exported_organ_sum": 9049099.9,
        "difference": 464.5215438902378,
        "rounding_tolerance": 2470.658635378456
      },
      {
        "location": "IND",
        "measure": "dalys",
        "year": 2000,
        "who_all_causes": 592532773.0935049,
        "exported_organ_sum": 592491990,
        "difference": -40783.0935049057,
        "rounding_tolerance": 114952.5427730935
      },
      {
        "location": "IND",
        "measure": "deaths",
        "year": 2023,
        "who_all_causes": 10380568.5354665,
        "exported_organ_sum": 10381519.52,
        "difference": 950.9845334999263,
        "rounding_tolerance": 2481.3955685354667
      },
      {
        "location": "IND",
        "measure": "dalys",
        "year": 2023,
        "who_all_causes": 514949080.210186,
        "exported_organ_sum": 514943880,
        "difference": -5200.210186004639,
        "rounding_tolerance": 72169.95908021019
      },
      {
        "location": "NGA",
        "measure": "deaths",
        "year": 2000,
        "who_all_causes": 1664237.56050117,
        "exported_organ_sum": 1664278.553,
        "difference": 40.99249882996082,
        "rounding_tolerance": 295.5747375605012
      },
      {
        "location": "NGA",
        "measure": "dalys",
        "year": 2000,
        "who_all_causes": 130193722.586953,
        "exported_organ_sum": 130195410,
        "difference": 1687.4130470007658,
        "rounding_tolerance": 25165.203722586954
      },
      {
        "location": "NGA",
        "measure": "deaths",
        "year": 2023,
        "who_all_causes": 1806468.24702644,
        "exported_organ_sum": 1806601.521,
        "difference": 133.27397355996072,
        "rounding_tolerance": 396.0669682470264
      },
      {
        "location": "NGA",
        "measure": "dalys",
        "year": 2023,
        "who_all_causes": 141017781.996259,
        "exported_organ_sum": 141006340,
        "difference": -11441.996259003878,
        "rounding_tolerance": 31566.027781996258
      },
      {
        "location": "JPN",
        "measure": "deaths",
        "year": 2000,
        "who_all_causes": 961706.62352532,
        "exported_organ_sum": 961706.865,
        "difference": 0.2414746800204739,
        "rounding_tolerance": 212.5272066235253
      },
      {
        "location": "JPN",
        "measure": "dalys",
        "year": 2000,
        "who_all_causes": 35725294.662252404,
        "exported_organ_sum": 35725948,
        "difference": 653.3377475962043,
        "rounding_tolerance": 5806.235294662252
      },
      {
        "location": "JPN",
        "measure": "deaths",
        "year": 2023,
        "who_all_causes": 1576033.3466409598,
        "exported_organ_sum": 1575992.866,
        "difference": -40.48064095992595,
        "rounding_tolerance": 280.1465333466409
      },
      {
        "location": "JPN",
        "measure": "dalys",
        "year": 2023,
        "who_all_causes": 41418760.0793435,
        "exported_organ_sum": 41418921,
        "difference": 160.92065650224686,
        "rounding_tolerance": 6351.928760079343
      }
    ]
  },
  "interim_bytes": 101689311
}
```

## Interpretation and limitations

Crude death rates use the same all-age population denominator as WHO and should agree to floating-point precision.
Country deaths ASDRs sum WHO's published cause ASDRs; linearity preserves the fine-age standardization.
DALYs and WLD retain broad-bin standardization. Visceral collapses WHO2026 weights into seven age-specific bins
(eight sheets including All ages). Within each bin it uses the country's observed age composition, rather than
the standard population's fine-age composition. Differences can be large in countries with young populations,
especially within the open 70+ bin; these are approximation errors, not corrected to match the reference.
WLD is the sum of the included countries, not an official WHO regional/world estimate.

Leishmaniasis subtypes 261/262 use printed e.1./e.2. labels to recover a fifth hierarchy level despite shared columns.
Notes confirm that country colours describe cause-of-death evidence quality; the adjacent 1–4 row is retained
as data_quality in the internal location table, without inventing a numeric grade-to-description crosswalk.
Mapping is a single underlying-cause attribution, not an estimate of organ health or all multi-organ effects.
Muscles has no separately identifiable muscular cause and is structurally empty. Other MSK maps to bones/joints.
Mixed code 814 (endocrine/blood/immune) is retained in diabetes_endocrine because it cannot be split.
Code 1160 (Other circulatory diseases) is other_unallocated: the label is not specifically cardiac.
COVID-19 is assigned to lungs as a respiratory infection; systemic and multi-organ effects are acknowledged
but remain under the single underlying cause. Intestinal nematodes map to small intestine and larynx
cancer maps to lungs/airways. See cause_map.csv for individual rationales.
