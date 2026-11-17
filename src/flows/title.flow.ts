import * as clack from '@clack/prompts';
import { DEFAULT_DESCRIPTION, MAX_DEFAULT_NAME_ATTEMPTS } from '../config.js';
import { defaultName, isSpecialName, normalizeTitle } from '../core/title.js';
import { ask, confirm } from '../utils/prompt.js';
import { StepError, warn } from '../utils/step.js';

export interface Title {
  name: string;
  index: number | null;
}

export interface TitleInput {
  username: string;
  preset?: string;
  interactive: boolean;
}

export async function chooseTitle(
  { username, preset, interactive }: TitleInput,
  question = 'Repository title',
): Promise<Title> {
  let raw = preset;

  for (;;) {
    if (raw === undefined) {
      if (!interactive) return generated(1);
      raw = await ask(question, `Enter for ${defaultName(1)}`);
    }

    const name = normalizeTitle(raw);
    if (!name) return generated(1);
    if (name !== raw.trim()) clack.log.info(`Using ${name} (GitHub only allows letters, digits, . - _)`);

    if (!isSpecialName(name, username)) return { name, index: null };
    if (await confirm(`${name} is your profile README or Pages repo name. Use it anyway?`)) return { name, index: null };

    raw = undefined;
  }
}

export async function nextTitle(taken: Title, input: TitleInput): Promise<Title> {
  if (taken.index === null) {
    const reason = `${input.username}/${taken.name} already exists`;
    warn(reason);
    if (!input.interactive) warn(`Falling back to ${defaultName(1)}`);
    return chooseTitle({ ...input, preset: undefined }, `${reason}. Pick another title`);
  }

  if (taken.index >= MAX_DEFAULT_NAME_ATTEMPTS) {
    throw new StepError('3.4', `No free name between ${defaultName(1)} and ${defaultName(taken.index)}.`);
  }
  warn(`${taken.name} is taken, trying ${defaultName(taken.index + 1)}`);
  return generated(taken.index + 1);
}

export async function chooseDescription(preset: string | undefined, interactive: boolean): Promise<string> {
  const answer = preset ?? (interactive ? await ask('Description', `Enter for: ${DEFAULT_DESCRIPTION}`) : '');
  return answer.trim() || DEFAULT_DESCRIPTION;
}

function generated(index: number): Title {
  return { name: defaultName(index), index };
}
