# Issue 002 — validation and design review (12 October 2026)

This note records what the worker actually ran for issue 002 and what it could not run. It is worker-side validation, not independent certification.

## Reporting trail

- Covered week: Monday 5 October 00:00 UTC to Sunday 11 October 24:00 UTC. Publication date: 12 October 2026.
- All reads used `https://api.imd.fun` with a distinct `User-Agent`. Job lists were paged with `since`/`before`/`limit=500` (23 pages, 11,345 jobs created 21 September to 12 October); oracle requests (11 pages), launches (1 page) and workflows (1 page) the same way; publications by page (30 pages of 100, newest first). Every job completed in the week (3,693) was fetched individually from `/jobs/:id` for its accepted nodes and their seats.
- `numbers.accepted` = completed jobs whose last update fell in the week (3,693; 4,517 the week before, the same figure issue 001 reported). `launches` = launches first recorded in the week and now live (203 of 242). `answers` = oracle requests attested in the week (953). `online` = `connectedDaemons` from `/health` at 01:00 UTC on 12 October (966).
- Meter: 50 × 3,693 ÷ 4,517 = 40.9 → 41; 18% fewer completed jobs.
- Leaders: every accepted node whose acceptance time (the node's last update) falls from 5 October 00:00 UTC inclusive to 12 October 00:00 UTC exclusive, credited to the node's seat, regardless of the parent job's final state: Seat #1120 (32), Seat #13 (31), Seat #1943 (31; ties list the lower seat number first). `leadersScope` is `this week`. The first submission counted only nodes inside completed jobs (Seat #13 then showed 29); see the revision note below.
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
| `npm test` | **58 checks passed** in Chromium 156 (headless shell) on the revised source (57 on the first submission; the revision added one RSS link check) |

The build ran in a mirror directory outside the repository (`$TMPDIR/imd-build`) so that `node_modules/` and browser downloads never entered the tree; `dist/`, `feed.xml`, `issues/index.json` and the result files were copied back.

## What the browser suite covered

Two real issues produce two tabs, newest first, only the first tagged Latest; direct `#no1`/`#no2` links; ArrowRight/ArrowLeft/Home/End, browser Back and the skip link on a three-edition fixture; the sources switch (hidden by default, 17 source links when shown for issue 002); Visit links always visible and opening in a new tab; Read more/less by keyboard; glossary dialog open/Escape/focus return with an axe scan; the oldest issue keeps the all-time seats heading and its real publication date (Saturday 10 October 2026); the newest shows "Hardest-working seats this week" and "Workers online"; no horizontal overflow at 1440, 1024, 768, 390 and 320 px; axe WCAG 2.2 AA scans with zero violations at all five widths; 200% text enlargement without overflow; six measured text/background pairs all ≥ 4.97:1; dark-scheme preference keeps the paper light; offline reading with all external requests blocked; the latest paper readable without JavaScript; relative asset URLs; no external scripts; RSS ordering and parity with the root feed.

## Limitations

- **Web fonts did not render in the first submission's test browser.** That machine's outbound proxy refused the Google Fonts hosts for Chromium (407), so those rendered checks and screenshots used the serif/sans fallbacks. The suite records this as `fontFetchBlocked` and treats those font-host errors as environment noise; any other console error still fails. On the revision run (12 October, after 02:30 UTC) the fonts loaded (`fontFetchBlocked: false`, no request failures, no console errors), so the masthead and body fonts were rendered in that run; the measured contrast pairs were unchanged.
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

## Revision (12 October 2026, after independent review)

An independent reviewer reopened the issue with one reproducible defect and four advisory reports. Each was reproduced against `https://api.imd.fun` (own User-Agent) before anything changed; the answers are in `.imd-responses.json`.

- **Weekly leaders (fixed).** The first count admitted accepted nodes only inside jobs that had completed. Jobs `9012ff0b…` and `392d4596…` are `blocked` yet each holds an accepted review by Seat #13 dated inside the week (7 October 00:13 UTC and 6 October 13:56 UTC), so the published 29 under-counted that seat. Recount: every job created from 1 October, or last updated from 3 October, up to 12 October 00:00 UTC (6,233 jobs) was fetched from `/jobs/:id`; every accepted node with a seat whose last update (its acceptance time) falls from 5 October 00:00 UTC inclusive to 12 October 00:00 UTC exclusive counts, whatever the parent job's final state. 6,609 such nodes (6,372 in completed jobs, 237 in blocked ones); none belonged to a job created before 4 October, so earlier jobs cannot change the ranking. Result: Seat #1120 (32), Seat #13 (31), Seat #1943 (31), ties ordered by seat number. The old rule reproduced the first submission's 32/31/29 exactly, confirming the trail. `scripts/check-evidence.mjs` now enforces the acceptance-time rule, and the rebuilt trail (`artifacts/002-counts.json`, `artifacts/002-story-evidence.json`, working files kept out of the submission) re-derives 3,693 completed jobs, 203 launches, 953 answers and the three leaders from fresh reads.
- **Answer stories (fixed).** The health answer now says 54 helpers checked and 53 agreed (the record has `panelSize` 100 but 54 members); the Heathrow answer says four helpers checked and all four agreed (`panelSize` 5, 4 members). The transfer question is reworded without token, block or ledger vocabulary; the count (121) and agreement (142, above 140) are unchanged.
- **RSS links (fixed).** IMD's publication record for issue 001 (`/publications?q=changelog`, site label `changelog-md-test`, named 10 October 2026) gives the paper's public address, which serves the paper and its feed. `scripts/content.mjs` now uses it as the feed's channel link and links each item to `#noN` there; `PAPER_SITE_URL` still overrides it. One new browser-suite check verifies the production feed's links.
- **Share metadata (disputed, unchanged).** The acceptance criteria for this assignment require `index.html` to carry `og:title` and `og:image`, so the seven meta tags and the local 1200×630 image stay. No other page code changed.

Commands on the final revised source, in the external mirror: `npm ci` (158 packages), `npm run typecheck` (clean), `npm run build` (49.67 kB `index.html`, one CSS and one JS asset, feed with 2 items), `node scripts/check-content.mjs` and `node scripts/check-evidence.mjs` (pass; issue 002 re-derived from the rebuilt trail), `npm test` (**58 checks passed**, zero axe violations at five widths, no overflow, no console errors or request failures, fonts loaded this time). `issues/001.json` is byte-for-byte unchanged in this revision.
