import { useEffect, useMemo, useRef, useState } from 'react'
import type { Manifest, Summary } from '../data/contract'
import { useResource } from '../data/useResource'
import QuizSession from '../quiz/QuizSession'
import { generateFindQuestions, generateHigherQuestions, QUESTION_COUNT } from '../quiz/questions'
import type { Question } from '../quiz/questions'

export default function QuizPage({ manifest, theme }: { manifest: Manifest; theme: 'light' | 'dark' }) {
  const [year, setYear] = useState(Math.max(...manifest.years))
  const [seed, setSeed] = useState('visceral')
  const [requested, setRequested] = useState(false)
  const [session, setSession] = useState<Question[] | null>(null)
  const startComparison = useRef<HTMLButtonElement>(null)
  // Load a single compact cross-country matrix, only when this mode is requested.
  const summary = useResource<Summary>(requested ? `summary/${year}.json` : null)
  const higher = useMemo(() => summary.data?.year === year ? generateHigherQuestions(summary.data, manifest, seed) : [], [summary.data, manifest, seed, year])
  const fixture = manifest.datasetRelease.includes('FIXTURE')
  useEffect(() => {
    if (requested && higher.length === QUESTION_COUNT) startComparison.current?.focus()
  }, [requested, higher.length])
  return <main id="main" className="static-page quiz-page" tabIndex={-1}>
    <header className="page-intro"><span className="eyebrow">Visceral / Quiz</span><h1>Make a connection.</h1><p className="page-lead">Practice the anatomy. Then test your intuition about population-level burden.</p></header>
    {session ? <QuizSession questions={session} fixture={fixture} theme={theme} exit={() => setSession(null)} /> : <>
      <div className="reading-grid quiz-modes"><section className="reading-card"><span className="eyebrow">Anatomy · 10 questions</span><h2>Find the organ</h2><p>Locate a structure on the body or choose it from a list. Each answer comes with a short explanation of its function.</p><button onClick={() => setSession(generateFindQuestions(seed))}>Start Find the organ</button></section>
        <section className="reading-card"><span className="eyebrow">Data · 10 questions</span><h2>Higher or lower</h2><p>Compare organ groups across countries. Which has the higher age-standardized death rate for the causes assigned to it?</p>{!requested && <button onClick={() => setRequested(true)}>Prepare Higher or lower</button>}
          {requested && !summary.data && !summary.error && <p role="status">Loading comparisons…</p>}
          {summary.error && <p role="alert">{summary.error} <button onClick={summary.retry}>Retry comparisons</button></p>}
          {requested && summary.data && (higher.length === QUESTION_COUNT ? <button ref={startComparison} className="primary-button" onClick={() => setSession(higher)}>Start Higher or lower</button> : <p role="status">Not enough valid comparisons for this set. Choose another year or question seed.</p>)}
        </section></div>
      <details className="quiz-options"><summary>Choose a question set</summary><div className="quiz-settings"><label className="field-label">Comparison year<select value={year} onChange={event => setYear(Number(event.target.value))}>{manifest.years.map(year => <option key={year} value={year}>{year}</option>)}</select></label><label className="field-label">Question seed<input type="text" value={seed} maxLength={80} onChange={event => setSeed(event.target.value)} /></label></div><p>The same seed, year and dataset produce the same questions. Change the seed for another set. Find the organ uses modeled internal organs; skin, skeleton and list-only groups are outside this mode.</p></details>
      <p className="muted">No timer, account or score upload. Everything can be answered with a keyboard. Best scores are stored on this device when available.</p>
    </>}
  </main>
}
