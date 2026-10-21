export default function DatasetBanner({ release }: { release: string }) {
  const fixture = release.includes('FIXTURE')
  return <div className={`dataset-banner ${fixture ? 'synthetic' : ''}`}>
    <span className="status-dot" />{fixture ? 'DEVELOPMENT PREVIEW' : release}
    <span>{fixture ? 'Synthetic data · not WHO estimates' : 'Population-level burden associated with mapped causes'}</span>
  </div>
}
