import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const terms = ['swarm', 'worker', 'schedule', 'audit', 'oracle', 'seat', 'launch'];
function keys(value, expected, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label}: unexpected or missing fields`);
}
function prose(value, label) {
  assert(typeof value === 'string' && value.trim().length > 0, `${label}: expected text`);
  assert(!/0x[a-f0-9]+|\b[a-f0-9]{40,}\b|`|<\/?[a-z][^>]*>|\b(?:market caps?|token prices?|price predictions?|trading|returns|buy(?:ing)?|sell(?:ing)?)\b/i.test(value), `${label}: prohibited or technical story text`);
}
function integer(value, label, minimum = 0) { assert(Number.isSafeInteger(value) && value >= minimum, `${label}: expected an integer >= ${minimum}`); }
function link(value, kind, label) {
  if (kind === 'visit' && value === null) return;
  assert(typeof value === 'string', `${label}: expected a URL`);
  const u = new URL(value);
  assert(u.protocol === 'https:' && !u.username && !u.password && !u.port, `${label}: expected a public HTTPS link`);
  assert(kind === 'source' ? u.hostname === 'api.imd.fun' : u.hostname === 'explorer.imd.fun' || /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.sites\.imd\.fun$/.test(u.hostname), `${label}: unsupported host`);
}
function array(value, maximum, label) { assert(Array.isArray(value) && value.length <= maximum, `${label}: too many entries or not an array`); }

export function validateIssue(issue) {
  keys(issue, ['no', 'date', 'week', 'lead', 'new', 'bugs', 'answers', 'numbers', 'meter', 'leaders', 'watch', 'glossary', ...('leadersScope' in issue ? ['leadersScope'] : [])], 'issue');
  integer(issue.no, 'no', 1);
  // The date is the publication date: the day the issue was prepared, which is not always a Monday (issue 001 was published on Saturday 10 October).
  assert(/^\d{4}-\d{2}-\d{2}$/.test(issue.date) && new Date(`${issue.date}T00:00:00Z`).toISOString().startsWith(issue.date), 'date: expected a calendar date (YYYY-MM-DD)');
  prose(issue.week, 'week');
  keys(issue.lead, ['kicker', 'headline', 'standfirst', 'body', 'visit', 'source'], 'lead');
  for (const key of ['kicker', 'headline', 'standfirst']) prose(issue.lead[key], `lead.${key}`);
  assert(Array.isArray(issue.lead.body) && issue.lead.body.length === 3, 'lead: exactly three paragraphs');
  issue.lead.body.forEach((text, i) => prose(text, `lead.body.${i}`));
  link(issue.lead.visit, 'visit', 'lead.visit'); link(issue.lead.source, 'source', 'lead.source');
  array(issue.new, 4, 'new');
  issue.new.forEach((item, i) => {
    keys(item, ['headline', 'summary', 'more', 'visit', 'source'], `new.${i}`);
    for (const key of ['headline', 'summary', 'more']) prose(item[key], `new.${i}.${key}`);
    link(item.visit, 'visit', `new.${i}.visit`); link(item.source, 'source', `new.${i}.source`);
  });
  array(issue.bugs, 3, 'bugs');
  issue.bugs.forEach((item, i) => {
    keys(item, ['severity', 'headline', 'summary', 'source'], `bugs.${i}`);
    assert(['Serious', 'Moderate'].includes(item.severity), `bugs.${i}: invalid severity`);
    prose(item.headline, `bugs.${i}.headline`); prose(item.summary, `bugs.${i}.summary`); link(item.source, 'source', `bugs.${i}.source`);
  });
  array(issue.answers, 3, 'answers');
  issue.answers.forEach((item, i) => {
    keys(item, ['question', 'summary', 'source'], `answers.${i}`);
    prose(item.question, `answers.${i}.question`); prose(item.summary, `answers.${i}.summary`); link(item.source, 'source', `answers.${i}.source`);
  });
  keys(issue.numbers, ['accepted', 'launches', 'answers', 'online'], 'numbers');
  Object.entries(issue.numbers).forEach(([key, value]) => integer(value, `numbers.${key}`));
  keys(issue.meter, ['level', 'verdict'], 'meter'); integer(issue.meter.level, 'meter.level');
  assert(issue.meter.level <= 100, 'meter.level: above 100'); prose(issue.meter.verdict, 'meter.verdict');
  array(issue.leaders, 3, 'leaders');
  issue.leaders.forEach((leader, i) => {
    keys(leader, ['seat', 'jobs'], `leaders.${i}`); integer(leader.seat, `leaders.${i}.seat`); integer(leader.jobs, `leaders.${i}.jobs`);
  });
  if ('leadersScope' in issue) assert(['this week', 'all time'].includes(issue.leadersScope), 'leadersScope: expected "this week" or "all time"');
  keys(issue.watch, ['headline', 'text', 'visit'], 'watch');
  prose(issue.watch.headline, 'watch.headline'); prose(issue.watch.text, 'watch.text'); link(issue.watch.visit, 'visit', 'watch.visit');
  assert(Array.isArray(issue.glossary) && new Set(issue.glossary).size === issue.glossary.length && issue.glossary.every(term => terms.includes(term)), 'glossary: unknown or repeated term');
}

export function readContent(root = process.cwd()) {
  const issueDirectory = path.join(root, 'issues');
  const files = readdirSync(issueDirectory).filter(file => /^\d{3,}\.json$/.test(file)).sort();
  assert(files.length, 'No issue files found');
  const issues = files.map(file => {
    const issue = JSON.parse(readFileSync(path.join(issueDirectory, file), 'utf8'));
    validateIssue(issue);
    assert(file === `${String(issue.no).padStart(3, '0')}.json`, `${file}: issue number does not match filename`);
    return issue;
  }).sort((a, b) => b.no - a.no);
  assert(new Set(issues.map(issue => issue.no)).size === issues.length, 'Duplicate issue numbers');
  const notes = {};
  for (const issue of issues) {
    const file = path.join(root, 'evidence', `${String(issue.no).padStart(3, '0')}.json`);
    let note;
    try { note = JSON.parse(readFileSync(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (note) {
      assert(note.no === issue.no, `${file}: wrong issue number`);
      link(note.watchSource, 'source', `${file}: watch source`);
      for (const source of note.sources) link(source.url, 'source', `${file}: metrics source`);
      notes[issue.no] = note;
    }
  }
  return { issues, notes };
}

export function issueIndex(issues) { return issues.map(({ no, date, week }) => ({ no, date, week })); }
const xml = value => String(value).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

export function makeFeed(issues, siteUrl = '') {
  const canonical = siteUrl ? new URL(siteUrl) : null;
  if (canonical) assert(canonical.protocol === 'https:' && !canonical.search && !canonical.hash && !canonical.username && !canonical.password, 'PAPER_SITE_URL must be an HTTPS publication URL without query, fragment or credentials');
  const base = canonical ? canonical.href.replace(/\/?$/, '/') : null;
  const items = issues.map(issue => {
    const excerpt = `${issue.lead.standfirst}\n\n${issue.lead.body.join('\n\n')}`;
    const link = base ? `${base}#no${issue.no}` : issue.lead.source;
    return `    <item>\n      <title>${xml(`No. ${String(issue.no).padStart(3, '0')} · ${issue.week} — ${issue.lead.headline}`)}</title>\n      <link>${xml(link)}</link>\n      <guid isPermaLink="false">urn:changelog-md:issue:${issue.no}:${issue.date}</guid>\n      <pubDate>${new Date(`${issue.date}T00:00:00Z`).toUTCString()}</pubDate>\n      <description>${xml(excerpt)}</description>\n    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>CHANGELOG.md</title>\n    <link>${xml(base || 'https://imd.fun/')}</link>\n    <description>The weekly paper of the IMD swarm, written by the swarm itself. Unofficial, independent and in plain English.</description>\n    <language>en</language>\n    <lastBuildDate>${new Date(`${issues[0].date}T00:00:00Z`).toUTCString()}</lastBuildDate>\n${items.join('\n')}\n  </channel>\n</rss>\n`;
}

// The paper's public address, taken from IMD's own publication record for issue 001
// (https://api.imd.fun/publications?q=changelog: site label "changelog-md-test", named 10 October 2026).
// RSS item links point at the issue tabs there. Set PAPER_SITE_URL to override it when the export is served elsewhere.
export const PAPER_SITE_URL = 'https://changelog-md-test.sites.imd.fun/';

export function writeIndexAndFeed(bundle, root = process.cwd(), siteUrl = process.env.PAPER_SITE_URL || PAPER_SITE_URL) {
  writeFileSync(path.join(root, 'issues', 'index.json'), `${JSON.stringify(issueIndex(bundle.issues), null, 2)}\n`);
  const feed = makeFeed(bundle.issues, siteUrl);
  writeFileSync(path.join(root, 'feed.xml'), feed);
  return feed;
}
