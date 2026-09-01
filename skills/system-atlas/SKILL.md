---
name: system-atlas
description: Build and maintain an explorable, progressively-disclosed isometric "atlas" of a system's architecture — an interactive page (hover to read, click to pin, go inside for steps, moving data packets you can inspect, chapters that reveal the system a few structures at a time) plus a generated text twin (SYSTEM.md) and question tracking by ID, all from one data file in the repo. Use this whenever someone wants to discuss, design, review, or explain an architecture visually — "make an atlas", "map the system", "make the architecture explorable", "visualize the codebase/agent/pipeline so we can talk about it", "a diagram I can click around", "walk me through how it fits together", or when an architecture discussion is producing a pile of open questions that need tracking across feedback rounds. Also use it to update an existing atlas after decisions change.
---

# System Atlas

An atlas is one data file that renders two views: an **interactive isometric map** (a single self-contained HTML file), and a **generated text twin** (`SYSTEM.md`) with the decisions table, every structure, the flows, and the open questions by ID. The data file is the only thing anyone edits; both views rebuild from it. It sits beside a hand-written glossary (`CONTEXT.md`) and ADRs.

The reason for this shape: an architecture discussion produces decisions, questions, and vocabulary faster than any one document can hold, and the person you are discussing with wants to *see* the system, not read it. The map is for them; the text twin is for the repo and for you next session; the single source is what keeps the two honest.

This skill was distilled from building a real agent-architecture atlas across one long design session and several rounds of feedback. The user's corrections from that session are the rules below; `references/process-and-lessons.md` has the story.

## When to reach for it — and when not

Use it when the system is new enough that vocabulary, decisions, and questions are still moving, and there will be more than one feedback round. Don't use it for a finished system that only needs a README, or for one diagram in a PR.

## Process

Follow the order — each step was earned by a correction the first time round.

1. **Read the inputs before drawing.** The vision doc, the repo's existing surfaces, and whatever prior art the user allows (ask — they may forbid a branch or a source). If you will build on a framework, read its docs first; hand long docs to a subagent with your specific design questions and have it return a primer with gotchas and a "what it does not give us" list. Drawing before this produces boxes that don't map to anything real.
2. **Discuss before drawing.** Propose the structure in chat, mapped to the runtime's real primitives, and ask only the questions you cannot derive from the repo. Take defaults for the rest and say which. Ask as plain chat text.
3. **First atlas — the whole system.** Copy `assets/` into the atlas home (`template.html`, `build.mjs`, and `data.example.mjs` renamed to `data.mjs`), fill the data, build, publish. **Where the atlas home is depends on the repo's docs policy.** Some repos commit design docs freely — then `docs/<system>/atlas/` in-tree is right. Other repos deliberately commit only ADRs and `CONTEXT.md`, with specs and evidence going to the issue tracker instead; in that case put the atlas, `SYSTEM.md` and `research/` in a git-ignored scratch directory and attach `SYSTEM.md` plus the research to the spec issue as comments when the spec is published, keeping only `docs/<system>/adr/` and `docs/<system>/CONTEXT.md` in-tree. Ask which policy applies before committing anything. Learned the hard way: committing the whole set produced a 3,900-line docs PR and four review rounds reconciling three restatements of one design — with ADRs plus a glossary only, there is one place to be consistent. If your agent has a design-guidance skill for HTML artifacts, load it before touching the template; read `references/design-language.md` for the visual rules either way.
4. **Progressive disclosure.** A whole system at once reads as noise ("hard to parse" was the first correction). Ten-ish chapters; each adds at most three structures and runs one small flow that only touches revealed structures; the last chapter shows everything with a flow picker. Unrevealed structures stay in the index, dimmed, with their chapter number. Panels are summary-first: one sentence, then *Read more* and *Steps* folded.
5. **Shapes and labels.** Letters on boxes are not enough ("better box shapes/labelling" was the second correction). Give each role a shape and put a readable name label on the canvas under every structure — see design-language.
6. **Text twin.** `CONTEXT.md` is a glossary and nothing else (domain-model format: the nouns, one line each); ADRs only for decisions that are hard to reverse, surprising without context, and the result of a real trade-off — these two are the in-tree pieces. `SYSTEM.md` is generated and `research/` holds evidence; both live with the atlas (scratch dir or `docs/`, per step 3). Don't open issues unless asked.
7. **Feedback by question ID.** Every question is `Q-<code><n>` with a state: open (a string), resolved `{q, r}` (answer + date), or routed `{q, to}` (handed to a named next step such as a deep dive). Record the user's words. If they call something "not a question", drop it; if they say "I don't get this", explain with a concrete example *before* resolving. After each round: rebuild, republish, update memory.
8. **Deep dives feed back.** Research with subagents against one shared brief (the interface we own, the requirements that separate candidates, a usage model for cost, a fixed deliverable shape). Write a synthesis with a normalized cost/fit grid. Fold resolutions into the data as `{q, r: '… (from the deep dive, date)'}`. If the user rejects a proposal, sweep *every* file and rewrite — a banner on top of a stale section is not enough; they will find it.
9. **Keep it current.** "The atlas is great for me — but not if it's not up to date." One source, rebuild and republish after every change, never hand-edit generated files, and leave a `README.md` in the docs folder explaining the set (table in process-and-lessons).

## Publishing the map

`atlas.html` is one self-contained file — no build step, no external assets beyond a Google Fonts stylesheet. Publish it whichever way the person can actually open:

- If your agent can publish a hosted HTML artifact, publish it there and keep the URL stable across rebuilds; put it in `META.artifactUrl` so the generated `SYSTEM.md` links to it.
- Otherwise serve the folder with any static server (`npx serve`, `python3 -m http.server`) and hand over the local URL, or commit the file and let the repo's pages host serve it.

Either way the rule is the same: one URL, republished after every data change, never a second copy.

## What done looks like

- `<atlas home>/data.mjs` exists and is the only edited source; `bun <atlas home>/build.mjs` writes `SYSTEM.md` and `atlas.html` without error.
- The atlas is published at a stable URL and republished there after every data change.
- Every structure has `one`, `what`, `how`, a `short` label, a role `kind`, and its questions; ghosts are marked; chapters exist with per-chapter flows; the last chapter is the whole system.
- `SYSTEM.md` carries the decisions table, the question index with IDs and states, and the "how this file is maintained" footer.
- Project memory records the atlas URL, docs paths, locked decisions with dates, what the user rejected and why, and the next step.

## Verify before publishing

Syntax-check the built script (`new Function(js)`), then look at it: serve the folder with a static server and open it in a real browser — `file://` renders as a static snapshot in some in-app browsers and the fonts may not load. Resize to ~1280×800 and screenshot a first chapter, a middle chapter, the last chapter, an inside view, and the light theme. Keep `<meta charset="utf-8">` at the top of the template or arrows render as mojibake. Click a structure and confirm the panel says **pinned** and offers *Go inside*, and click a packet dot: this renderer rebuilds its whole scene on every draw, so a stray `render()` in a hover handler detaches the element under the cursor and the browser stops synthesising clicks — the map still looks perfect in a screenshot while nothing responds to a click. After every decision, grep the outputs for the stale words (`pending`, the old model name, the rejected design) — the person reads everything.

## Files in this skill

- `assets/template.html` — the atlas renderer (title and top-strip stats injected at build)
- `assets/build.mjs` — `data.mjs` → `atlas.html` + `SYSTEM.md`
- `assets/data.example.mjs` — a minimal starter with every field documented; copy to `data.mjs`
- `references/design-language.md` — layout, palette, isometric grammar, shapes by role, labels, copy rules, the chapter recipe
- `references/process-and-lessons.md` — the first session step by step, the README table, the subagent deep-dive pattern, cost-model habits, things that bit
