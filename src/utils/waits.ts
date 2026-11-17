import { By, Key, type Locator, type WebDriver, type WebElement } from 'selenium-webdriver';
import { TIMEOUTS } from '../config.js';

/** Checks once, without waiting, for the first visible element matched by any of the locators. */
export async function visibleNow(driver: WebDriver, locators: Locator | Locator[]): Promise<WebElement | null> {
  for (const locator of Array.isArray(locators) ? locators : [locators]) {
    for (const element of await driver.findElements(locator)) {
      if (await element.isDisplayed().catch(() => false)) return element;
    }
  }
  return null;
}

/** Waits for the first visible element matched by any of the locators. Timeout must be above 0: Selenium treats 0 as "forever". */
export async function waitVisible(
  driver: WebDriver,
  locators: Locator | Locator[],
  timeout: number = TIMEOUTS.element,
): Promise<WebElement> {
  return driver.wait(() => visibleNow(driver, locators), timeout, `No visible element for ${[locators].flat().join(' or ')}`) as Promise<WebElement>;
}

/** Like waitVisible, but resolves with null instead of throwing when nothing appears. */
export async function findVisible(
  driver: WebDriver,
  locators: Locator | Locator[],
  timeout: number = TIMEOUTS.element,
): Promise<WebElement | null> {
  return waitVisible(driver, locators, timeout).catch(() => null);
}

export async function waitForUrl(
  driver: WebDriver,
  matches: (url: string) => boolean,
  timeout: number = TIMEOUTS.navigation,
): Promise<string> {
  return driver.wait(
    async () => {
      const url = await driver.getCurrentUrl();
      return matches(url) ? url : null;
    },
    timeout,
    'The page did not reach the expected URL',
  ) as Promise<string>;
}

export async function waitEnabled(driver: WebDriver, element: WebElement): Promise<WebElement> {
  await driver.wait(() => element.isEnabled(), TIMEOUTS.element, 'The control stayed disabled');
  return element;
}

const SELECT_ALL = Key.chord(process.platform === 'darwin' ? Key.COMMAND : Key.CONTROL, 'a');

/** Select-all then type, because React inputs on GitHub ignore WebElement.clear(). */
export async function replaceText(element: WebElement, text: string): Promise<void> {
  await element.sendKeys(SELECT_ALL, Key.BACK_SPACE);
  if (text) await element.sendKeys(text);
}

/** The visible text of the whole page. */
export async function pageText(driver: WebDriver): Promise<string> {
  return driver.findElement(By.css('body')).getText();
}
