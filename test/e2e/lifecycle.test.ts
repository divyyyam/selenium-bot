import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { after, before, describe, it, type TestContext } from 'node:test';
import type { WebDriver } from 'selenium-webdriver';
import type { CliOptions } from '../../src/cli.js';
import { GITHUB, loadConfig, type Config } from '../../src/config.js';
import { buildReadme } from '../../src/core/readme.js';
import { createDriver } from '../../src/driver.js';
import { createRepo, type Repo } from '../../src/flows/createRepo.flow.js';
import { deleteRepo } from '../../src/flows/delete.flow.js';
import { login } from '../../src/flows/login.flow.js';
import { createReadme } from '../../src/flows/readme.flow.js';
import { LoginPage } from '../../src/pages/LoginPage.js';
import { NewRepoPage } from '../../src/pages/NewRepoPage.js';
import { RepoPage } from '../../src/pages/RepoPage.js';
import { GitHubApi } from './support/githubApi.js';
import {
  E2E_ENABLED,
  E2E_NAME,
  eventually,
  HEADLESS,
  isolatedDriver,
  NEGATIVE_LOGIN_ENABLED,
  runId,
  withEvidence,
} from './support/harness.js';

const MINUTE = 60_000;
const STALE_AFTER_MS = 60 * MINUTE;

describe('CLI contract (no browser)', () => {
  const run = (args: string[], env: NodeJS.ProcessEnv = {}) =>
    spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ...env },
      timeout: 30_000,
    });

  it('prints help with every documented exit code and exits 0', () => {
    const result = run(['--help']);
    assert.equal(result.status, 0, result.stderr);
    for (const flag of ['--skip-all', '--title', '--description', '--headless', '--cleanup']) {
      assert.match(result.stdout, new RegExp(flag), `help should mention ${flag}`);
    }
    assert.match(result.stdout, /Exit codes/);
  });

  it('rejects an unknown flag with exit code 1 and points to --help', () => {
    const result = run(['--definitely-not-a-flag']);
    assert.equal(result.status, 1);
    assert.match(result.stderr + result.stdout, /--help/);
  });

  it('fails fast with exit code 1 when credentials are missing', () => {
    const result = run(['-y'], { GITHUB_USERNAME: '', GITHUB_PASSWORD: '' });
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /GITHUB_USERNAME and GITHUB_PASSWORD must be set/);
  });
});

describe('repository lifecycle on github.com', {
  skip: E2E_ENABLED ? false : 'set E2E=1 to run against a real GitHub account',
  concurrency: false,
}, () => {
  const id = runId();
  const rawTitle = `  e2e ${id} lifecycle/check!  `;
  const expectedName = `e2e-${id}-lifecycle-check`;
  const description = `E2E run ${id}: created and verified by the github-bot suite`;

  let driver: WebDriver;
  let config: Config;
  let api: GitHubApi | null;
  let repo: Repo | null = null;
  let deleted = false;

  function requireRepo(t: TestContext): boolean {
    if (repo) return true;
    t.skip('no repository: the create test failed');
    return false;
  }

  function requireLive(t: TestContext): boolean {
    if (!requireRepo(t)) return false;
    if (!deleted) return true;
    t.skip('repository already deleted');
    return false;
  }

  before(async () => {
    config = loadConfig();
    api = GitHubApi.fromEnv();

    if (api) {
      const viewer = await api.viewer();
      assert.equal(viewer.toLowerCase(), config.username.toLowerCase(), 'GITHUB_TOKEN belongs to a different account than GITHUB_USERNAME');

      const stale = (await api.listOwnRepos()).filter(
        (r) => r.private && E2E_NAME.test(r.name.toLowerCase()) && Date.now() - Date.parse(r.created_at) > STALE_AFTER_MS,
      );
      await Promise.allSettled(stale.map((r) => api!.deleteRepo(r.owner.login, r.name)));
    }

    driver = await createDriver(HEADLESS);
  });

  after(async () => {
    try {
      if (repo && !deleted) {
        const [owner, name] = repo.fullName.split('/');
        if (api) {
          await api.deleteRepo(owner, name);
        } else {
          await deleteRepo(driver, config, repo).catch((error) => {
            console.error(`Cleanup failed, delete ${repo!.url} by hand: ${error}`);
          });
        }
      }
    } finally {
      await driver?.quit().catch(() => undefined);
    }
  });

  it('signs in as the configured user', { timeout: 6 * MINUTE }, async () => {
    await withEvidence(driver, 'login', async () => {
      const user = await login(driver, config);
      assert.equal(user.toLowerCase(), config.username.toLowerCase());

      await driver.get(`${GITHUB}/`);
      assert.equal((await new LoginPage(driver).signedInUser()).toLowerCase(), config.username.toLowerCase());
    });
  });

  it('creates a private repository with a normalised name and the given description', { timeout: 3 * MINUTE }, async () => {
    await withEvidence(driver, 'create', async () => {
      const options: CliOptions = { skipAll: true, title: rawTitle, description, cleanup: false, help: false };
      repo = await createRepo(driver, config, options);

      assert.equal(repo.name, expectedName, 'title was not normalised as expected');
      assert.equal(repo.fullName.toLowerCase(), `${config.username}/${expectedName}`.toLowerCase());
      assert.equal(new URL(repo.url).pathname.toLowerCase(), `/${config.username}/${expectedName}`.toLowerCase());
      assert.equal(repo.description, description);

      const page = new RepoPage(driver, repo.url);
      await page.open();
      assert.ok(await page.hasPrivateBadge(), 'Private badge not shown on the repository page');

      if (api) {
        const [owner, name] = repo.fullName.split('/');
        const remote = await eventually(() => api!.getRepo(owner, name), { what: 'the repository in the API' });
        assert.equal(remote.private, true, 'API reports the repository as public');
        assert.equal(remote.name, expectedName);
        assert.equal(remote.description, description);
        assert.equal(remote.owner.login.toLowerCase(), config.username.toLowerCase());
      }
    });
  });

  it('reports the name as taken when it is used again', { timeout: 2 * MINUTE }, async (t) => {
    if (!requireLive(t)) return;
    await withEvidence(driver, 'name-taken', async () => {
      const form = new NewRepoPage(driver);
      await form.open();
      await form.waitUntilLoaded();
      await form.setName(repo!.name);
      assert.equal(await form.isNameAvailable(repo!.name), false, 'an existing name was reported as available');

      const free = `${expectedName}-free`;
      await form.setName(free);
      assert.equal(await form.isNameAvailable(free), true, 'an unused name was reported as taken');
    });
  });

  it('commits a README that renders in the UI and matches the API byte for byte', { timeout: 3 * MINUTE }, async (t) => {
    if (!requireLive(t)) return;

    await withEvidence(driver, 'readme', async () => {
      await new RepoPage(driver, repo!.url).open();
      await createReadme(driver, repo!);
      const expected = buildReadme(expectedName, description);

      const page = new RepoPage(driver, repo!.url);
      await page.open();
      const { headings, text } = await page.readme();
      assert.deepEqual(headings, [expectedName], 'README should render exactly one h1 with the repo name');
      assert.equal(text.split(description).length - 1, 1, 'description should render exactly once');

      if (api) {
        const [owner, name] = repo!.fullName.split('/');

        const readme = await eventually(() => api!.getReadme(owner, name), { what: 'README in the API' });
        assert.equal(readme.path, 'README.md');
        assert.equal(readme.content.replace(/\r\n/g, '\n').trimEnd(), expected.trimEnd());

        const messages = await api.commitMessages(owner, name);
        assert.equal(messages.length, 1, `expected one commit, found: ${JSON.stringify(messages)}`);
        assert.match(messages[0], /README/i);
      }
    });
  });

  it('is not visible to a signed-out visitor', { timeout: 2 * MINUTE }, async (t) => {
    if (!requireLive(t)) return;
    const outsider = await isolatedDriver();
    try {
      await withEvidence(outsider.driver, 'privacy', async () => {
        await outsider.driver.get(repo!.url);
        const title = await outsider.driver.getTitle();
        assert.match(title, /Page not found/i, `a signed-out visitor saw "${title}" instead of a 404`);
        assert.equal(await new LoginPage(outsider.driver).signedInUser(), '', 'the isolated browser should be signed out');
      });
    } finally {
      await outsider.dispose();
    }
  });

  it('rejects a wrong password with a clear outcome', {
    timeout: 2 * MINUTE,
    skip: NEGATIVE_LOGIN_ENABLED ? false : 'set E2E_NEGATIVE=1 (wrong passwords can rate-limit the account)',
  }, async () => {
    const outsider = await isolatedDriver();
    try {
      await withEvidence(outsider.driver, 'bad-password', async () => {
        const page = new LoginPage(outsider.driver);
        await page.open();
        await page.typeUsername(config.username);
        await page.typePassword(`wrong-${runId()}`);
        await page.submit();

        assert.equal(await page.waitForOutcome(), 'bad-credentials');
        assert.equal(await page.signedInUser(), '', 'a wrong password must not produce a session');
      });
    } finally {
      await outsider.dispose();
    }
  });

  it('deletes the repository through the settings page', { timeout: 3 * MINUTE }, async (t) => {
    if (!requireLive(t)) return;
    await withEvidence(driver, 'delete', async () => {
      await deleteRepo(driver, config, repo!);
      deleted = true;

      assert.ok(await new RepoPage(driver, repo!.url).isGone(), 'repository page still loads after deletion');

      if (api) {
        const [owner, name] = repo!.fullName.split('/');
        await eventually(async () => ((await api!.getRepo(owner, name)) === null ? true : null), {
          what: 'the API to return 404',
        });
      }
    });
  });
});
