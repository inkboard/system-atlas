// The atlas renderer ships as one self-contained HTML file, so its functions cannot be
// imported: the script's top level touches `document` and ends by rendering chapter 1.
// These helpers lift individual declarations out by NAME and evaluate just those, so the
// tests do not depend on line order, on neighbouring code, or on a DOM.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const assetsDir = join(here, '..', 'skills', 'system-atlas', 'assets')
export const templatePath = join(assetsDir, 'template.html')
export const template = await Bun.file(templatePath).text()

export function templateScript() {
  const open = template.indexOf('<script>')
  const close = template.indexOf('</script>', open)
  if (open === -1 || close === -1) throw new Error('template.html has no <script> block')
  return template.slice(open + '<script>'.length, close)
}

// Walk forward from `i`, tracking strings, template literals (including ${} nesting) and
// comments, until bracket depth returns to 0 and we hit `stop`. Returns the end index.
function scanDecl(src, i, stop) {
  let depth = 0
  const stack = [] // 'tpl' frames for ${ } inside template literals
  while (i < src.length) {
    const c = src[i], n = src[i + 1]
    if (c === '/' && n === '/') { i = src.indexOf('\n', i); if (i === -1) break; continue }
    if (c === '/' && n === '*') { i = src.indexOf('*/', i) + 2; continue }
    if (c === "'" || c === '"') {
      const q = c; i++
      while (i < src.length && src[i] !== q) i += src[i] === '\\' ? 2 : 1
      i++; continue
    }
    if (c === '`') {
      i++
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue }
        if (src[i] === '`') { i++; break }
        if (src[i] === '$' && src[i + 1] === '{') { stack.push(depth); depth = 0; i += 2; break }
        i++
      }
      continue
    }
    if (c === '{' || c === '(' || c === '[') { depth++; i++; continue }
    if (c === '}' || c === ')' || c === ']') {
      if (c === '}' && depth === 0 && stack.length) {
        // closing a ${ } — resume the enclosing template literal
        depth = stack.pop(); i++
        while (i < src.length) {
          if (src[i] === '\\') { i += 2; continue }
          if (src[i] === '`') { i++; break }
          if (src[i] === '$' && src[i + 1] === '{') { stack.push(depth); depth = 0; i += 2; break }
          i++
        }
        continue
      }
      depth--; i++
      if (stop === '}' && depth === 0) return i
      continue
    }
    if (c === stop && depth === 0 && !stack.length) return i + 1
    i++
  }
  throw new Error('unterminated declaration while scanning template script')
}

// Source text of one named declaration (`const x = …;` or `function x(…){…}`).
export function declSource(name, src = templateScript()) {
  const re = new RegExp(`(?:^|[\\n;{}])\\s*(const|let|var|function)\\s+${name}\\b`)
  const m = re.exec(src)
  if (!m) throw new Error(`template.html no longer declares "${name}" — update the test or the template`)
  const start = m.index + m[0].indexOf(m[1])
  if (m[1] === 'function') {
    const brace = src.indexOf('{', start)
    return src.slice(start, scanDecl(src, brace, '}'))
  }
  return src.slice(start, scanDecl(src, start + m[1].length, ';'))
}

// Evaluate the named declarations together and hand them back as real functions.
export function extractFns(names, globals = {}) {
  const src = templateScript()
  const body = names.map((n) => declSource(n, src)).join('\n')
  const keys = Object.keys(globals)
  try {
    return new Function(...keys, `${body}\nreturn {${names.join(',')}};`)(...keys.map((k) => globals[k]))
  } catch (err) {
    throw new Error(`could not evaluate ${names.join(', ')} in isolation: ${err.message}`)
  }
}
