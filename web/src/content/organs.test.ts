import { describe, expect, it } from 'vitest'
import { organs } from '../data/contract'
import { oneLineFunction, organContent } from './organs'
import { educationSources } from './sources'

describe('organ education', () => {
  it('covers exactly the contract groups with concise, sourced content', () => {
    expect(Object.keys(organContent).sort()).toEqual(organs.map(organ => organ.id).sort())
    for (const organ of organs) {
      const content = organContent[organ.id]
      expect(content.summary.match(/[.!?](?:\s|$)/g)?.length, organ.id).toBeGreaterThanOrEqual(2)
      expect(content.summary.match(/[.!?](?:\s|$)/g)?.length, organ.id).toBeLessThanOrEqual(3)
      expect(content.structures.length).toBeGreaterThanOrEqual(3)
      expect(content.structures.length).toBeLessThanOrEqual(5)
      for (const text of [content.summary, ...content.structures, content.burden, content.fact]) {
        expect(text.trim().length, organ.id).toBeGreaterThan(2)
        expect(text).not.toMatch(/https?:\/\//)
      }
      expect(content.summary + content.fact).not.toMatch(/\d|%/)
      expect(oneLineFunction(organ.id).endsWith('.')).toBe(true)
      for (const source of content.sources) expect(educationSources[source]).toBeTruthy()
      expect(content.sources).toContain('openstax')
      if (organ.kind === 'systemic') expect(content.burden).toMatch(/single|systemic|different|across|several/)
    }
  })
  it('states important mapping limits instead of implying complete organ disease totals', () => {
    expect(organContent.thyroid.burden).toMatch(/Only thyroid cancer/)
    expect(organContent.pancreas.burden).toMatch(/Diabetes.*Diabetes & metabolic/)
    expect(organContent.muscles.burden).toMatch(/No primary cause/)
    expect(organContent.bones_joints.burden).toMatch(/entire musculoskeletal/)
  })
})
