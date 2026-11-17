import assert from 'node:assert/strict';
import { it } from 'node:test';
import { buildReadme } from '../src/core/readme.js';

it('writes the title and description separated by a blank line', () => {
  assert.equal(buildReadme('demo', 'A test repo.'), '# demo\n\nA test repo.\n');
});

it('writes only the title when there is no description', () => {
  assert.equal(buildReadme('demo'), '# demo\n');
});
