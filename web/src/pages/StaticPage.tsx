import AboutPage from './AboutPage'
import MethodologyPage from './MethodologyPage'

export default function StaticPage({ route }: { route: string }) {
  if (route === 'about') return <AboutPage />
  if (route === 'methodology') return <MethodologyPage />
  return <main id="main" className="static-page reading-page" tabIndex={-1}>
    <span className="eyebrow">Visceral / Analysis</span><h1>A wider perspective.</h1>
    <p>Cross-country comparisons and deeper analysis are being prepared. Methodology already documents the measured bias of broad-bin age standardization and the validation findings.</p>
    <p><a href="#/methodology">Read the Methodology</a> or return to <a href="#/explore">Explore</a> to compare organ groups and time trends.</p>
  </main>
}
