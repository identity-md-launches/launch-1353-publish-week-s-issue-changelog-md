# Implemented design

## Overview

CHANGELOG.md is a weekly paper for people who want to understand what the IMD group made without learning its technical vocabulary. It uses the requested light newsprint palette, blackletter masthead, serif reporting, small uppercase labels and newspaper rules. The main story comes first; supporting stories follow in three desk columns, then figures, contributors, an activity meter and a boxed recommendation to follow.

The source of truth is `src/styles.css`, with components in `src/App.tsx`. `index.html` requests the three Google Font families. The design deliberately remains light under both light and dark system preferences. There are no photographs, decorative background downloads, gradients for emphasis, page-load animations or dashboard cards.

## Colors

All component colors use semantic custom properties from `src/styles.css:3`.

| Token | Value | Use |
| --- | --- | --- |
| `--color-paper` | `#f2ead8` | Page, glossary card and diagram interiors |
| `--color-panel` | `#e9dfc8` | Explainer, selected tab, watch box and glossary close control |
| `--color-ink` | `#1f1b16` | Main text and structural rules |
| `--color-accent` | `#b0281c` | Drop cap, dotted underlines, Visit links, Serious label and meter needle |
| `--color-muted` | `#655c4d` | Supporting captions, source links and static switch outline |
| `--color-rule` | `#a79b84` | Secondary dividers and tab outline |
| `--color-focus` | `#b0281c` | Two-pixel keyboard outline, four-pixel offset |

Red is part of the editorial identity as well as the action system. An underline, border, text label or native control provides the additional cue; color is never the only distinction between severities or tab states. Selection uses paper text on accent red. The modal backdrop alone uses transparency: ink at 45% opacity. Borders are not reused as body-text colors.

Measured rendered contrast, recorded by the browser test: ink/paper **14.30:1**, accent/paper **5.54:1**, muted/paper **5.49:1**, ink/panel **12.92:1**, accent/panel **5.01:1**, muted/panel **4.97:1**. These are opaque pairs sampled from real elements; they do not claim universal contrast coverage of every browser state.

## Typography

| Role | Implemented family and fallback | Size / treatment |
| --- | --- | --- |
| Masthead | `UnifrakturMaguntia`, Georgia, Times New Roman, serif | Regular 400; wide-screen clamp 3.8–6.5rem, 7.75vw preferred; line-height 1.07; −.045em tracking |
| Body, headlines, figures | `Newsreader`, Georgia, Times New Roman, serif | Optical sizing automatic; 400/500/600 used; authentic regular and italic faces requested |
| Labels, tabs, action labels | `Libre Franklin`, Arial, sans-serif | 400–700 requested; uppercase through CSS, with positive tracking |

The base body is 1.125rem (18px at the default root). Lead/report text uses 1.0625rem on larger screens and 1.125rem on phones, with line-height 1.5–1.55. The standfirst uses 1.4375rem and 1.4 on desktop, 1.25rem and 1.45 on phones. The lead headline uses a 2.75–3.9rem clamp, −.035em tracking and 1.03 line-height; phone line-height is 1.08. It stays within a deliberate headline measure. Section and story headings are generally 1.6875–1.875rem, differentiated by weight and spacing. The watch headline is 2rem, then 1.875rem on phones.

`--size-label` is .75rem. Primary action labels and the sources switch are 12px at the default root. Compact print-style metadata and badges are 8–12px depending on breakpoint; they are selectable text and enlarge with the reader’s text setting. Body text does not use truncation, justification or line clamping. Headlines use `text-wrap: balance`; descriptions use `pretty`. Lead columns retain ordinary paragraph wrapping. Figures use tabular numerals; the four large figures have a 2.75–4.125rem desktop scale and a responsive phone scale.

All three intended font families were observed loaded in Chromium. The test suite also blocked external font requests and inspected the fallback layout. The main and footer wordmarks use viewport-sensitive sizing on small screens to prevent overflow when other text is enlarged.

## Layout

`.newspaper` caps the entire paper at **1264px**, including 40px horizontal padding on wide screens. The principal consumed spacing tokens are `--space-6` (24px), `--space-8` (32px) and `--space-10` (40px); the root also declares a quarter-rem spacing scale. Smaller component gaps use rem values in the same family, with half steps for compact labels.

Wide-screen `.front-page` is a **2.05:1 grid** with a 40px gap. The lead body has **two CSS text columns** with a 28px gap. `.news-columns` has three equal columns separated by restrained one-pixel rules. The reading order in the DOM is lead, explainer, new projects, bugs, answers, figures, leaders, meter and watch. Numbers use four columns; the leaders and meter share a two-column row. The double-boxed watch uses a 180px label column and flexible story column.

| Breakpoint | Behavior |
| --- | --- |
| Up to **67rem / 1072px** | Page gutters become 28px, lead/explainer ratio 1.8:1, narrower desk gutters and smaller desk headings |
| Up to **53rem / 848px** | Masthead ears sit above the title; lead and explainer stack; explainer temporarily uses a compact internal grid; news desks become one column |
| Up to **37rem / 592px** | Page gutters become 16px; lead text becomes one column; explainer becomes a vertical list; tools row stacks; seat/meter and watch layouts stack |

The phone figures use `repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr))`. Normally they form two columns. At 200% text enlargement they can become one column, preserving readability. The tabs are the one intentional horizontally scrolling region, with a thin scrollbar and automatic selected-tab scrolling for keyboard navigation. The document itself does not scroll sideways at tested widths.

Observed production widths: **1440, 1280, 1024, 768, 390 and 320px**. The 200% text-enlargement check ran at 390px. This was a text-size change, not native browser zoom. No alternate language or right-to-left interface is shipped.

## Elevation & Depth

The paper is flat: no box shadows. Four-pixel double rules establish the masthead and major page divisions. A single ink border contains the shaded explainer. The watch and glossary dialog use four-pixel double boxes. The native dialog enters the browser’s top layer above a dimmed backdrop; its content remains on opaque paper.

## Shapes

The normal form language is square corners, ruled columns and inset content. Circles are limited to numbered explainer steps, the small inline swarm diagram and the switch thumb/track. Serious and Moderate labels are square outlined badges. The local SVG favicon has a six-unit corner radius within its own 64-unit canvas; it is not a component-radius rule.

## Components

All patterns below are implemented in `src/App.tsx`, with matching class names in `src/styles.css`.

| Pattern | Contract and states |
| --- | --- |
| `App` / edition tabs | Takes one `ContentBundle`. Tracks active issue and source visibility. Uses tablist/tab/tabpanel roles, roving `tabIndex`, Left/Right wrapping, Home/End, `#noN` anchors, browser history and a polite status message. Unknown issue numbers show Latest with an explanation. The source preference survives issue changes; article disclosures reset. |
| `Paper` | Takes an `Issue`, optional reporting note and source visibility. Renders every editorial section for that issue. Empty `new`, `bugs` and `answers` arrays get truthful text rather than broken cards. |
| `Text` / glossary | Marks listed terms and their plural forms with dotted red underlines. Buttons retain the surrounding font and open the shared native dialog. The dialog has a title, description and visible close action; Escape closes it and native focus returns to the trigger. |
| `ReadMore` | Native `details`/`summary`; labels change between Read more and Read less with plus/minus. Supports click, Enter and Space. Each accessible name includes its story title. |
| `StoryLinks` / `OutLink` | Visit stays visible outside the disclosure. Source is hidden by default and revealed by the switch. Descriptive accessible names include new-tab behavior; external links use `noopener noreferrer`. |
| Sources switch | Labelled native checkbox with switch role, a 44px minimum label target, on/off thumb placement and visible keyboard outline around the complete label. |
| `Explainer` / `SwarmDrawing` | Three numbered steps; original decorative SVG included inline, with no image request or alternative-text noise. |
| Severity tags | Exactly Serious or Moderate. Red/ink outline and the written label distinguish severity. The prose explains user consequences, not implementation terms. |
| Numbers and notes | Semantic definition list; CSS puts the figure above its label visually. Snapshot caveat stays visible. Native How we counted disclosure holds definitions and meter arithmetic. Sources appear only when requested. |
| Leaders | Ordered top-three list, seat numbers only, tabular contribution totals and a visible lifetime/snapshot explanation. |
| Meter | Ruled bar and red needle positioned by `--level`; `role="meter"` exposes min/max, numeric value and verdict. Static Snoozing/Steady/Frantic labels and visible `50 = the same` explanation. |
| Watch | Double-boxed, shaded editorial callout with Visit and a supplementary source from the edition note. |

Focus outlines are two pixels with four-pixel offset, including on inline glossary words. Tab-list padding makes room for the ring. Coarse pointer actions use at least a 44px height where practical; inline glossary words use the inline-text target exception. Links and controls remain text-selectable. Hover styles are restricted to devices that support hover. There are no animated component transitions; reduced-motion overrides keep scrolling immediate. Forced-colors styles are present, but rendered forced-colors behavior was not tested.

## Do’s and Don’ts

- Add editorial content through the issue schema and its reporting note. Reuse `Paper`, `ReadMore`, `Text` and `StoryLinks`; do not paste untrusted HTML into the page.
- Preserve the light palette, flat rules, font roles and ordinary reading order. Add space before adding another box.
- Keep Visit outside disclosures and sources under the explicit switch. Never require an external request to read an issue.
- Label every count by its actual time range and unit. Snapshot figures need visible snapshot wording.
- Preserve the archive’s immutable issue files. Adding a normal edition changes data, index/feed and export; it should not redesign the application.
- A future additional paper view should begin with `.newspaper` and the existing `Paper` patterns, use the same semantic color tokens and test 320px reflow, enlarged text and keyboard focus before release.

The six-domain review and remaining verification limits are in `artifacts/validation.md`. Attribution to the pinned design/documentation guidance is in `artifacts/THIRD-PARTY-NOTICES.md`.

## Issue 002 additions (12 October 2026)

The design, tokens, type scale and components above are unchanged. Three content-level changes were made in `src/App.tsx`:

- **Date line** (`.date-line`): shows the issue's publication date as a `<time>` element and "Covering <week> · UTC". Dates are publication dates; issue 001 now shows Saturday 10 October 2026.
- **Seats heading** (`#leaders-title`): "Hardest-working seats this week" when the issue's `leadersScope` is `this week`, otherwise "Hardest-working seats of all time" (issues without the field are all-time totals). The small notes beneath it switch with the scope.
- **Online figure** (`.numbers-grid`): labelled "Workers online", with "Workers" wired to the tap-to-explain glossary; the footnote reads "Workers online is a snapshot…".

`index.html` gained Open Graph and Twitter card metadata and a local 1200×630 share image (`public/og-image.png`, paper colour `#f2ead8`, ink `#1c1814`, rendered with the serif fallback). Nothing else in the page, stylesheet or layout rules changed; the two issue tabs follow the existing horizontal-scroll behaviour at 320–390 px.

