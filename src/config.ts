import 'dotenv/config';

export interface Config {
  username: string;
  password: string;
  headless: boolean;
}

export const TIMEOUTS = {
  element: 15_000,
  navigation: 30_000,
  deviceVerification: 5 * 60_000,
} as const;

export const GITHUB = 'https://github.com';

export const DEFAULT_DESCRIPTION = 'Created by github-bot';

export const MAX_DEFAULT_NAME_ATTEMPTS = 50;

export function loadConfig(): Config {
  const username = process.env.GITHUB_USERNAME?.trim();
  const password = process.env.GITHUB_PASSWORD;

  if (!username || !password) {
    throw new Error('GITHUB_USERNAME and GITHUB_PASSWORD must be set in .env (see .env.example).');
  }

  return { username, password, headless: process.env.HEADLESS === 'true' };
}
