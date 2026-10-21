import type { QuizMode } from './questions'
import { QUESTION_COUNT } from './questions'

const keyFor = (mode: QuizMode, fixture: boolean) => `visceral.quiz.v1.${fixture ? 'fixture' : 'who'}.${mode}`
export function readBest(mode: QuizMode, fixture: boolean): number {
  try {
    const value = Number(window.localStorage.getItem(keyFor(mode, fixture)))
    return Number.isInteger(value) && value >= 0 && value <= QUESTION_COUNT ? value : 0
  } catch { return 0 }
}
export function saveBest(mode: QuizMode, fixture: boolean, score: number, previous = 0): number {
  const valid = Number.isInteger(score) && score >= 0 && score <= QUESTION_COUNT ? score : 0
  const best = Math.max(readBest(mode, fixture), previous, valid)
  try { window.localStorage.setItem(keyFor(mode, fixture), String(best)) } catch { /* Session scores still work without storage. */ }
  return best
}
