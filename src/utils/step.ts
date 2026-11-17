import { CancelledError } from './prompt.js';
import { activeTask, messageOf } from './ui.js';

/** A failure tied to a PRD step id such as "3.6", so the report and screenshot name the step. */
export class StepError extends Error {
  constructor(
    readonly step: string,
    message: string,
  ) {
    super(message);
  }
}

/** Runs one step inside the active task and tags any failure with the step id. */
export async function step<T>(id: string, label: string, action: () => Promise<T>): Promise<T> {
  try {
    const task = activeTask();
    return task ? await task.step(id, label, action) : await action();
  } catch (error) {
    if (error instanceof StepError || error instanceof CancelledError) throw error;
    throw new StepError(id, `${label}: ${messageOf(error)}`);
  }
}

/** Notes something unexpected but recoverable under the active task. */
export function warn(message: string): void {
  activeTask()?.warn(message);
}
