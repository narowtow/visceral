import { useState } from 'react'
import type { Causes } from '../data/contract'
import { useResource } from '../data/useResource'
import { filterCauses, organLabel } from '../data/causeMapping'

export default function CausesTable() {
  const { data, error, retry } = useResource<Causes>('causes.json')
  const [search, setSearch] = useState('')
  const [primaryOnly, setPrimaryOnly] = useState(true)
  const rows = filterCauses(data?.causes ?? [], search, primaryOnly)
  return <section id="cause-mapping" aria-labelledby="mapping-heading">
    <h2 id="mapping-heading">Look up a cause</h2>
    <p>Only primary causes are summed. Include hierarchy rows to inspect ancestors and covered descendants; they are never added again.</p>
    <label className="field-label" htmlFor="cause-search">Search code, cause, organ group or rationale</label>
    <input id="cause-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try stroke, pancreas or 1130" />
    <label className="check-label"><input type="checkbox" checked={!primaryOnly} onChange={event => setPrimaryOnly(!event.target.checked)} />Include hierarchy rows</label>
    {error ? <p role="alert">{error} <button onClick={retry}>Retry cause mapping</button></p> : !data ? <p role="status">Loading cause mapping…</p> : <>
      <p className="subtle-note" role="status">{rows.length} matching causes · mapping {data.mappingVersion}</p>
      <div className="table-scroll" role="region" aria-label="Cause mapping table" tabIndex={0}>
        <table className="mapping-table"><caption>Cause-to-organ attribution from the active dataset</caption>
          <thead><tr><th scope="col">Code</th><th scope="col">Cause</th><th scope="col">Organ group</th><th scope="col">Rationale</th></tr></thead>
          <tbody>{rows.map(cause => <tr key={cause.code}><th scope="row">{cause.code}</th><td>{cause.name}<small>{cause.relation === 'primary' ? 'Counted primary cause' : 'Not summed separately'}</small></td><td>{organLabel(cause.organ)}</td><td>{cause.rationale}</td></tr>)}</tbody>
        </table>
      </div>
      {!rows.length && <p>No matching causes. Try a broader search or include hierarchy rows.</p>}
    </>}
  </section>
}
