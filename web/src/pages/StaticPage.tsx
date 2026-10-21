import AboutPage from './AboutPage'
import MethodologyPage from './MethodologyPage'

export default function StaticPage({ route }: { route: string }) {
  if (route === 'about') return <AboutPage />
  return <MethodologyPage />
}
