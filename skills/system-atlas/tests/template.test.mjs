import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { CH, FLOWS, NODES } from '../assets/data.example.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const template = readFileSync(join(here, '..', 'assets', 'template.html'), 'utf8')

function extract(start, end) {
  const from = template.indexOf(start)
  const to = template.indexOf(end, from)
  assert.notEqual(from, -1, `template must contain ${start}`)
  assert.notEqual(to, -1, `template must contain ${end}`)
  return template.slice(from, to)
}

function loadQuestionHelpers() {
  const start = template.includes('const question=') ? 'const question=' : 'const qOpen='
  const source = extract(start, 'const esc=')
  return new Function('NODES', `${source}\nreturn { qOpen, qHtml }`)(NODES)
}

function loadBendFor() {
  const source = extract('function bendFor', 'function buildInsideScene')
  return new Function('FLOWS', `${source}\nreturn bendFor`)(FLOWS)
}

test('open string questions render their text', () => {
  const { qOpen, qHtml } = loadQuestionHelpers()
  const webChat = NODES.find((node) => node.id === 'U')

  assert.equal(qOpen(webChat), 1)
  const html = qHtml(webChat.cond)
  assert.match(html, /Where does the page live\?/)
  assert.doesNotMatch(html, /undefined/)
})

test('chapter-only hops work when the atlas defines one flow', () => {
  const bendFor = loadBendFor()
  const later = CH.find((chapter) => chapter.id === 'later')
  const [from, to] = later.flow[0]

  assert.equal(FLOWS.length, 1, 'fixture must keep the one-flow regression case')
  assert.doesNotThrow(() => bendFor(from, to))
  assert.equal(bendFor(from, to), 'yx')
})

test('declared hop bends still take precedence', () => {
  const bendFor = loadBendFor()
  const [from, to, , , bend] = FLOWS[0].hops[0]

  assert.equal(bendFor(from, to), bend)
})
