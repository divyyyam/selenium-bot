import * as clack from '@clack/prompts';
import type { WebDriver } from 'selenium-webdriver';
import { GITHUB, type Config } from '../config.js';
import { defaultIndex } from '../core/title.js';
import { ProfilePage } from '../pages/ProfilePage.js';
import { RepoPage } from '../pages/RepoPage.js';
import { RepoSettingsPage } from '../pages/RepoSettingsPage.js';
import { confirm } from '../utils/prompt.js';
import { step } from '../utils/step.js';
import { task } from '../utils/ui.js';

export interface RepoRef {
  fullName: string;
  url: string;
}

export async function deleteRepo(driver: WebDriver, config: Config, repo: RepoRef): Promise<void> {
  const repoPage = new RepoPage(driver, repo.url);
  const settings = new RepoSettingsPage(driver);

  await task(`Deleting ${repo.fullName}`, async () => {
    await step('5.1', 'Open the repository settings', async () => {
      await repoPage.open();
      if (!(await repoPage.clickSettings())) await driver.get(`${repo.url}/settings`);
      await settings.waitUntilLoaded();
    });

    await step('5.2', 'Confirm the delete dialog', () => settings.deleteRepository(config.password));

    await step('5.3', 'Check the repository page returns 404', async () => {
      if (!(await repoPage.isGone())) throw new Error(`${repo.url} still loads`);
    });
  }, () => `Deleted ${repo.fullName}`);
}

export async function cleanup(driver: WebDriver, config: Config): Promise<number> {
  const names = await task('Looking for project-title-N repositories', async () => {
    const found = await step('5.0', 'Search the repository list', () =>
      new ProfilePage(driver).searchRepositories(config.username, 'project-title-'),
    );
    return found.filter((name) => defaultIndex(name) !== null);
  }, (found) => (found.length ? `Found ${found.length}: ${found.join(', ')}` : 'None found'));

  if (names.length === 0 || !(await confirm(`Delete all ${names.length}?`))) {
    clack.log.info('Nothing deleted');
    return 0;
  }

  for (const name of names) {
    await deleteRepo(driver, config, { fullName: `${config.username}/${name}`, url: `${GITHUB}/${config.username}/${name}` });
  }
  return names.length;
}
