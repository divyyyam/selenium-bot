import { By, Key, type WebDriver } from 'selenium-webdriver';
import { TIMEOUTS } from '../config.js';
import { replaceText, visibleNow, waitEnabled, waitForUrl, waitVisible } from '../utils/waits.js';

const DIALOG = '#repo-delete-menu-dialog';
const OPEN_DIALOG = By.css('button[data-show-dialog-id="repo-delete-menu-dialog"]');
const PROCEED = (stage: number) => By.css(`${DIALOG} button[data-next-stage="${stage}"]`);
const CONFIRM_INPUT = By.css(`${DIALOG} input[data-test-selector="repo-delete-proceed-confirmation"]`);
const FINAL_DELETE = By.css(`${DIALOG} button[type="submit"]`);
const SUDO_PASSWORD = [By.id('sudo_password'), By.css('input[type="password"]')];

export class RepoSettingsPage {
  constructor(private readonly driver: WebDriver) {}

  async waitUntilLoaded(): Promise<void> {
    await waitForUrl(this.driver, (url) => url.endsWith('/settings'));
    await waitVisible(this.driver, OPEN_DIALOG);
  }

  /** Walks GitHub's three-stage delete dialog, typing the "owner/repo" name it asks for. */
  async deleteRepository(password: string): Promise<void> {
    await (await waitVisible(this.driver, OPEN_DIALOG)).click();
    await (await waitVisible(this.driver, PROCEED(2))).click();
    await (await waitVisible(this.driver, PROCEED(3))).click();

    const input = await waitVisible(this.driver, CONFIRM_INPUT);
    await replaceText(input, (await input.getAttribute('data-repo-nwo')) ?? '');
    await (await waitEnabled(this.driver, await waitVisible(this.driver, FINAL_DELETE))).click();

    // GitHub may ask for the password again ("sudo mode") before a destructive action.
    if ((await this.waitForDeleteOrSudo()) === 'sudo') {
      await (await waitVisible(this.driver, SUDO_PASSWORD)).sendKeys(password, Key.ENTER);
      await waitForUrl(this.driver, (url) => !url.includes('/settings'));
    }
  }

  private async waitForDeleteOrSudo(): Promise<'deleted' | 'sudo'> {
    return this.driver.wait(
      async () => {
        if (!(await this.driver.getCurrentUrl()).includes('/settings')) return 'deleted';
        return (await visibleNow(this.driver, SUDO_PASSWORD)) ? 'sudo' : null;
      },
      TIMEOUTS.navigation,
      'GitHub did not finish deleting the repository',
    ) as Promise<'deleted' | 'sudo'>;
  }
}
