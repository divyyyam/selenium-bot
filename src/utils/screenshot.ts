import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { WebDriver } from 'selenium-webdriver';

const DIR = 'screenshots';

export async function saveScreenshot(driver: WebDriver, label: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(DIR, `${timestamp}-${label}.png`);

  await mkdir(DIR, { recursive: true });
  await writeFile(file, await driver.takeScreenshot(), 'base64');
  return file;
}
