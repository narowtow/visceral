import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { validateManifest } from './data/contract'
import type { Manifest } from './data/contract'
import { useResource } from './data/useResource'
import { useMedia } from './lib/useMedia'
import { syncUrl, useExplorer } from './state/store'
import { routeFromHash, serializeHash } from './state/url'
import Explorer from './Explorer'
import DatasetBanner from './components/DatasetBanner'
import Footer from './components/Footer'
import { useRouteFocus } from './lib/useRouteFocus'
const StaticPage = lazy(() => import('./pages/StaticPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'))
const routes = ['explore', 'analysis', 'methodology', 'about', 'quiz']

export default function App() {
  const resource = useResource<Manifest>('manifest.json')
  const checked = useMemo(() => {
    if (!resource.data) return {}
    try { return { manifest: validateManifest(resource.data) } } catch (error) { return { error: error instanceof Error ? error.message : 'Invalid dataset.' } }
  }, [resource.data])
  const manifest = checked.manifest
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash))
  useRouteFocus(route)
  const selection = useExplorer(s => s.selection)
  const themePreference = useExplorer(s => s.theme)
  const setTheme = useExplorer(s => s.setTheme)
  const systemDark = useMedia('(prefers-color-scheme: dark)')
  const theme = themePreference === 'system' ? (systemDark ? 'dark' : 'light') : themePreference
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme }, [theme])
  useEffect(() => {
    const change = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  useEffect(() => { if (manifest) return syncUrl(manifest) }, [manifest])
  useEffect(() => { document.title = `${route[0].toUpperCase() + route.slice(1)} · Visceral` }, [route])
  const error = resource.error ?? checked.error
  const loading = <main id="main" className="load-page" tabIndex={-1}><p role="status">Loading {route}…</p></main>
  let page = loading
  if (route === 'analysis') page = <Suspense fallback={loading}><AnalysisPage manifest={manifest} /></Suspense>
  else if (route === 'methodology' || route === 'about') page = <Suspense fallback={loading}><StaticPage route={route} /></Suspense>
  else if (error) page = <main id="main" className="load-page" tabIndex={-1}><h1>Data unavailable</h1><p role="alert">{error}</p><button onClick={resource.retry}>Try again</button></main>
  else if (manifest) page = route === 'quiz' ? <Suspense fallback={loading}><QuizPage manifest={manifest} theme={theme} /></Suspense> : <Explorer manifest={manifest} theme={theme} />
  return <><a className="skip-link" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus() }}>Skip to content</a><header className="app-header"><a className="wordmark" href={serializeHash(selection)} aria-label="Visceral Explore"><img className="brand-icon" src={`${import.meta.env.BASE_URL}brand/icon-32.png`} srcSet={`${import.meta.env.BASE_URL}brand/icon-64.png 2x`} width="32" height="32" alt="" />Visceral</a><nav aria-label="Main navigation">{routes.map(r => <a key={r} href={serializeHash(selection, r)} aria-current={route === r ? 'page' : undefined}>{r[0].toUpperCase() + r.slice(1)}</a>)}</nav><label className="theme-picker"><span className="sr-only">Color theme</span><select aria-label="Color theme" value={themePreference} onChange={e => setTheme(e.target.value as 'dark' | 'light' | 'system')}><option value="system">◐ System</option><option value="dark">☾ Dark</option><option value="light">☀ Light</option></select></label></header>
    {manifest && <DatasetBanner release={manifest.datasetRelease} />}
    {page}
    <Footer />
  </>
}
