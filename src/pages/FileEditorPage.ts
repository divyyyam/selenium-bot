import { By, type WebDriver } from 'selenium-webdriver';
import { replaceText, waitEnabled, waitForUrl, waitVisible } from '../utils/waits.js';

const FILENAME_INPUT = [By.css('input[aria-label="File name"]'), By.css('input[placeholder^="Name your file"]')];
const EDITOR = By.css('.cm-content[contenteditable="true"]');
const COMMIT_BUTTON = By.xpath("//button[contains(normalize-space(.), 'Commit changes')]");
const DIALOG_COMMIT_BUTTON = By.xpath("//*[@role='dialog']//button[contains(normalize-space(.), 'Commit changes')]");

export class FileEditorPage {
  constructor(private readonly driver: WebDriver) {}

  async waitUntilLoaded(): Promise<void> {
    await waitVisible(this.driver, EDITOR);
  }

  async ensureFilename(name: string): Promise<void> {
    const input = await waitVisible(this.driver, FILENAME_INPUT);
    if ((await input.getAttribute('value')) !== name) await replaceText(input, name);
  }

  async setContent(content: string): Promise<void> {
    const editor = await waitVisible(this.driver, EDITOR);
    await editor.click();
    await replaceText(editor, content);
  }

  async content(): Promise<string> {
    return (await waitVisible(this.driver, EDITOR)).getText();
  }

  async openCommitDialog(): Promise<void> {
    await (await waitEnabled(this.driver, await waitVisible(this.driver, COMMIT_BUTTON))).click();
    await waitVisible(this.driver, DIALOG_COMMIT_BUTTON);
  }

  async confirmCommit(): Promise<void> {
    await (await waitEnabled(this.driver, await waitVisible(this.driver, DIALOG_COMMIT_BUTTON))).click();
    await waitForUrl(this.driver, (url) => !url.includes('/new/'));
  }
}
