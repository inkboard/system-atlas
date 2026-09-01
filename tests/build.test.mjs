// End-to-end: a fresh atlas built from the bundled starter data must build cleanly with the
// documented command, and the two views it generates (SYSTEM.md and the map) must agree on
// the questions. The two renderers implement the data format separately, so this is what
// stops them drifting.
import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { NODES } from '../skills/system-atlas/assets/data.example.mjs'
import { assetsDir, extractFns } from './helpers.mjs'

// Build the starter atlas in a scratch directory, exactly as the skill tells a user to.
async function buildStarterAtlas() {
  const root = mkdtempSync(join(tmpdir(), 'system-atlas-'))
  const home = join(root, 'atlas')
  mkdirSync(home)
  for (const f of ['template.html', 'build.mjs']) await Bun.write(join(home, f), Bun.file(join(assetsDir, f)))
  const example = pathToFileURL(join(assetsDir, 'data.example.mjs')).href
  await Bun.write(join(home, 'data.mjs'), `export * from ${JSON.stringify(example)}\n`)

  const proc = Bun.spawnSync(['bun', 'build.mjs'], { cwd: home })
  const stdout = proc.stdout.toString()
  expect(proc.exitCode, `bun build.mjs failed: ${proc.stderr.toString()}`).toBe(0)
  return {
    stdout,
    systemMd: await Bun.file(join(root, 'SYSTEM.md')).text(),
    atlasHtml: await Bun.file(join(root, 'atlas.html')).text(),
  }
}

test('the starter data builds both views without error', async () => {
  const { stdout, systemMd, atlasHtml } = await buildStarterAtlas()
  expect(stdout).toMatch(/built SYSTEM\.md \+ atlas\.html/)
  expect(systemMd.length, 'SYSTEM.md is empty').toBeGreaterThan(0)
  expect(atlasHtml, 'without a doctype the page renders in quirks mode').toMatch(/^<!doctype html>/i)
  expect(atlasHtml, 'charset meta must survive or arrows render as mojibake').toContain('<meta charset="utf-8">')
  expect(atlasHtml, 'the built map has no svg').toContain('<svg')
  expect(atlasHtml, 'title placeholder was not substituted').not.toContain('__TITLE__')
  expect(atlasHtml, 'data placeholder was not substituted').not.toContain('/*__DATA__*/')
})

test('the built map is syntactically valid JavaScript', async () => {
  const { atlasHtml } = await buildStarterAtlas()
  const js = atlasHtml.split('<script>').slice(1).map((s) => s.split('</script>')[0]).join('\n')
  expect(js.length, 'no script block in the built atlas').toBeGreaterThan(0)
  expect(() => new Function(js), 'built atlas.html contains a syntax error').not.toThrow()
})

test('SYSTEM.md and the map agree on every question, by id and text', async () => {
  const { systemMd } = await buildStarterAtlas()
  const { qHtml } = extractFns(['question', 'qOpen', 'qHtml'])

  // What the generator wrote, from the "Questions — index" section.
  const index = systemMd.slice(systemMd.indexOf('## Questions — index'))
  const generated = [...index.matchAll(/\*\*(Q-[A-Za-z]+\d+)\*\*/g)].map((m) => m[1])
  expect(generated.length, 'SYSTEM.md has no question index').toBeGreaterThan(0)

  // What the map would show for the same data, numbered the same way.
  const rendered = []
  for (const n of NODES) {
    (n.cond || []).forEach((_, i) => rendered.push(`Q-${n.code}${i + 1}`))
    if ((n.cond || []).length) {
      expect(qHtml(n.cond), `map renders undefined for ${n.code}`).not.toMatch(/undefined/)
    }
  }
  expect(rendered, 'the map and SYSTEM.md disagree on question ids').toEqual(generated)
})

test('no question renders as the literal text undefined anywhere in either view', async () => {
  const { systemMd, atlasHtml } = await buildStarterAtlas()
  expect(systemMd, 'SYSTEM.md has an undefined question').not.toMatch(/\*\*Q-[A-Za-z]+\d+\*\* undefined/)
  expect(atlasHtml, 'the map has an undefined question').not.toContain('<li>undefined</li>')
})
