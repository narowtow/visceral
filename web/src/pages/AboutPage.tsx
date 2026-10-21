import { educationSources, medicalDisclaimer, REPO_URL, WHO_URL, whoNonEndorsement } from '../content/sources'

export default function AboutPage() {
  return <main id="main" className="static-page reading-page" tabIndex={-1}>
    <header className="page-intro"><span className="eyebrow">Visceral / About</span><h1>Public health,<br />made visible.</h1>
      <p className="page-lead">Where does the burden of disease fall—and how does that picture change across populations?</p>
      <p>Visceral is a data-science project that connects population-level estimates with an interactive body. The body is a way into the data: explore a familiar structure, then examine the causes, trends and assumptions behind its color.</p>
    </header>
    <section><h2>Who built it</h2><p>Created by <a href="https://github.com/narowtow">narowtow</a>, with help from AI coding agents, Claude and Codex. The mapping, analysis and presentation are this project’s work and remain open to inspection and correction.</p>
      <a className="button-link" href={REPO_URL}>View the project on GitHub ↗</a></section>
    <section className="page-callout"><h2>Medical disclaimer</h2><p>{medicalDisclaimer}</p><a href="#/methodology">Read the Methodology</a></section>
    <section><h2>Data credits</h2><p><a href={WHO_URL}>WHO Global Health Estimates 2023</a>: <cite>Deaths by Cause, Age, Sex, by Country and by Region, 2000–2023</cite> and <cite>Disease burden by Cause, Age, Sex, by Country and by Region, 2000–2023</cite>. Geneva: World Health Organization; 2026.</p>
      <p>{whoNonEndorsement}</p><p>Age standardization uses the revised WHO 2026 standard population, WHO/HSA/DDA/GHE/2026.4. <a href="https://www.who.int/about/policies/publishing/data-policy/terms-and-conditions">WHO data terms and conditions</a> apply.</p></section>
    <section><h2>Anatomy credits</h2><p><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/">BodyParts3D 4.0</a>, © The Database Center for Life Science, licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC Attribution 4.0 International</a>.</p>
      <p>Selected structures were grouped, renamed, transformed, decimated and compressed. Lung surfaces are approximate envelopes derived from bronchial and vascular trees; bronchi were regrouped with the trachea and pulmonary vessels omitted. The thyroid is a stylized shape created for this project. The reference model is male; population sex filters do not change its anatomy.</p>
      <p>The <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html">archive license page</a>, updated in 2025, specifies CC BY 4.0 despite older license text in the OBJ headers.</p></section>
    <section id="education-sources"><h2>Educational reading</h2><p>The organ notes are concise adaptations, not quotations. Book-level references are collected here; chapter-specific references have not been asserted.</p><ul>{Object.entries(educationSources).map(([id, source]) => <li key={id}>{source}</li>)}</ul></section>
    <section><h2>Built with</h2><p>The interface uses React, TypeScript, Vite and Tailwind CSS; Zustand manages state. Three.js, React Three Fiber and drei power the anatomy, Recharts draws charts, and D3 provides the color scales. Blender and glTF Transform prepare the model.</p>
      <p>The offline Python pipeline uses DuckDB, openpyxl and Pandera, with uv for the environment. Vitest, Testing Library, pytest and Ruff support validation. These libraries are maintained by their respective contributors; naming them does not imply endorsement.</p>
      <p>The project’s source code is MIT licensed. Data, educational material and anatomy retain their own terms. See the <a href={`${REPO_URL}/blob/main/THIRD_PARTY_NOTICES.md`}>third-party notices</a> and <a href={`${REPO_URL}/blob/main/web/package.json`}>web dependency list</a>.</p></section>
  </main>
}
