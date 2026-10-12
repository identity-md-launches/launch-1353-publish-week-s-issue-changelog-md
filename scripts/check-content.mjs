import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { issueIndex, readContent } from './content.mjs';

const { issues } = readContent();
const index = JSON.parse(readFileSync('issues/index.json', 'utf8'));
assert.deepEqual(index, issueIndex(issues), 'issues/index.json must list every issue, newest first');
console.log(`Content check passed: ${issues.length} issue(s), exact schema, calendar dates, allowed links, prose checks and matching index.`);
