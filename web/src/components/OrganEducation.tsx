import { organContent } from '../content/organs'
import { educationSources } from '../content/sources'

export default function OrganEducation({ id }: { id: string }) {
  const content = organContent[id]
  return <section className="organ-education" aria-label="Organ education">
    <h3>What it does</h3>
    <p className="organ-description">{content.summary}</p>
    <details key={id}>
      <summary>Learn about this group</summary>
      <h4>Key structures</h4>
      <ul>{content.structures.map(item => <li key={item}>{item}</li>)}</ul>
      <h4>How burden is counted here</h4>
      <p>{content.burden}</p>
      <h4>Did you know?</h4>
      <p>{content.fact}</p>
      <h4>Sources</h4>
      <ul className="education-sources">{content.sources.map(id => <li key={id}>{educationSources[id]}</li>)}</ul>
    </details>
  </section>
}
