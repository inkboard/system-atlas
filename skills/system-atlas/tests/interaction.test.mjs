// Fences around the interaction layer. These bugs were all invisible in review and all
// silent at runtime — nothing threw, the map simply stopped responding to clicks — so
// they are worth pinning to the source rather than trusting a future reader to notice.
import { expect, test } from 'bun:test'

import { declSource, templateScript } from './helpers.mjs'

test('hovering a structure does not rebuild the scene', () => {
  // render() starts with world.innerHTML='' — calling it from mouseenter detaches the very
  // element under the cursor, so the browser never pairs press with release and no click
  // is ever synthesised. That is what made click-to-pin silently do nothing.
  const src = templateScript()
  const offenders = []
  for (const m of src.matchAll(/addEventListener\('mouseenter',[^)]*?\{([^}]*)\}/g)) {
    if (/\brender\(\)/.test(m[1])) offenders.push(`render() in: ${m[1].trim()}`)
    if (/\bdrawPackets\(\)/.test(m[1])) offenders.push(`drawPackets() in: ${m[1].trim()}`)
  }
  expect(offenders, 'a hover handler rebuilds its layer, detaching the element under the cursor').toEqual([])
})

test('selection is driven by pointer events, not click', () => {
  // Same reason: a `click` listener on a node or packet is unreachable in this renderer.
  const src = templateScript()
  expect(src, 'selection must be wired to pointerup').toMatch(/addEventListener\('pointerup'/)
  expect(src, 'per-element click listeners never fire here').not.toMatch(/g\.addEventListener\('click'/)
  expect(src, 'per-element dblclick listeners never fire here').not.toMatch(/g\.addEventListener\('dblclick'/)
})

test('pointer capture is deferred until a drag actually starts', () => {
  // Capturing on pointerdown retargets the click to the svg, away from the node.
  const src = templateScript()
  const down = /addEventListener\('pointerdown',([\s\S]*?)\n(?=svg\.addEventListener|\/\*)/.exec(src)
  expect(down, 'could not find the svg pointerdown handler').toBeTruthy()
  expect(down[1], 'pointerdown must not capture — defer it to pointermove').not.toMatch(/setPointerCapture/)
  expect(src, 'capture should be taken once the drag passes the threshold').toMatch(/pointermove[\s\S]*setPointerCapture/)
})

test('hit targets carry the identifiers the pointer handler reads', () => {
  const src = templateScript()
  expect(src, 'structure groups must keep their .node class').toMatch(/class:'node'/)
  expect(src, 'structure groups must carry data-id').toMatch(/'data-id':n\.id/)
  expect(src, 'packet groups must carry data-i').toMatch(/'data-i':i/)
  expect(declSource('drawPackets', src), 'packet groups must keep their .pkt class').toMatch(/class:'pkt'/)
})

test('bendFor searches every declared flow, not a fixed pair', () => {
  expect(declSource('bendFor'), 'bendFor must not index FLOWS by a literal').not.toMatch(/FLOWS\[\d+\]/)
})
