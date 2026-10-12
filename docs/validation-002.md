# Issue 002 — validation and design review (12 October 2026)

This note records what the worker actually ran for issue 002 and what it could not run. It is worker-side validation, not independent certification.

## Reporting trail

- Covered week: Monday 5 October 00:00 UTC to Sunday 11 October 24:00 UTC. Publication date: 12 October 2026.
- All reads used `https://api.imd.fun` with a distinct `User-Agent`. Job lists were paged with `since`/`before`/`limit=500` (23 pages, 11,345 jobs created 21 September to 12 October); oracle requests (11 pages), launches (1 page) and workflows (1 page) the same way; publications by page (30 pages of 100, newest first). Every job completed in the week (3,693) was fetched individually from `/jobs/:id` for its accepted nodes and their seats.
- `numbers.accepted` = completed jobs whose last update fell in the week (3,693; 4,517 the week before, the same figure issue 001 reported). `launches` = launches first recorded in the week and now live (203 of 242). `answers` = oracle requests attested in the week (953). `online` = `connectedDaemons` from `/health` at 01:00 UTC on 12 October (966).
- Meter: 50 × 3,693 ÷ 4,517 = 40.9 → 41; 18% fewer completed jobs.
- Leaders: accepted nodes inside the week's completed jobs, credited to each node's seat: Seat #1120 (32), Seat #1943 (31), Seat #13 (29). `leadersScope` is `this week`.
- `/steps/hourly` still exposes only the latest 24 hours, so it was recorded but could not supply a weekly total.
- Stories: each `source` is the API record read for it; every selected record was published or attested inside the week. The compact trail (`artifacts/002-counts.json`, `artifacts/002-story-evidence.json`) is re-checked by `node scripts/check-evidence.mjs`; it is a working file and may not accompany the published source.
- Exclusions: test/placeholder launches, copycat tokens and the many near-duplicate "top tweets" sites were left out. Stories about fee, treasury and lending mechanics were left out as too close to price talk for this paper.

## Commands and results (final source)

| Command | Result |
| --- | --- |
| `npm ci` | 158 packages, no vulnerabilities reported |
| `npm run typecheck` | passes (no output) |
| `npm run build` | passes; `dist/index.html` 49 kB, one CSS and one JS asset, `feed.xml` with 2 items |
| `npm run check` | content check passes for 2 issues; evidence check passes for issue 002 (issue 001's trail is not in the tree, reported as not re-checked) |
| `npm test` | **57 checks passed** in Chromium 156 (headless shell) |

The build ran in a mirror directory outside the repository (`$TMPDIR/imd-build`) so that `node_modules/` and browser downloads never entered the tree; `dist/`, `feed.xml`, `issues/index.json` and the result files were copied back.

## What the browser suite covered

Two real issues produce two tabs, newest first, only the first tagged Latest; direct `#no1`/`#no2` links; ArrowRight/ArrowLeft/Home/End, browser Back and the skip link on a three-edition fixture; the sources switch (hidden by default, 17 source links when shown for issue 002); Visit links always visible and opening in a new tab; Read more/less by keyboard; glossary dialog open/Escape/focus return with an axe scan; the oldest issue keeps the all-time seats heading and its real publication date (Saturday 10 October 2026); the newest shows "Hardest-working seats this week" and "Workers online"; no horizontal overflow at 1440, 1024, 768, 390 and 320 px; axe WCAG 2.2 AA scans with zero violations at all five widths; 200% text enlargement without overflow; six measured text/background pairs all ≥ 4.97:1; dark-scheme preference keeps the paper light; offline reading with all external requests blocked; the latest paper readable without JavaScript; relative asset URLs; no external scripts; RSS ordering and parity with the root feed.

## Limitations

- **Web fonts did not render in the test browser.** This machine's outbound proxy refused the Google Fonts hosts for Chromium (407), so all rendered checks and screenshots use the serif/sans fallbacks. The suite records this as `fontFetchBlocked` and treats those font-host errors as environment noise; any other console error still fails. Font metrics, masthead blackletter rendering and the exact line wraps with the real fonts were therefore not observed.
- Emulated viewports, not physical devices; no screen-reader session, native zoom, Firefox/Safari, forced-colors or print checks.
- The share image was generated locally (1200×630 PNG); `og:image` uses a relative URL because no publication URL is known, so some scrapers may need the absolute URL once the site is pinned.

## Better Interface review (six domains)

Coverage: the without-a-browser checks for all six domains were run against the source; the with-a-browser checks were run in headless Chromium with fallback fonts (see limitation above).

- Accessibility: tabs, switch, dialog and disclosures keep their existing roles and keyboard support; axe clean at five widths and inside the dialog. No new findings.
- Layout: first screen at 390 px shows the masthead, date line and edition tabs, with the lead headline immediately below; no overflow at any width. No new findings.
- Writing: issue 002 prose was checked against the paper's prohibited-language screen and read for jargon; "helpers" is used for workers throughout the stories, the glossary explains the six terms used. Finding fixed: the seats heading and online label now say what they count (`src/App.tsx:149`, `:163`).
- Typography: no new sizes added; the one type scale in `DESIGN.md` is unchanged.
- Colors: six measured pairs ≥ 4.97:1; unchanged palette.
- UI: the Latest tag, sources switch and meter behave as before with two issues. Finding fixed: `index.html` lacked `og:title`/`og:image`; added with a local 1200×630 image (`index.html:12-17`).
