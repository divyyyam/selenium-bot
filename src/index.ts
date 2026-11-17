import * as clack from '@clack/prompts';
import pc from 'picocolors';
import type { WebDriver } from 'selenium-webdriver';
import { help, parseCli, type CliOptions } from './cli.js';
import { loadConfig, type Config } from './config.js';
import { createDriver } from './driver.js';
import { createRepo, type Repo } from './flows/createRepo.flow.js';
import { cleanup, deleteRepo } from './flows/delete.flow.js';
import { login } from './flows/login.flow.js';
import { createReadme } from './flows/readme.flow.js';
import { CancelledError, confirm } from './utils/prompt.js';
import { saveScreenshot } from './utils/screenshot.js';
import { StepError } from './utils/step.js';
import { elapsed, messageOf, task } from './utils/ui.js';

const EXIT = { ok: 0, failed: 1, readmeFailed: 2, deleteFailed: 3, cancelled: 130 } as const;
const FAILED = Symbol('failed');

async function main(): Promise<number> {
  const started = performance.now();
  let options: CliOptions;
  try {
    options = parseCli(process.argv.slice(2));
  } catch (error) {
    console.error(`${pc.red(messageOf(error))}\nRun ${pc.cyan('npm start -- --help')} to see the options.`);
    return EXIT.failed;
  }

  if (options.help) {
    console.log(help());
    return EXIT.ok;
  }

  clack.intro(pc.bgCyan(pc.black(' github-bot ')));

  let config: Config;
  try {
    config = loadConfig();
  } catch (error) {
    clack.cancel(messageOf(error));
    return EXIT.failed;
  }

  const headless = options.headless ?? config.headless;
  const driver = await task('Starting Chrome', () => createDriver(headless), () => `Chrome ready${headless ? ' (headless)' : ''}`);
  process.once('SIGINT', () => void driver.quit().finally(() => process.exit(EXIT.cancelled)));

  try {
    const code = await run(driver, config, options);
    clack.outro(code === EXIT.ok ? pc.green(`Done in ${elapsed(started)}`) : pc.red(`Finished with errors (exit code ${code})`));
    return code;
  } catch (error) {
    if (!(error instanceof CancelledError)) throw error;
    clack.cancel('Cancelled');
    return EXIT.cancelled;
  } finally {
    await driver.quit();
  }
}

async function run(driver: WebDriver, config: Config, options: CliOptions): Promise<number> {
  if ((await attempt(driver, () => login(driver, config))) === FAILED) return EXIT.failed;

  if (options.cleanup) {
    return (await attempt(driver, () => cleanup(driver, config))) === FAILED ? EXIT.deleteFailed : EXIT.ok;
  }

  const repo = await attempt(driver, () => createRepo(driver, config, options));
  if (repo === FAILED) return EXIT.failed;

  const readmeDone = (await attempt(driver, () => createReadme(driver, repo))) !== FAILED;
  let code: number = readmeDone ? EXIT.ok : EXIT.readmeFailed;

  let deleted = 'no';
  if (await confirm(`Delete ${repo.fullName} now?`)) {
    const ok = (await attempt(driver, () => deleteRepo(driver, config, repo))) !== FAILED;
    deleted = ok ? 'yes' : pc.red('failed');
    if (!ok) code = EXIT.deleteFailed;
  }

  clack.note(summary(repo, readmeDone, deleted), 'Summary');
  return code;
}

function summary(repo: Repo, readmeDone: boolean, deleted: string): string {
  const rows: [string, string][] = [
    ['Repository', pc.cyan(repo.url)],
    ['Visibility', 'private'],
    ['Description', repo.description],
    ['README', readmeDone ? 'committed' : pc.red('failed')],
    ['Deleted', deleted],
  ];
  return rows.map(([key, value]) => `${pc.dim(key.padEnd(12))}${value}`).join('\n');
}

async function attempt<T>(driver: WebDriver, flow: () => Promise<T>): Promise<T | typeof FAILED> {
  try {
    return await flow();
  } catch (error) {
    if (error instanceof CancelledError) throw error;

    const stepId = error instanceof StepError ? error.step : null;
    const label = stepId ? `flow${stepId.split('.')[0]}-step${stepId}` : 'error';
    const file = await saveScreenshot(driver, label).catch(() => null);
    if (file) clack.log.message(pc.dim(`Screenshot saved to ${file}`), { symbol: pc.gray('│') });
    return FAILED;
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    clack.cancel(messageOf(error));
    process.exit(EXIT.failed);
  },
);
