import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultIndex, defaultName, isSpecialName, normalizeTitle } from '../src/core/title.js';

describe('normalizeTitle', () => {
  it('1. trims whitespace', () => assert.equal(normalizeTitle('  repo  '), 'repo'));
  it('2. turns whitespace runs into one dash', () => assert.equal(normalizeTitle('my \t cool repo'), 'my-cool-repo'));
  it('3. replaces characters GitHub does not allow', () => assert.equal(normalizeTitle('a@b#c'), 'a-b-c'));
  it('4. collapses repeated dashes', () => assert.equal(normalizeTitle('a---b'), 'a-b'));
  it('5. strips leading and trailing dashes', () => assert.equal(normalizeTitle('!hello!'), 'hello'));
  it('6. truncates to 100 characters', () => assert.equal(normalizeTitle('x'.repeat(150))?.length, 100));

  it('7. treats empty, "." and ".." as skipped', () => {
    for (const input of ['', '   ', '!!!', '.', '..']) assert.equal(normalizeTitle(input), null);
  });

  it('keeps dots, dashes and underscores', () => assert.equal(normalizeTitle('my_repo.v2-final'), 'my_repo.v2-final'));
  it('handles the T6 example', () => assert.equal(normalizeTitle('My Cool Project!'), 'My-Cool-Project'));
});

describe('default names', () => {
  it('builds project-title-N', () => assert.equal(defaultName(3), 'project-title-3'));

  it('reads N back only from exact default names', () => {
    assert.equal(defaultIndex('project-title-12'), 12);
    assert.equal(defaultIndex('project-title-x'), null);
    assert.equal(defaultIndex('my-project-title-1'), null);
  });
});

describe('isSpecialName', () => {
  it('matches the username and the Pages repo, ignoring case', () => {
    assert.equal(isSpecialName('Octo', 'octo'), true);
    assert.equal(isSpecialName('octo.github.io', 'Octo'), true);
    assert.equal(isSpecialName('octo-repo', 'octo'), false);
  });
});
