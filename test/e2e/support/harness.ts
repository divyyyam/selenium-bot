import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../../../src/driver.js';
import { saveScreenshot } from '../../../src/utils/screenshot.js';

export const E2E_ENABLED = process.env.E2E === '1';
export const NEGATIVE_LOGIN_ENABLED = process.env.E2E_NEGATIVE === '1';
export const HEADLESS = process.env.HEADLESS === 'true';
export const E2E_NAME = /^e2e-[a-z0-9]+-/;

export function runId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function eventually<T>(
  probe: () => Promise<T | null>,
  { what, timeout = 30_000, interval = 1_000 }: { what: string; timeout?: number; interval?: number },
): Promise<T> {
  const deadline = Date.now() + timeout;
  let lastError: unknown = null;
  for (;;) {
    try {
      const value = await probe();
      if (value !== null) return value;
    } catch (error) {
      lastError = error;
    }
    if (Date.now() >= deadline) {
      const reason = lastError instanceof Error ? `: ${lastError.message}` : '';
      throw new Error(`Timed out after ${timeout / 1000}s waiting for ${what}${reason}`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

export async function withEvidence(driver: WebDriver, label: string, body: () => Promise<void>): Promise<void> {
  try {
    await body();
    await saveScreenshot(driver, `e2e-${label}-pass`).catch(() => null);
  } catch (error) {
    const file = await saveScreenshot(driver, `e2e-${label}-fail`).catch(() => null);
    if (file && error instanceof Error) error.message += `\nScreenshot: ${file}`;
    throw error;
  }
}

export async function isolatedDriver(): Promise<{ driver: WebDriver; dispose: () => Promise<void> }> {
  const profile = await mkdtemp(join(tmpdir(), 'github-bot-e2e-'));
  const driver = await createDriver(HEADLESS, profile);
  return {
    driver,
    dispose: async () => {
      await driver.quit().catch(() => undefined);
      await rm(profile, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}
