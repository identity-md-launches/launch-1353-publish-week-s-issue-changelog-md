import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { makeFeed } from './content.mjs';

const root = process.cwd();
const issueNumberText = n => String(n).padStart(3, '0');
const artifacts = path.join(root, 'artifacts');
const fixtureRoot = path.join(root, 'test/scratch/archive-fixture');
await mkdir(path.join(artifacts, 'screenshots'), { recursive: true });
await rm(fixtureRoot, { recursive: true, force: true });
await mkdir(fixtureRoot, { recursive: true });
for (const name of ['src', 'scripts', 'issues', 'evidence', 'public', 'vite.config.ts', 'tsconfig.json', 'package.json', 'index.html']) {
  await cp(path.join(root, name), path.join(fixtureRoot, name), { recursive: true });
}
const issueFiles = (await readdir('issues')).filter(file => /^\d{3,}\.json$/.test(file)).sort();
const issueCount = issueFiles.length;
const original = JSON.parse(await readFile(`issues/${issueFiles.at(-1)}`, 'utf8'));
const oldest = JSON.parse(await readFile('issues/001.json', 'utf8'));
const visitCount = [original.lead.visit, ...original.new.map(s => s.visit), original.watch.visit].filter(Boolean).length;
const sourceCount = 1 + original.new.length + original.bugs.length + original.answers.length + 1 + 5;
for (const file of issueFiles) await rm(path.join(fixtureRoot, 'issues', file), { force: true });
await writeFile(path.join(fixtureRoot, 'issues/001.json'), JSON.stringify(oldest));
for (const [no, date, week] of [[2, '2026-10-12', '5–11 October'], [3, '2026-10-19', '12–18 October']]) {
  const base = oldest;
  const issue = structuredClone(base);
  Object.assign(issue, { no, date, week });
  issue.lead.headline = `Archive interaction fixture number ${no}`;
  issue.lead.body = [`First fixture paragraph for issue ${no}.`, `Second fixture paragraph for issue ${no}.`, `Third fixture paragraph for issue ${no}.`];
  issue.numbers.accepted = 100 + no;
  issue.watch.headline = `Watch fixture number ${no}`;
  issue.leaders = [{ seat: 10 + no, jobs: 20 + no }];
  if (no === 2) { issue.new = []; issue.bugs = []; issue.answers = []; }
  await writeFile(path.join(fixtureRoot, `issues/00${no}.json`), JSON.stringify(issue));
}
const build = spawnSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: fixtureRoot, encoding: 'utf8', timeout: 120000 });
assert.equal(build.status, 0, `Archive fixture build failed: ${build.stdout}\n${build.stderr}`);

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.xml': 'application/rss+xml; charset=utf-8' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const prefix = url.pathname.startsWith('/fixture/') ? '/fixture/' : '/preview/paper/';
    if (!url.pathname.startsWith(prefix)) { response.writeHead(404).end('Not found'); return; }
    const directory = prefix === '/fixture/' ? path.join(fixtureRoot, 'dist') : path.join(root, 'dist');
    const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
    const file = path.resolve(directory, relative);
    if (!file.startsWith(`${directory}${path.sep}`)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const url = `${origin}/preview/paper/`;
console.log(`Production preview: ${url}`);
const results = { browser: '', productionUrl: '/preview/paper/', checks: [], viewports: [], consoleErrors: [], requestFailures: [], externalRequests: [], contrast: [], limitations: ['Emulated viewports, not physical devices.', 'No human screen-reader session or native browser zoom test.'] };
const check = (name, condition = true) => { assert(condition, name); results.checks.push(name); };
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  results.browser = await browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: 'light' });
  const page = await context.newPage();
  page.on('pageerror', error => results.consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') results.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => results.requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('request', request => { if (!request.url().startsWith(origin)) results.externalRequests.push(request.url()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  check('Latest issue is pre-rendered and hydrated', await page.locator('#lead-headline').innerText() === original.lead.headline);
  check(`${issueCount} actual issue(s) produce ${issueCount} tab(s), newest first, only the first tagged Latest`, await page.getByRole('tab').count() === issueCount && /latest/i.test(await page.getByRole('tab').first().innerText()) && await page.locator('.latest').count() === 1);
  check('Sources are hidden initially', await page.locator('.source-link:visible').count() === 0);
  check('Visit links are visible without expanding articles', await page.locator('.visit-link:visible').count() === visitCount);
  const visits = await page.locator('.visit-link').evaluateAll(links => links.every(link => link.target === '_blank' && link.rel.includes('noopener') && link.href.startsWith('https://')));
  check('Visit links open safely in a new tab', visits);
  await page.getByRole('switch', { name: 'Show sources' }).check();
  check('Show sources reveals article, watch and metric links', await page.locator('.source-link:visible').count() === sourceCount);
  await page.getByRole('switch', { name: 'Show sources' }).uncheck();
  const more = page.locator('.read-more').first();
  await more.locator('summary').focus();
  await page.keyboard.press('Enter');
  check('Read more expands by keyboard', await more.getAttribute('open') !== null);
  check('Expanded detail contains the full story', (await more.innerText()).includes(original.new[0].more));
  await page.keyboard.press('Space');
  check('Read less collapses by keyboard', await more.getAttribute('open') === null);
  const word = page.locator('.lead-body .term').first();
  await word.focus();
  await page.keyboard.press('Enter');
  check('Glossary opens an accessible native dialog', await page.getByRole('dialog').isVisible());
  await page.screenshot({ path: path.join(artifacts, 'screenshots/glossary.png') });
  const modalAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  check('Glossary dialog automated accessibility scan', modalAudit.violations.length === 0);
  await page.keyboard.press('Escape');
  check('Escape closes glossary and returns focus', !(await page.getByRole('dialog').isVisible()) && await word.evaluate(el => el === document.activeElement));
  await page.getByRole('tab', { selected: true }).focus();
  await page.screenshot({ path: path.join(artifacts, 'screenshots/keyboard-focus.png') });
  await page.keyboard.press('ArrowRight');
  check('ArrowRight from the newest tab selects the next issue and updates the link', (await page.getByRole('tab', { selected: true }).innerText()).includes(issueNumberText(issueCount === 1 ? original.no : issueCount - 1)) && page.url().endsWith(`#no${issueCount === 1 ? original.no : issueCount - 1}`));
  await page.goto(url, { waitUntil: 'networkidle' });

  for (const [width, height, name] of [[1440, 1100, 'desktop'], [1024, 900, null], [768, 1024, 'tablet'], [390, 844, 'mobile'], [320, 800, 'narrow']]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
    const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
    check(`No document overflow at ${width}px`, overflow.scroll <= overflow.viewport);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    if (audit.violations.length) await writeFile(path.join(artifacts, 'accessibility-failures.json'), JSON.stringify(audit.violations, null, 2));
    check(`Automated accessibility scan at ${width}px`, audit.violations.length === 0);
    results.viewports.push({ width, height, overflow, violations: audit.violations.length });
    if (name) await page.screenshot({ path: path.join(artifacts, `screenshots/${name}.png`), fullPage: true });
    if (name === 'mobile') await page.screenshot({ path: path.join(artifacts, 'screenshots/mobile-first-screen.png') });
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  results.contrast = await page.evaluate(() => {
    function ratio(foreground, background) {
      const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
      const fg = luminance(foreground); const bg = luminance(background);
      return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
    }
    return ['.lead-body p', '.lead-kicker', '.section-deck', '.explainer h2', '.explainer > .eyebrow', '.watch-label .small-note'].map(selector => {
      const element = document.querySelector(selector); let ancestor = element; let background;
      while (ancestor) { background = getComputedStyle(ancestor).backgroundColor; if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') break; ancestor = ancestor.parentElement; }
      const foreground = getComputedStyle(element).color;
      return { selector, foreground, background, ratio: Math.round(ratio(foreground, background) * 100) / 100 };
    });
  });
  check('Measured text contrast meets 4.5:1 for all six rendered pairs', results.contrast.every(pair => pair.ratio >= 4.5));
  results.fonts = await page.evaluate(() => ['UnifrakturMaguntia', 'Newsreader', 'Libre Franklin'].map(family => ({ family, loaded: [...document.fonts].some(font => font.family.replaceAll('"', '') === family && font.status === 'loaded') })));
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  check('Dark preference retains the required light paper', await page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor) === 'rgb(242, 234, 216)');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  results.textResizeOverflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth || r.left < 0) && !el.closest('.edition-tabs') && !el.classList.contains('skip-link') && !el.classList.contains('sr-only'); }).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 70), width: el.getBoundingClientRect().width, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })));
  if (results.textResizeOverflow.length) await page.screenshot({ path: path.join(artifacts, 'screenshots/text-resize-failure.png'), fullPage: true });
  check('200% text enlargement keeps document within viewport', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
  await page.goto(`${url}#no1`, { waitUntil: 'networkidle' });
  check('Direct production #no1 opens the oldest issue', (await page.locator('#lead-headline').innerText()) === oldest.lead.headline);
  check('Oldest issue keeps the all-time seats heading', (await page.locator('#leaders-title').innerText()).includes('of all time'));
  check('Oldest issue shows its real publication date', (await page.locator('.date-line').innerText()).toLowerCase().includes('10 october 2026'));
  await page.goto(`${url}#no${original.no}`, { waitUntil: 'networkidle' });
  check('Newest issue shows the weekly seats heading and workers online label', (await page.locator('#leaders-title').innerText()).includes(original.leadersScope === 'this week' ? 'this week' : 'of all time') && /workers online/i.test(await page.locator('.numbers-grid').innerText()));
  check('Newest issue date line shows publication date and covered week', (await page.locator('.date-line').innerText()).toLowerCase().includes(`covering ${original.week}`.toLowerCase()) && (await page.locator('.date-line time').getAttribute('datetime')) === original.date);
  check('Only Google Fonts uses an external request', results.externalRequests.every(request => /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(request)));
  // When the machine's outbound proxy refuses the Google Fonts hosts, Chromium logs 407/CORS/ERR_FAILED errors for those
  // stylesheet requests. They are an environment limitation, recorded as such; any other console error still fails.
  const fontHost = /fonts\.(googleapis|gstatic)\.com/;
  const fontsBlocked = results.requestFailures.length > 0 && results.requestFailures.every(request => fontHost.test(request.url));
  const environmentNoise = message => fontsBlocked && /fonts\.(googleapis|gstatic)\.com|407 \(Proxy Authentication Required\)|net::ERR_FAILED/.test(message);
  results.fontFetchBlocked = fontsBlocked;
  if (fontsBlocked) results.limitations.push('Google Fonts could not be fetched through this machine’s outbound proxy, so the web fonts were not rendered; fallback fonts were measured instead.');
  check('No application console errors', results.consoleErrors.every(environmentNoise));
  check('No failed application resources', results.requestFailures.every(request => /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(request.url)));

  const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await offlineContext.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const offline = await offlineContext.newPage();
  await offline.goto(url, { waitUntil: 'networkidle' });
  await offlineContext.setOffline(true);
  await offline.getByRole('switch', { name: 'Show sources' }).check();
  await offline.locator('.read-more summary').first().click();
  check('Paper and primary controls work with all external networking blocked', await offline.locator('.source-link:visible').count() === sourceCount && await offline.locator('.read-more').first().getAttribute('open') !== null);
  check('Fallback fonts reflow without overflow', await offline.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await offline.screenshot({ path: path.join(artifacts, 'screenshots/offline-fallback.png'), fullPage: true });
  await offlineContext.close();

  const noJsContext = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await noJsContext.newPage();
  await noJs.goto(url, { waitUntil: 'domcontentloaded' });
  check('The latest paper is readable even before JavaScript', (await noJs.locator('#lead-headline').innerText()) === original.lead.headline);
  await noJsContext.close();

  await page.goto(`${origin}/fixture/#no2`, { waitUntil: 'networkidle' });
  check('Archive direct link selects an older issue', (await page.locator('#lead-headline').innerText()).includes('number 2'));
  check('Archive tabs are newest first, only first is Latest', (await page.getByRole('tab').allInnerTexts()).map(text => text.match(/No\. (\d+)/)?.[1]).join(',') === '003,002,001' && await page.locator('.latest').count() === 1);
  check('Selected issue changes number, date, figures, leaders and watch together', (await page.locator('.ear').first().innerText()).includes('No. 2') && (await page.locator('.date-line').innerText()).toLowerCase().includes('12 october 2026') && (await page.locator('.numbers-grid dd').first().innerText()) === '102' && (await page.locator('.leaders-list').innerText()).includes('Seat #12') && (await page.locator('#watch-title').innerText()).includes('number 2'));
  check('Empty editorial sections render honest empty states', await page.locator('.empty-note').count() === 3);
  await page.getByRole('tab', { selected: true }).focus();
  await page.keyboard.press('ArrowRight');
  check('ArrowRight moves focus and opens the next full paper', (await page.getByRole('tab', { selected: true }).innerText()).includes('001') && (await page.locator('#lead-headline').innerText()) === oldest.lead.headline && page.url().endsWith('#no1'));
  await page.keyboard.press('ArrowLeft');
  check('ArrowLeft goes back to the preceding issue', (await page.locator('#lead-headline').innerText()).includes('number 2'));
  await page.keyboard.press('Home');
  check('Home selects the newest issue', (await page.locator('#lead-headline').innerText()).includes('number 3'));
  await page.keyboard.press('End');
  check('End selects the oldest issue', (await page.locator('#lead-headline').innerText()) === oldest.lead.headline);
  await page.getByRole('tab', { name: /No\. 002/ }).click();
  await page.goBack();
  check('Browser Back restores the previous issue', (await page.locator('#lead-headline').innerText()) === oldest.lead.headline);
  await page.getByRole('tab', { name: /No\. 002/ }).click();
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  check('Skip link does not reset an archived issue', (await page.locator('#lead-headline').innerText()).includes('number 2'));
  await page.setViewportSize({ width: 320, height: 800 });
  check('Multiple tabs scroll sideways without widening the page', await page.locator('.edition-tabs').evaluate(el => el.scrollWidth > el.clientWidth) && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('tab', { name: /No\. 001/ }).focus();
  await page.keyboard.press('Home');
  const selectedBounds = await page.getByRole('tab', { selected: true }).boundingBox();
  check('Keyboard navigation scrolls the selected tab into view', selectedBounds.x >= 0 && selectedBounds.x + selectedBounds.width <= 321);
  await page.goto(`${origin}/fixture/#no999`, { waitUntil: 'networkidle' });
  check('Unknown issue link falls back to Latest with an explanation', (await page.locator('#lead-headline').innerText()).includes('number 3') && (await page.getByRole('status').innerText()).includes('not in the archive'));
  const fixtureFeed = await readFile(path.join(fixtureRoot, 'dist/feed.xml'), 'utf8');
  check('RSS contains all fixture issues newest first', (fixtureFeed.match(/<item>/g) || []).length === 3 && fixtureFeed.indexOf('No. 003') < fixtureFeed.indexOf('No. 002') && fixtureFeed.indexOf('No. 002') < fixtureFeed.indexOf('No. 001'));
  const feed = await readFile('dist/feed.xml', 'utf8');
  check('Production RSS lists every issue newest first and matches root feed', (feed.match(/<item>/g) || []).length === issueCount && feed === await readFile('feed.xml', 'utf8') && (feed.indexOf(`No. ${issueNumberText(original.no)}`) < feed.indexOf('No. 001')));
  check('Publisher URL option points feed items to issue anchors', makeFeed([original], 'https://explorer.imd.fun/paper/').includes(`https://explorer.imd.fun/paper/#no${original.no}`));
  const html = await readFile('dist/index.html', 'utf8');
  check('Local script and stylesheet URLs are relative', !/(?:src|href)="\/(?!\/)/.test(html));
  check('No external scripts', !/<script[^>]+src="https?:/.test(html));
  check('Archive fixture never enters the real export', !html.includes('Archive interaction fixture'));
  check('Production includes all issue data in HTML', html.includes('id="issue-data"') && html.includes(original.lead.headline) && html.includes(oldest.lead.headline));
  await browser.close(); browser = undefined;
  await writeFile(path.join(artifacts, 'interaction-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(`Passed ${results.checks.length} checks in Chromium ${results.browser}. Screenshots and measured results are in artifacts/.`);

  if (process.argv.includes('--review')) {
    console.log(`Manual review preview (press Enter to close; automatic limit 10 minutes): ${url}`);
    const input = createInterface({ input: process.stdin, output: process.stdout });
    await new Promise(resolve => { const timer = setTimeout(resolve, 600000); const finish = () => { clearTimeout(timer); resolve(); }; input.once('line', finish); input.once('close', finish); });
    input.close();
  }
} catch (error) {
  results.failure = error.message;
  await writeFile(path.join(artifacts, 'interaction-results.json'), JSON.stringify(results, null, 2) + '\n');
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
