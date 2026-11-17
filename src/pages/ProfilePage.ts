import { By, type WebDriver } from 'selenium-webdriver';
import { GITHUB } from '../config.js';
import { findVisible } from '../utils/waits.js';

const REPO_LINK = By.css('a[itemprop="name codeRepository"]');

export class ProfilePage {
  constructor(private readonly driver: WebDriver) {}

  async searchRepositories(username: string, query: string): Promise<string[]> {
    await this.driver.get(`${GITHUB}/${username}?tab=repositories&q=${encodeURIComponent(query)}`);
    if (!(await findVisible(this.driver, REPO_LINK))) return [];

    const links = await this.driver.findElements(REPO_LINK);
    return Promise.all(links.map(async (link) => (await link.getText()).trim()));
  }
}
