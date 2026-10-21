import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import QuizSession from './QuizSession'
import type { Question } from './questions'
import { useExplorer } from '../state/store'
import { readBest } from './scores'

vi.mock('../components/BodyViewport', () => ({
  default: ({ onSelect }: { onSelect: (id: string) => void }) => <button onClick={() => onSelect('brain')}>Pick body brain</button>,
}))
afterEach(() => { useExplorer.getState().selectOrgan(null); window.localStorage.clear() })
it('accepts a body pick and a keyboard list answer, locks feedback and highlights the correct organ', async () => {
  const questions: Question[] = [{ kind: 'find', correctId: 'heart' }, { kind: 'find', correctId: 'pancreas' }]
  const { container } = render(<QuizSession questions={questions} fixture={false} theme="dark" exit={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Pick body brain' }))
  expect(screen.getByRole('heading', { name: 'The correct answer is Heart.' })).toBeVisible()
  expect(useExplorer.getState().selection.selectedOrgan).toBe('heart')
  expect(container.querySelector('[aria-live]')).toHaveTextContent('Incorrect. Heart is the answer.')
  fireEvent.click(screen.getByRole('button', { name: 'Pick body brain' }))
  expect(screen.getByText('Score 0')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }))
  const option = screen.getByRole('option', { name: 'Pancreas' })
  option.focus()
  fireEvent.keyDown(option, { key: 'Enter' })
  expect(useExplorer.getState().selection.selectedOrgan).toBe('pancreas')
  expect(screen.getByText('Score 1')).toBeVisible()
  expect(screen.getByText('The pancreas produces enzymes that help digest food in the small intestine.')).toBeVisible()
})
it('finishes ten comparisons, stores the best score and reviews every answer', () => {
  const questions: Question[] = Array.from({ length: 10 }, () => ({ kind: 'higher', location: 'JPN', country: 'Japan', year: 2023,
    a: { id: 'heart', value: 12.34 }, b: { id: 'brain', value: 123.4 }, correctId: 'brain' }))
  render(<QuizSession questions={questions} fixture={false} theme="dark" exit={() => {}} />)
  for (let index = 0; index < 10; index++) {
    fireEvent.click(screen.getByRole('button', { name: `${index === 0 ? 'Heart' : 'Brain'} Higher age-standardized death rate` }))
    expect(screen.getByText('12.34')).toBeVisible()
    expect(screen.getByText('123.4')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: index === 9 ? 'See results' : 'Next question' }))
  }
  expect(screen.getByRole('heading', { name: 'You scored 9 / 10' })).toHaveFocus()
  expect(screen.getByText(/Best score: 9 \/ 10/)).toBeVisible()
  expect(readBest('higher', false)).toBe(9)
  fireEvent.click(screen.getByRole('button', { name: 'Review answers' }))
  const review = screen.getByRole('list')
  expect(within(review).getAllByRole('listitem')).toHaveLength(10)
  expect(within(review).getByText('Incorrect.')).toBeVisible()
})
it('prevents a rapid duplicate answer from changing the score', () => {
  const question: Question = { kind: 'higher', location: 'JPN', country: 'Japan', year: 2023,
    a: { id: 'heart', value: 100 }, b: { id: 'brain', value: 20 }, correctId: 'heart' }
  render(<QuizSession questions={[question]} fixture theme="light" exit={() => {}} />)
  const correct = screen.getByRole('button', { name: 'Heart Higher age-standardized death rate' })
  const incorrect = screen.getByRole('button', { name: 'Brain Higher age-standardized death rate' })
  act(() => { fireEvent.click(correct); fireEvent.click(incorrect) })
  expect(screen.getByText('Score 1')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible()
})
