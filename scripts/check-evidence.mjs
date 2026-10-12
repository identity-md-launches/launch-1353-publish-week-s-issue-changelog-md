import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { readContent } from './content.mjs';

// Each edition's reporting trail lives in artifacts/NNN-counts.json and artifacts/NNN-story-evidence.json.
// The trail is a working file, not part of the published site, so an edition whose trail is absent is
// reported as unverifiable here rather than failing the whole check.
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const { issues } = readContent();
let verified = 0;
for (const issue of [...issues].reverse()) {
  const no = String(issue.no).padStart(3, '0');
  const countsFile = `artifacts/${no}-counts.json`;
  const storiesFile = `artifacts/${no}-story-evidence.json`;
  if (!existsSync(countsFile) || !existsSync(storiesFile)) {
    console.log(`Issue ${no}: no reporting trail in artifacts/, arithmetic not re-checked here.`);
    continue;
  }
  const proof = read(countsFile);
  const stories = read(storiesFile);
  const { startInclusive: start, endExclusive: end, previousStartInclusive: previous } = proof.week;
  const within = (time, a = start, b = end) => time && new Date(time) >= new Date(a) && new Date(time) < new Date(b);
  const completed = (a, b) => proof.jobs.rows.filter(row => row.state === 'completed' && within(row.updatedAt, a, b)).length;
  const current = completed(start, end);
  const before = completed(previous, start);
  assert.equal(current, issue.numbers.accepted, `${no}: completed jobs`);
  assert.equal(Math.min(100, Math.round(50 * current / before)), issue.meter.level, `${no}: meter level`);
  const change = Math.round(100 * (current / before - 1));
  assert(issue.meter.verdict.includes(`${Math.abs(change)}%`), `${no}: meter verdict must quote ${Math.abs(change)}%`);
  assert.equal(proof.oracle.rows.filter(row => row.status === 'attested' && within(row.attestedAt)).length, issue.numbers.answers, `${no}: answers`);
  const launches = proof.launches.rows.filter(row => row.status === 'live' && within(row.createdAt));
  assert.equal(launches.length, issue.numbers.launches, `${no}: launches`);
  assert.equal(proof.health.connectedDaemons, issue.numbers.online, `${no}: online`);
  if (issue.leadersScope === 'this week') {
    const counts = new Map();
    const completedIds = new Set(proof.jobs.rows.filter(row => row.state === 'completed' && within(row.updatedAt)).map(row => row.id));
    for (const node of proof.acceptedNodes) {
      if (!completedIds.has(node.job)) continue;
      counts.set(Number(node.seat), (counts.get(Number(node.seat)) || 0) + 1);
    }
    const leaders = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3).map(([seat, jobs]) => ({ seat, jobs }));
    assert.deepEqual(leaders, issue.leaders, `${no}: weekly leaders`);
  } else {
    const leaders = [...proof.seats.rows].sort((a, b) => b.accepted - a.accepted || Number(a.tokenId) - Number(b.tokenId)).slice(0, 3).map(row => ({ seat: Number(row.tokenId), jobs: row.accepted }));
    assert.deepEqual(leaders, issue.leaders, `${no}: all-time leaders`);
  }
  for (const collection of [proof.jobs, proof.oracle]) {
    assert.equal(new Set(collection.rows.map(row => row.id)).size, collection.rows.length, `${no}: duplicate records in count trail`);
    assert.equal(collection.pages.reduce((total, page) => total + page.count, 0), collection.rows.length, `${no}: pagination count mismatch`);
  }
  assert(stories.publications.every(record => within(record.publishedAt)), `${no}: a story was published outside the week`);
  const sources = new Set([issue.lead.source, ...issue.new.map(s => s.source), ...issue.bugs.map(s => s.source)]);
  for (const record of stories.publications) assert(record.label === 'watch' || sources.has(record.source), `${no}: story evidence ${record.label} does not match the issue`);
  for (const answer of stories.answers) {
    assert.equal(answer.status, 'attested');
    assert(within(answer.attestedAt), `${no}: answer signed outside the week`);
    assert(answer.agreed >= answer.quorum, `${no}: answer below quorum`);
    assert.match(answer.answerEncoded, /^0x[0-9a-f]{64}$/i);
    const decoded = answer.answerType === 'uint256' ? Number(BigInt(answer.answerEncoded)) : answer.answerType === 'bytes32' ? Buffer.from(answer.answerEncoded.slice(2), 'hex').toString('utf8').replace(/\0+$/, '') : BigInt(answer.answerEncoded) !== 0n;
    assert.equal(decoded, answer.decodedAnswer, `${no}: answer decoding`);
    assert(issue.answers.some(item => item.source === answer.source), `${no}: answer evidence does not match the issue`);
  }
  assert.equal(new Date(start).getUTCDay(), 1);
  assert.equal(new Date(end).getUTCDay(), 1);
  assert.equal((new Date(end) - new Date(start)) / 86400000, 7);
  assert(new Date(`${issue.date}T00:00:00Z`) >= new Date(end), `${no}: publication date precedes the end of the covered week`);
  verified++;
  console.log(`Issue ${no}: evidence check passed: ${current} completed jobs (${before} the week before), ${launches.length} launches, ${issue.numbers.answers} answers; counts, leaders and dated story/answer evidence agree.`);
}
console.log(`Evidence check finished: ${verified} of ${issues.length} issue(s) re-checked from a saved trail.`);
