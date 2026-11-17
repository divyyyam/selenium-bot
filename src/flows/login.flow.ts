import type { WebDriver } from 'selenium-webdriver';
import type { Config } from '../config.js';
import { LoginPage } from '../pages/LoginPage.js';
import { step, StepError, warn } from '../utils/step.js';
import { task } from '../utils/ui.js';

export async function login(driver: WebDriver, { username, password }: Config): Promise<string> {
  const page = new LoginPage(driver);

  return task('Signing in', async () => {
    await step('1.1', 'Open the login page', () => page.open());

    if (!(await page.signedInUser())) {
      await step('1.2', 'Type the username', () => page.typeUsername(username));
      await step('1.3', 'Type the password', () => page.typePassword(password));
      await step('1.4', 'Click Sign in', () => page.submit());

      const outcome = await step('1.5', 'Wait for the login result', () => page.waitForOutcome());

      if (outcome === 'bad-credentials') {
        throw new StepError('1.5', 'Incorrect username or password. Check GITHUB_USERNAME and GITHUB_PASSWORD in .env.');
      }
      if (outcome === 'two-factor') {
        throw new StepError('1.5', 'This account uses two-factor authentication, which the bot does not handle.');
      }
      if (outcome === 'device-verification') {
        warn('GitHub emailed a verification code. Enter it in the browser window (5 minutes).');
        await step('1.5', 'Wait for device verification', () => page.waitForManualVerification());
      }
    }

    const user = await page.signedInUser();
    if (user.toLowerCase() !== username.toLowerCase()) {
      throw new StepError('1.5', `Chrome is signed in as "${user}", not "${username}". Sign out in the browser or delete .chrome-profile/.`);
    }
    return user;
  }, (user) => `Signed in as ${user}`);
}
