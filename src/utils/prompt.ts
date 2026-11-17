import * as clack from '@clack/prompts';
import { activeTask } from './ui.js';

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
  }
}

export async function ask(message: string, placeholder?: string): Promise<string> {
  const answer = await paused(() => clack.text({ message, placeholder, defaultValue: '' }));
  return (answer ?? '').trim();
}

export async function confirm(message: string): Promise<boolean> {
  return paused(() => clack.confirm({ message, initialValue: false }));
}

async function paused<T>(prompt: () => Promise<T>): Promise<Exclude<T, symbol>> {
  const task = activeTask();
  task?.pause();
  const answer = await prompt();
  if (clack.isCancel(answer)) throw new CancelledError();
  task?.resume();
  return answer as Exclude<T, symbol>;
}
