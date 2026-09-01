// Renderer behaviour: the question shapes and the chapter-hop bend lookup.
import { expect, test } from 'bun:test'

import { CH, FLOWS, NODES } from '../skills/system-atlas/assets/data.example.mjs'
import { extractFns } from './helpers.mjs'

test('all three documented question shapes render their text', () => {
  const { qHtml, qOpen } = extractFns(['question', 'qOpen', 'qHtml'])
  const cond = [
    'a plain string is an open question',
    { q: 'resolved?', r: 'yes (2026-01-01)' },
    { q: 'routed?', to: 'Memory deep dive' },
  ]
  const html = qHtml(cond)
  expect(html).toMatch(/a plain string is an open question/)
  expect(html).toMatch(/resolved\?/)
  expect(html).toMatch(/routed\?/)
  expect(html, 'string questions must be normalised before reading .q').not.toMatch(/undefined/)
  expect(qOpen({ cond }), 'only the plain string counts as open').toBe(1)
})

test('the bundled starter data renders no undefined questions', () => {
  const { qHtml } = extractFns(['question', 'qOpen', 'qHtml'])
  for (const n of NODES) {
    if (!(n.cond || []).length) continue
    expect(qHtml(n.cond), `structure ${n.code} renders an undefined question`).not.toMatch(/undefined/)
  }
})

test('every chapter flow resolves a bend without throwing', () => {
  const { bendFor } = extractFns(['bendFor'], { FLOWS })
  for (const c of CH) {
    for (const h of c.flow || []) {
      expect(() => bendFor(h[0], h[1]), `chapter "${c.id}": hop ${h[0]} -> ${h[1]}`).not.toThrow()
    }
  }
})

test('chapter hops resolve when the atlas declares a single flow', () => {
  // Regression: bendFor used to read FLOWS[1].hops unconditionally, so a chapter hop that
  // was not in the first flow threw on any atlas with fewer than two flows.
  const oneFlow = [{ id: 'only', name: 'Only', hops: [['A', 'B', 'x', {}, 'yx']] }]
  const { bendFor } = extractFns(['bendFor'], { FLOWS: oneFlow })
  expect(bendFor('A', 'B'), 'a declared bend still wins').toBe('yx')
  expect(bendFor('X', 'Y'), 'an undeclared hop falls back instead of throwing').toBe('yx')
})

test('a declared hop bend takes precedence over the fallback', () => {
  const { bendFor } = extractFns(['bendFor'], { FLOWS })
  const [from, to, , , bend] = FLOWS[0].hops.find((h) => h[4]) || []
  if (!from) return // starter data declares no explicit bends; nothing to assert
  expect(bendFor(from, to)).toBe(bend)
})
