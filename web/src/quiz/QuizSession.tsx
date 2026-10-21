import { useCallback, useEffect, useRef, useState } from 'react'
import BodyViewport from '../components/BodyViewport'
import OrganList from '../components/OrganList'
import { oneLineFunction } from '../content/organs'
import { useExplorer } from '../state/store'
import { findableOrgans, organName, questionText } from './questions'
import type { HigherQuestion, Question } from './questions'
import { readBest, saveBest } from './scores'

const neutralColor = () => '#739fae'
// Significant digits keep small but nonzero death rates readable in feedback.
const rate = (value: number) => new Intl.NumberFormat('en', { maximumSignificantDigits: 4 }).format(value)
function ComparisonFeedback({ question }: { question: HigherQuestion }) {
  return <><dl className="comparison-values">{[question.a, question.b].map(option => <div key={option.id}><dt>{organName(option.id)}</dt><dd>{rate(option.value)} <small>per 100,000</small></dd></div>)}</dl><p>These rates sum the causes assigned to each group; they describe population burden, not individual risk. Both sexes · All ages.</p></>
}
export default function QuizSession({ questions, fixture, theme, exit }: {
  questions: Question[]; fixture: boolean; theme: 'light' | 'dark'; exit: () => void
}) {
  const mode = questions[0].kind
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>(() => questions.map(() => null))
  const [best, setBest] = useState(() => readBest(mode, fixture))
  const [review, setReview] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const answerLock = useRef(false)
  const selected = useExplorer(state => state.selection.selectedOrgan)
  const selectOrgan = useExplorer(state => state.selectOrgan)
  const complete = index >= questions.length
  const question = questions[Math.min(index, questions.length - 1)]
  const answer = answers[index]
  const score = answers.filter((answer, i) => answer === questions[i].correctId).length
  useEffect(() => {
    selectOrgan(null)
    heading.current?.focus()
    return () => { selectOrgan(null) }
  }, [selectOrgan])
  const choose = useCallback((id: string) => {
    if (answerLock.current || complete) return
    if (question.kind === 'find' && !findableOrgans.some(organ => organ.id === id)) return
    if (question.kind === 'higher' && id !== question.a.id && id !== question.b.id) return
    answerLock.current = true
    setAnswers(previous => previous.map((value, i) => i === index ? id : value))
    selectOrgan(question.correctId)
  }, [complete, question, index, selectOrgan])
  useEffect(() => { if (answer) feedback.current?.focus() }, [answer])
  const next = () => {
    if (!answer) return
    if (index === questions.length - 1) setBest(saveBest(mode, fixture, score, best))
    answerLock.current = false
    selectOrgan(null)
    setIndex(index + 1)
  }
  useEffect(() => { heading.current?.focus() }, [index])
  if (complete) return <section className="quiz-results" aria-labelledby="quiz-finish">
    <span className="eyebrow">Practice complete</span><h2 id="quiz-finish" ref={heading} tabIndex={-1}>You scored {score} / {questions.length}</h2>
    <p role="status">Best score: {best} / {questions.length} · {mode === 'find' ? 'Find the organ' : 'Higher or lower'}</p>
    <p className="subtle-note">Best scores stay on this device when browser storage is available. Fixture scores are kept separately.</p>
    <div className="button-row"><button aria-expanded={review} onClick={() => setReview(!review)}>{review ? 'Hide review' : 'Review answers'}</button><button onClick={exit}>Choose a quiz</button></div>
    {review && <ol className="quiz-review">{questions.map((item, i) => <li key={i}>
      <h3>{questionText(item)}</h3><p><strong>{answers[i] === item.correctId ? 'Correct' : 'Incorrect'}.</strong> Your answer: {organName(answers[i]!)}. Correct answer: {organName(item.correctId)}.</p>
      {item.kind === 'find' ? <p>{oneLineFunction(item.correctId)}</p> : <ComparisonFeedback question={item} />}
    </li>)}</ol>}
  </section>
  return <section className="quiz-session" aria-labelledby="quiz-question">
    <div className="quiz-progress"><span>Question {index + 1} of {questions.length}</span><span>Score {score}</span><button onClick={exit}>Leave quiz</button></div>
    <progress value={index + (answer ? 1 : 0)} max={questions.length} aria-label="Quiz progress" />
    <h2 id="quiz-question" ref={heading} tabIndex={-1}>{questionText(question)}</h2>
    <p className="muted">{question.kind === 'find' ? 'Click or tap the structure, or choose it from the keyboard-accessible list. Colors are neutral for this exercise.' : 'Choose the higher rate. Both sexes · All ages · WHO2026 standard. Pairs differ by at least 10% of the larger value.'}</p>
    {fixture && <p className="fixture-note">Synthetic fixture data: these comparisons are practice examples, not WHO estimates.</p>}
    {answer && <div className="quiz-feedback" ref={feedback} tabIndex={-1}>
      <h3>{answer === question.correctId ? 'Correct.' : `The correct answer is ${organName(question.correctId)}.`}</h3>
      {answer !== question.correctId && <p>You chose {organName(answer)}.</p>}
      {question.kind === 'find' ? <p>{oneLineFunction(question.correctId)}</p> : <ComparisonFeedback question={question} />}
      <button className="primary-button" onClick={next}>{index === questions.length - 1 ? 'See results' : 'Next question'}</button>
    </div>}
    {question.kind === 'find' ? <div className="find-quiz-grid">
      <BodyViewport values={{}} color={neutralColor} theme={theme} narrow={false} openList={() => {}} onSelect={choose} quiz />
      <div className="quiz-organ-list"><h3>{answer ? 'Correct structure highlighted' : 'Choose an organ'}</h3>
        {answer ? <p>{organName(question.correctId)} is outlined on the body. You can use Focus to inspect it.</p> : <OrganList key={index} selected={selected} values={{}} color={neutralColor} selectOrgan={choose} options={findableOrgans} showValues={false} />}
      </div>
    </div> : !answer && <div className="quiz-choices">{[question.a, question.b].map(option => <button key={option.id} onClick={() => choose(option.id)}>{organName(option.id)}{' '}<span>Higher age-standardized death rate</span></button>)}</div>}
    <p className="sr-only" aria-live="polite" aria-atomic="true">{answer ? `${answer === question.correctId ? 'Correct' : 'Incorrect'}. ${organName(question.correctId)} is the answer. ${question.kind === 'find' ? oneLineFunction(question.correctId) : `${organName(question.a.id)}: ${rate(question.a.value)}; ${organName(question.b.id)}: ${rate(question.b.value)} per 100,000.`}` : questionText(question)}</p>
  </section>
}
