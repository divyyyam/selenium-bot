import type { WebDriver } from 'selenium-webdriver';
import type { CliOptions } from '../cli.js';
import type { Config } from '../config.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { NewRepoPage } from '../pages/NewRepoPage.js';
import { RepoPage } from '../pages/RepoPage.js';
import { step, StepError, warn } from '../utils/step.js';
import { task } from '../utils/ui.js';
import { waitForUrl } from '../utils/waits.js';
import type { RepoRef } from './delete.flow.js';
import { chooseDescription, chooseTitle, nextTitle, type TitleInput } from './title.flow.js';

export interface Repo extends RepoRef {
  name: string;
  description: string;
}

export async function createRepo(driver: WebDriver, config: Config, options: CliOptions): Promise<Repo> {
  const dashboard = new DashboardPage(driver);
  const form = new NewRepoPage(driver);

  await task('Opening the new repository form', async () => {
    await step('3.1', 'Click New on the dashboard', async () => {
      await dashboard.open();
      if (!(await dashboard.clickNew())) {
        warn('New button not found, opened /new directly');
        await form.open();
      }
      await form.waitUntilLoaded();
    });
  }, () => 'New repository form open');

  const input: TitleInput = { username: config.username, preset: options.title, interactive: !options.skipAll };
  let title = await chooseTitle(input);
  const description = await chooseDescription(options.description, input.interactive);

  return task('Creating the repository', async () => {
    for (;;) {
      await step('3.2', `Type the name ${title.name}`, () => form.setName(title.name));
      if (await step('3.4', `Check whether ${title.name} is free`, () => form.isNameAvailable(title.name))) break;
      title = await nextTitle(title, input);
    }

    await step('3.3', 'Type the description', () => form.setDescription(description));
    await step('3.5', 'Set visibility to Private', () => form.setPrivate());

    const expected = `/${config.username}/${title.name}`.toLowerCase();
    const url = await step('3.6', 'Click Create repository', async () => {
      await form.create();
      return waitForUrl(driver, (current) => new URL(current).pathname.replace(/\/$/, '').toLowerCase() === expected);
    });

    await step('3.7', 'Check the Private badge', async () => {
      if (!(await new RepoPage(driver, url).hasPrivateBadge())) {
        throw new StepError('3.7', `Repo created at ${url} but its visibility could not be verified.`);
      }
    });

    const fullName = new URL(url).pathname.slice(1).replace(/\/$/, '');
    return { name: title.name, description, url, fullName };
  }, (repo) => `Created ${repo.fullName} (private)`);
}
