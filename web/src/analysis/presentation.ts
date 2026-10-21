import { organs } from '../data/contract'
import { defaults, serializeHash } from '../state/url'
import type { Measure } from '../data/contract'
import type { Figure, FigureId, FigureRows } from './data'

export interface ChartControls { measure: Measure; organ: 'heart' | 'brain'; standard: string; allGroups: boolean }
export const defaultControls: ChartControls = { measure: 'deaths', organ: 'heart', standard: 'Segi', allGroups: false }
const shortNames: Record<string, string> = {
  blood_immune: 'Blood & immune', diabetes_endocrine: 'Diabetes & metabolic', mental_substance: 'Mental & substance',
  infections_systemic: 'Systemic infections', maternal_neonatal: 'Maternal & newborn', other_unallocated: 'Other / unallocated',
  gallbladder: 'Biliary', muscles: 'Muscles',
}
export const groupName = (id: string) => organs.find(organ => organ.id === id)?.label ?? id
export const shortName = (id: string) => shortNames[id] ?? groupName(id)
export const number = (value: unknown): string => value === null || value === undefined ? 'No data' : typeof value === 'number'
  ? new Intl.NumberFormat('en', { maximumSignificantDigits: 4, ...(value !== 0 && Math.abs(value) < .001 ? { notation: 'scientific' as const } : {}) }).format(value) : String(value)
export const compact = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 3 }).format(value)
export const explorerHash = (location: string, organ: string, measure: Measure = 'deaths') =>
  serializeHash({ ...defaults, location, selectedOrgan: organ, measure, year: 2023, age: 'all', sex: 'both', metric: 'ageStdRate' })
export const focusGroups = ['heart', 'brain', 'lungs']
export const primaryFigures: Record<string, FigureId[]> = {
  'age-structure': ['age-rankings'], pandemic: ['global-trends', 'pandemic-decomposition'], method: ['age-methods', 'standard-organ-rankings'],
  patterns: ['country-patterns', 'cluster-selection', 'cluster-centroids'], sex: ['sex-ratios'],
}
export const ratioGroups = ['mental_substance', 'liver', 'injuries', 'lungs', 'blood_immune', 'kidneys', 'heart', 'diabetes_endocrine', 'skin', 'infections_systemic', 'brain', 'bones_joints']
export function selectedRows(figure: Figure, controls: ChartControls) {
  return figure.data.filter(row => {
    if ('measure' in row && row.measure !== controls.measure) return false
    if (figure.id === 'age-rankings' && 'organ' in row && row.organ !== controls.organ) return false
    if (figure.id === 'global-trends' && 'organ' in row && !focusGroups.includes(row.organ)) return false
    if (figure.id === 'pandemic-decomposition' && 'metric' in row && row.metric !== 'ageStdRate') return false
    if (figure.id === 'standard-rankings' && 'standard' in row && row.standard !== controls.standard) return false
    if (figure.id === 'sex-ratios' && !controls.allGroups && 'organ' in row && !ratioGroups.includes(row.organ)) return false
    return true
  })
}
export function globalLines(rows: FigureRows['global-trends'][]) {
  return [...new Set(rows.map(row => row.year))].sort((a, b) => a - b).map(year => ({ year,
    ...Object.fromEntries(focusGroups.map(organ => [organ, rows.find(row => row.year === year && row.organ === organ)?.ageStdRate ?? null])),
  }))
}
export function standardWinners(rows: FigureRows['standard-organ-rankings'][]) {
  return [...new Set(rows.map(row => row.standard))].map(standard => {
    const winner = rows.filter(row => row.standard === standard).sort((a, b) => a.rank - b.rank)[0]
    return { ...winner, label: `${standard}: ${shortName(winner.organ)}` }
  })
}
export function rangeRow(organ: string, value: number | null, low: number | null, high: number | null) {
  return { organ, label: shortName(organ), value, p05: low, p95: high,
    interval: value !== null && low !== null && high !== null ? [Math.max(0, value - low), Math.max(0, high - value)] : undefined }
}
export const summaries: Record<Figure['id'], string> = {
  'age-rankings': 'Each point is a country in 2023, both sexes. Log axes compare crude and standardized rates; the dashed diagonal marks equality. Color shows the percentage aged 70+. Hover for country details; click to explore. Every country also has an Explore link in the table.',
  'rank-correlations': 'Spearman rank correlation compares country ordering before and after age adjustment. One means identical ordering; zero means no monotonic rank agreement. Undefined correlations remain missing.',
  'organ-rankings': 'Each point compares crude and standardized rankings of groups within a country. The x-axis is the largest absolute rank shift; the y-axis is Spearman agreement across groups. This differs from ranking countries for a single organ.',
  'global-trends': 'World standardized rates for heart, brain and lungs, both sexes. Points mark the eight observed years and the shaded band marks 2020–2021. All World rates use broad age bins. Lines connect observations, without estimating intervening years or forecasting.',
  'country-trends': 'Country percent changes in standardized rates from 2000 to 2019. Dots are medians; bars span country p05–p95. Countries have equal weight, and ranges are descriptive, not confidence intervals.',
  'pandemic-decomposition': 'Change from observed 2019 in the mapped lung rate. COVID-19 adds to the change while other mapped causes can subtract. Dots show the net change. Components may exceed the net increase; this is accounting, not a pandemic-free counterfactual.',
  'age-methods': 'Broad-bin minus published fine-age death ASDR, as a percent of the published rate, in 2023. The twelve lowest country medians are shown first; expand to see every defined group. Ranges mark p05–p95, not confidence intervals. Negative values indicate underestimation. Zero published denominators are excluded.',
  'standard-rankings': 'Country-ranking agreement with WHO2026 for the selected alternative standard. All compared standards use the same broad-bin method, isolating the choice of population weights.',
  'standard-organ-rankings': 'The first-ranked global group under each standard, with its rate. Highest burden ranks first. Every standard uses the same broad-bin rates; the table includes all groups and ranks.',
  'standards-mapping': 'Shares of summed primary burden under the baseline and alternative attribution. The alternative moves COVID/TB to systemic infections, diabetes to pancreas, and mental/substance conditions to brain. Totals are preserved; it does not change underlying deaths or DALYs.',
  'country-patterns': 'PCA projects the standardized log(1 + death ASDR) profiles into two dimensions. These components explain 44.7% of feature variance; clustering used all 30 variable groups. Patterns are descriptive, not country grades. Country names and memberships are in the table.',
  'cluster-selection': 'Silhouette measures separation; adjusted Rand index (ARI) measures bootstrap membership agreement. Higher is stronger evidence on each scale. The ARI range spans p05–p95 of 100 bootstrap samples per k; this does not measure WHO estimate uncertainty.',
  'cluster-centroids': 'The twelve most differentiated features between patterns. Bars show mean standardized log(1 + rate), or z scores, on either side of zero. They are relative feature contrasts, not raw rates or value judgments. The table includes all profile features and member medians.',
  'sex-ratios': 'Male divided by female standardized burden in 2023. Circles show country medians with p05–p95 ranges; diamonds show World ratios. One marks parity on the log axis. World uses broad bins; country deaths use published fine-age rates. Reproductive and mixed maternal groups are excluded. Zero female denominators yield missing ratios. Zero ratios cannot appear on log axes; zero range endpoints stop at the plotting floor and exact bounds remain in the table.',
}
export function figureUnits(id: FigureId, controls: ChartControls): string {
  const burden = controls.measure === 'deaths' ? 'Deaths' : 'DALYs'
  switch (id) {
    case 'age-rankings': return `${groupName(controls.organ)} · ${burden} per 100,000; ages 70+ as %; ranks in places.`
    case 'global-trends': return `${burden} ASDR per 100,000 · World, both sexes.`
    case 'pandemic-decomposition': return `Change in ${burden.toLowerCase()} ASDR per 100,000 relative to 2019.`
    case 'age-methods': return 'Relative death-ASDR difference (%) · Both sexes, 2023.'
    case 'country-trends': return `${burden} ASDR percent change (%) · Both sexes, 2000–2019.`
    case 'standard-organ-rankings': return `${burden} ASDR per 100,000; ranks in places · World, 2023.`
    case 'standards-mapping': return `${burden}: shares (%), ASDR per 100,000 and ranks in places · World, 2023.`
    case 'country-patterns': return 'PC coordinates: unitless projection scores · Deaths, both sexes, 2023.'
    case 'cluster-centroids': return 'Centroids: unitless z scores; member rates per 100,000 · Deaths, 2023.'
    case 'cluster-selection': return 'Silhouette and ARI: unitless scores; k and pattern sizes: counts.'
    case 'sex-ratios': return `${burden}: male / female ASDR ratios (×) · 2023.`
    default: return `${burden}: Spearman ρ (unitless) and rank shifts (places) · Both sexes, 2023.`
  }
}
export const columnNames: Record<string, string> = {
  year: 'Year', standard: 'Standard', metric: 'Metric', silhouette: 'Silhouette', p25: 'Country p25', p75: 'Country p75',
  organ: 'Group', measure: 'Measure', location: 'Country', name: 'Country name', rate: 'Crude rate / 100,000', ageStdRate: 'ASDR / 100,000',
  rank_a: 'Crude rank', rank_b: 'ASDR rank', rank_change: 'Rank change', population_70_plus: 'Aged 70+ (%)',
  p05: 'Country p05', median: 'Country median', p95: 'Country p95', rho: 'Spearman ρ', n: 'N (see description)',
  world_ratio: 'World male / female ratio', world_70_plus_share: 'Global deaths aged 70+ (%)', within_organ_age_rho: 'Within-group age ρ',
  count: 'Count', cluster: 'Pattern', hierarchical_cluster: 'Ward pattern', composition_cluster: 'Composition pattern',
  pc1: 'PC1 score', pc2: 'PC2 score', z: 'Centroid z score', log_space_rate: 'Back-transformed rate / 100,000', median_rate: 'Member median rate / 100,000',
  cause_change: 'COVID change', other_change: 'Other cause change', change: 'Net change', baseline: '2019 reference', observed: 'Observed',
  cause_share_of_net_change_percent: 'COVID / net change (%)', min_size: 'Smallest pattern', resamples: 'Bootstrap samples',
  ari_p05: 'Bootstrap ARI p05', ari_median: 'Bootstrap ARI median', ari_p95: 'Bootstrap ARI p95', ari_mean: 'Bootstrap ARI mean',
  count_share_base: 'Baseline share (%)', count_share_alt: 'Alternative share (%)', ageStdRate_base: 'Baseline ASDR / 100,000', ageStdRate_alt: 'Alternative ASDR / 100,000',
  rank_base: 'Baseline rank', rank_alt: 'Alternative rank', max_abs_rank_change: 'Largest absolute rank shift',
}
