import { resolve } from 'node:path';
import { Builder, type WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { TIMEOUTS } from './config.js';

const PROFILE_DIR = resolve('.chrome-profile');

export async function createDriver(headless: boolean, profileDir: string = PROFILE_DIR): Promise<WebDriver> {
  const options = new chrome.Options();
  options.addArguments(
    `--user-data-dir=${profileDir}`,
    '--window-size=1280,900',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
  );
  if (headless) options.addArguments('--headless=new');

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  await driver.manage().setTimeouts({ implicit: 0, pageLoad: TIMEOUTS.navigation });
  return driver;
}
