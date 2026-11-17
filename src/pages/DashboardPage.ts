import { By, type WebDriver } from 'selenium-webdriver';
import { GITHUB } from '../config.js';
import { findVisible } from '../utils/waits.js';

const NEW_REPO_LINK = By.css('a[href="/new"]');
const CREATE_MENU = By.css('button[class*="responsiveCreateMenu"]');
const NEW_REPO_ITEM = [
  By.xpath("//*[@role='menuitem'][contains(normalize-space(.), 'New repository')]"),
  By.css('[role="menu"] a[href="/new"]'),
];

export class DashboardPage {
  constructor(private readonly driver: WebDriver) {}

  async open(): Promise<void> {
    await this.driver.get(`${GITHUB}/`);
  }

  async clickNew(): Promise<boolean> {
    const entry = await findVisible(this.driver, [NEW_REPO_LINK, CREATE_MENU], 10_000);
    if (!entry) return false;
    await entry.click();
    if ((await entry.getTagName()) === 'a') return true;

    const item = await findVisible(this.driver, NEW_REPO_ITEM, 5_000);
    if (!item) return false;
    await item.click();
    return true;
  }
}
