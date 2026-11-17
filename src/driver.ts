import { resolve } from 'node:path';
import { Builder, type WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { TIMEOUTS } from './config.js';

// A persistent profile keeps the GitHub session, so device verification happens at most once.
const PROFILE_DIR = resolve('.chrome-profile');

export async function createDriver(headless: boolean): Promise<WebDriver> {
  const options = new chrome.Options();
  options.addArguments(`--user-data-dir=${PROFILE_DIR}`, '--window-size=1280,900');
  if (headless) options.addArguments('--headless=new');

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  await driver.manage().setTimeouts({ implicit: 0, pageLoad: TIMEOUTS.navigation });
  return driver;
}
