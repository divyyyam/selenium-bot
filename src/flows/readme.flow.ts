import type { WebDriver } from 'selenium-webdriver';
import { buildReadme } from '../core/readme.js';
import { FileEditorPage } from '../pages/FileEditorPage.js';
import { RepoPage } from '../pages/RepoPage.js';
import { step, warn } from '../utils/step.js';
import { task } from '../utils/ui.js';
import type { Repo } from './createRepo.flow.js';

export async function createReadme(driver: WebDriver, repo: Repo): Promise<void> {
  const repoPage = new RepoPage(driver, repo.url);
  const editor = new FileEditorPage(driver);

  await task('Adding the README', async () => {
    await step('4.1', 'Open the README editor', async () => {
      if (!(await repoPage.clickCreateReadme())) {
        warn('README link not found, opened the editor URL directly');
        await driver.get(`${repo.url}/new/main?filename=README.md`);
      }
      await editor.waitUntilLoaded();
    });

    await step('4.2', 'Set the file name to README.md', () => editor.ensureFilename('README.md'));

    await step('4.3', 'Replace the editor content', async () => {
      const content = buildReadme(repo.name, repo.description);
      await editor.setContent(content);
      if (lines(await editor.content()) !== lines(content)) throw new Error('The editor content does not match the README');
    });

    await step('4.4', 'Open the commit dialog', () => editor.openCommitDialog());
    await step('4.5', 'Commit README.md', () => editor.confirmCommit());

    await step('4.6', 'Check the rendered README', async () => {
      await repoPage.open();
      const { headings, text } = await repoPage.readme();
      if (headings.length !== 1 || headings[0] !== repo.name) {
        throw new Error(`Expected one heading "${repo.name}", found ${JSON.stringify(headings)}`);
      }
      if (text.split(repo.description).length !== 2) throw new Error('The description should appear exactly once');
    });
  }, () => 'README committed and checked');
}

/** Non-blank lines, trimmed: CodeMirror's getText drops blank lines, so compare without them. */
function lines(text: string): string {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).join('\n');
}
