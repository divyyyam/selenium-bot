import { By, type WebDriver } from 'selenium-webdriver';
import { GITHUB, TIMEOUTS } from '../config.js';
import { visibleNow, waitVisible } from '../utils/waits.js';

export type LoginOutcome = 'logged-in' | 'bad-credentials' | 'device-verification' | 'two-factor';

const USERNAME = By.id('login_field');
const PASSWORD = By.id('password');
const SIGN_IN = By.css('input[name="commit"], button[name="commit"]');
const ERROR_BANNER = By.xpath("//*[contains(@class,'flash-error')][contains(., 'Incorrect username or password')]");
const USER_LOGIN_META = By.css('meta[name="user-login"]');

export class LoginPage {
  constructor(private readonly driver: WebDriver) {}

  async open(): Promise<void> {
    await this.driver.get(`${GITHUB}/login`);
  }

  async signedInUser(): Promise<string> {
    const [meta] = await this.driver.findElements(USER_LOGIN_META);
    return meta ? ((await meta.getAttribute('content')) ?? '') : '';
  }

  async typeUsername(username: string): Promise<void> {
    const field = await waitVisible(this.driver, USERNAME);
    await field.clear();
    await field.sendKeys(username);
  }

  async typePassword(password: string): Promise<void> {
    const field = await waitVisible(this.driver, PASSWORD);
    await field.clear();
    await field.sendKeys(password);
  }

  async submit(): Promise<void> {
    await (await waitVisible(this.driver, SIGN_IN)).click();
  }

  async waitForOutcome(): Promise<LoginOutcome> {
    return this.driver.wait(
      async () => {
        const url = await this.driver.getCurrentUrl();
        if (url.includes('/sessions/verified-device')) return 'device-verification';
        if (url.includes('/sessions/two-factor')) return 'two-factor';
        if (await this.signedInUser()) return 'logged-in';
        if (await visibleNow(this.driver, ERROR_BANNER)) return 'bad-credentials';
        return null;
      },
      TIMEOUTS.navigation,
      'No login result appeared',
    ) as Promise<LoginOutcome>;
  }

  async waitForManualVerification(): Promise<void> {
    await this.driver.wait(
      async () => (await this.signedInUser()) !== '',
      TIMEOUTS.deviceVerification,
      'Device verification was not completed in time',
    );
  }
}
