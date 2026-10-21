import { organContent } from '../content/organs'
import { educationSources } from '../content/sources'

export default function OrganEducation({ id }: { id: string }) {
  const content = organContent[id]
  return <section className="organ-education" aria-label="Organ education">
    <h2>What it does</h2>
    <p className="organ-description">{content.summary}</p>
    <details key={id}>
      <summary>Learn about this group</summary>
      <h3>Key structures</h3>
      <ul>{content.structures.map(item => <li key={item}>{item}</li>)}</ul>
      <h3>How burden is counted here</h3>
      <p>{content.burden}</p>
      <h3>Did you know?</h3>
      <p>{content.fact}</p>
      <h3>Sources</h3>
      <ul className="education-sources">{content.sources.map(id => <li key={id}>{educationSources[id]}</li>)}</ul>
    </details>
  </section>
}
