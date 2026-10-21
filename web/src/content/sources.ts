// Book-level references only: chapter titles and external links await review.
export const educationSources = {
  openstax: 'OpenStax, Anatomy and Physiology 2e (2022). CC BY 4.0. Adapted summaries by Visceral.',
  mapping: 'Visceral cause-to-organ mapping, version 0.1.0; WHO Global Health Estimates 2023 cause categories. Mapping describes this project’s attribution, not an anatomy textbook classification.',
}
export type EducationSourceId = keyof typeof educationSources
export const WHO_URL = 'https://www.who.int/data/gho/data/themes/mortality-and-global-health-estimates'
export const REPO_URL = 'https://github.com/narowtow/visceral'
export const medicalDisclaimer = 'Educational visualization of population-level statistics. It does not provide diagnosis, treatment advice, or individual risk estimates. Anatomical associations are simplified; see Methodology.'
export const whoNonEndorsement = 'These are this project’s analysis, not official WHO figures. WHO is not responsible for them and does not endorse this project. The estimates are based on data provided by WHO Member States.'
