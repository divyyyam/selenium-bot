import * as clack from '@clack/prompts';
import pc from 'picocolors';

/** A running flow: one spinner that shows the live step, then a dim list of finished steps. */
export class Task {
  private spinner = clack.spinner();
  private readonly started = performance.now();
  private readonly lines: string[] = [];
  private current = '';

  constructor(private readonly title: string) {
    this.spinner.start(title);
  }

  async step<T>(id: string, label: string, action: () => Promise<T>): Promise<T> {
    this.current = `${id} ${label}`;
    this.spinner.message(this.spinnerText());

    const started = performance.now();
    const result = await action();
    this.lines.push(`${pc.green('✓')} ${pc.dim(id)} ${label}  ${pc.dim(elapsed(started))}`);
    return result;
  }

  warn(message: string): void {
    this.lines.push(`${pc.yellow('!')} ${message}`);
  }

  /** Clears the spinner line so a prompt can take over the terminal. */
  pause(): void {
    this.spinner.clear();
  }

  /** A fresh spinner: a cleared one still remembers its last frame and erases the wrong lines on restart. */
  resume(): void {
    this.spinner = clack.spinner();
    this.spinner.start(this.spinnerText());
  }

  /**
   * One terminal row at most. clack measures the wrap without its own symbol and dots,
   * so a message near the terminal width leaves a stray line on every frame.
   */
  private spinnerText(): string {
    const text = this.current ? `${this.title} · ${this.current}` : this.title;
    const room = (process.stdout.columns || 80) - 8;
    return text.length > room ? `${text.slice(0, room - 1)}…` : text;
  }

  succeed(message: string): void {
    this.spinner.stop(`${message}  ${pc.dim(elapsed(this.started))}`);
    this.printLines();
  }

  fail(message: string): void {
    this.spinner.error(pc.red(message));
    this.lines.push(`${pc.red('✗')} ${pc.dim(this.current)}`);
    this.printLines();
  }

  private printLines(): void {
    if (this.lines.length) clack.log.message(this.lines, { spacing: 0, symbol: pc.gray('│') });
  }
}

let active: Task | null = null;

/** Runs `work` under a Task. The task line shows `done(result)` on success, the error on failure. */
export async function task<T>(title: string, work: (task: Task) => Promise<T>, done: (result: T) => string): Promise<T> {
  const current = new Task(title);
  active = current;
  try {
    const result = await work(current);
    current.succeed(done(result));
    return result;
  } catch (error) {
    current.fail(messageOf(error));
    throw error;
  } finally {
    active = null;
  }
}

export function activeTask(): Task | null {
  return active;
}

export function elapsed(since: number): string {
  return `${((performance.now() - since) / 1000).toFixed(1)}s`;
}

export function messageOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n')[0];
}
