import { By, type WebDriver } from 'selenium-webdriver';
import { findVisible, waitVisible } from '../utils/waits.js';

const PRIVATE_BADGE = By.xpath("//span[contains(@class, 'Label')][normalize-space(.)='Private']");
const README_LINK = [By.css('a[href*="filename=README.md"]'), By.xpath("//a[normalize-space(.)='README']")];
const README_ARTICLE = By.css('article.markdown-body');
const SETTINGS_TAB = [By.id('settings-tab'), By.css('a[data-tab-item="settings"]')];

export class RepoPage {
  constructor(
    private readonly driver: WebDriver,
    readonly url: string,
  ) {}

  async open(): Promise<void> {
    await this.driver.get(this.url);
  }

  async hasPrivateBadge(): Promise<boolean> {
    return (await findVisible(this.driver, PRIVATE_BADGE)) !== null;
  }

  async clickCreateReadme(): Promise<boolean> {
    const link = await findVisible(this.driver, README_LINK);
    if (!link) return false;
    await link.click();
    return true;
  }

  async readme(): Promise<{ headings: string[]; text: string }> {
    const article = await waitVisible(this.driver, README_ARTICLE);
    const headings = await Promise.all((await article.findElements(By.css('h1'))).map(async (h) => (await h.getText()).trim()));
    return { headings, text: await article.getText() };
  }

  async clickSettings(): Promise<boolean> {
    const tab = await findVisible(this.driver, SETTINGS_TAB);
    if (!tab) return false;
    await tab.click();
    return true;
  }

  async isGone(): Promise<boolean> {
    await this.open();
    return (await this.driver.getTitle()).includes('Page not found');
  }
}
