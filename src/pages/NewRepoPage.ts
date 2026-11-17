import { By, type WebDriver } from 'selenium-webdriver';
import { GITHUB, TIMEOUTS } from '../config.js';
import { pageText, replaceText, waitEnabled, waitForUrl, waitVisible } from '../utils/waits.js';

const fieldLabelled = (label: string) => [
  By.xpath(`//*[self::input or self::textarea][@id=//label[contains(normalize-space(.), '${label}')]/@for]`),
  By.xpath(`//*[self::input or self::textarea][contains(@aria-label, '${label}')]`),
];

const NAME_INPUT = fieldLabelled('Repository name');
const DESCRIPTION_INPUT = fieldLabelled('Description');
const VISIBILITY_BUTTON = [By.id('visibility-anchor-button'), By.css('button[aria-label^="Choose visibility"]')];
const PRIVATE_OPTION = By.xpath("//*[@role='menuitemradio'][.//*[normalize-space(.)='Private']]");
const CREATE_BUTTON = By.xpath("//button[@type='submit'][normalize-space(.)='Create repository']");

export class NewRepoPage {
  constructor(private readonly driver: WebDriver) {}

  async open(): Promise<void> {
    await this.driver.get(`${GITHUB}/new`);
  }

  async waitUntilLoaded(): Promise<void> {
    await waitForUrl(this.driver, (url) => new URL(url).pathname === '/new');
    await waitVisible(this.driver, NAME_INPUT);
  }

  async setName(name: string): Promise<void> {
    await replaceText(await waitVisible(this.driver, NAME_INPUT), name);
  }

  async isNameAvailable(name: string): Promise<boolean> {
    const answer = await this.driver.wait(
      async () => {
        const text = await pageText(this.driver);
        if (text.includes(`${name} is available`)) return 'yes';
        if (text.includes(`${name} already exists`)) return 'no';
        return null;
      },
      TIMEOUTS.element,
      `GitHub did not report whether ${name} is available`,
    );
    return answer === 'yes';
  }

  async setDescription(description: string): Promise<void> {
    const input = await waitVisible(this.driver, DESCRIPTION_INPUT);
    await replaceText(input, description);
    if ((await input.getAttribute('value')) === description) return;

    await this.driver.executeScript(
      `const [field, value] = arguments;
       const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value').set;
       setter.call(field, value);
       field.dispatchEvent(new Event('input', { bubbles: true }));`,
      input,
      description,
    );
    if ((await input.getAttribute('value')) === description) return;
    throw new Error(`The description field holds "${await input.getAttribute('value')}", expected "${description}"`);
  }

  async setPrivate(): Promise<void> {
    const toggle = await waitVisible(this.driver, VISIBILITY_BUTTON);
    await toggle.click();
    await (await waitVisible(this.driver, PRIVATE_OPTION)).click();
    await this.driver.wait(
      async () => (await toggle.getAttribute('aria-label'))?.endsWith('Private'),
      TIMEOUTS.element,
      'Visibility still shows Public',
    );
  }

  async create(): Promise<void> {
    const button = await waitEnabled(this.driver, await waitVisible(this.driver, CREATE_BUTTON));
    await this.driver.executeScript('arguments[0].scrollIntoView({ block: "center" })', button);
    await button.click();
  }
}
