import { useEffect, useMemo, useState } from 'react'
import { validateManifest } from './data/contract'
import type { Manifest } from './data/contract'
import { useResource } from './data/useResource'
import { useMedia } from './lib/useMedia'
import { syncUrl, useExplorer } from './state/store'
import { routeFromHash, serializeHash } from './state/url'
import Explorer from './Explorer'
import StaticPage from './pages/StaticPage'
const routes = ['explore', 'analysis', 'methodology', 'about']

export default function App() {
  const resource = useResource<Manifest>('manifest.json')
  const checked = useMemo(() => {
    if (!resource.data) return {}
    try { return { manifest: validateManifest(resource.data) } } catch (error) { return { error: error instanceof Error ? error.message : 'Invalid dataset.' } }
  }, [resource.data])
  const manifest = checked.manifest
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash))
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
  return <><a className="skip-link" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus() }}>Skip to content</a><header className="app-header"><a className="wordmark" href={serializeHash(selection)} aria-label="Visceral Explore"><img className="brand-icon" src={`${import.meta.env.BASE_URL}brand/icon-32.png`} srcSet={`${import.meta.env.BASE_URL}brand/icon-64.png 2x`} width="32" height="32" alt="" />Visceral</a><nav aria-label="Main navigation">{routes.map(r => <a key={r} href={serializeHash(selection, r)} aria-current={route === r ? 'page' : undefined}>{r[0].toUpperCase() + r.slice(1)}</a>)}</nav><label className="theme-picker"><span className="sr-only">Color theme</span><select aria-label="Color theme" value={themePreference} onChange={e => setTheme(e.target.value as 'dark' | 'light' | 'system')}><option value="system">◐ System</option><option value="dark">☾ Dark</option><option value="light">☀ Light</option></select></label></header>
    {manifest && <div className={`dataset-banner ${manifest.datasetRelease.includes('FIXTURE') ? 'synthetic' : ''}`}><span className="status-dot" />{manifest.datasetRelease.includes('FIXTURE') ? 'DEVELOPMENT PREVIEW' : manifest.datasetRelease}<span>{manifest.datasetRelease.includes('FIXTURE') ? 'Synthetic data · not WHO estimates' : 'Population-level burden associated with mapped causes'}</span></div>}
    {route !== 'explore' ? <StaticPage route={route} /> : error ? <main id="main" className="load-page" tabIndex={-1}><h1>Data unavailable</h1><p role="alert">{error}</p><p>For local synthetic data, run <code>npm run dev:fixture</code>.</p><button onClick={resource.retry}>Try again</button></main> : manifest ? <Explorer manifest={manifest} theme={theme} /> : <main id="main" className="load-page" tabIndex={-1}><h1>Opening the explorer</h1><p role="status">Loading dataset metadata…</p></main>}
  </>
}
