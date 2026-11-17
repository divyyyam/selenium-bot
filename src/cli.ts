import pc from 'picocolors';
import { parseArgs } from 'node:util';

export interface CliOptions {
  skipAll: boolean;
  title?: string;
  description?: string;
  headless?: boolean;
  cleanup: boolean;
  help: boolean;
}

export function parseCli(argv: string[]): CliOptions {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      'skip-all': { type: 'boolean', short: 'y', default: false },
      title: { type: 'string', short: 't' },
      description: { type: 'string', short: 'd' },
      headless: { type: 'boolean' },
      cleanup: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  return {
    skipAll: values['skip-all'],
    title: values.title,
    description: values.description,
    headless: values.headless,
    cleanup: values.cleanup,
    help: values.help,
  };
}

const OPTIONS: [string, string][] = [
  ['-y, --skip-all', 'Use the default title and description instead of asking'],
  ['-t, --title <name>', 'Repository title'],
  ['-d, --description <text>', 'Repository description'],
  ['    --headless', 'Run Chrome without a window'],
  ['    --cleanup', 'Delete every project-title-N repository, after one confirmation'],
  ['-h, --help', 'Show this help'],
];

const EXIT_CODES: [string, string][] = [
  ['0', 'done'],
  ['1', 'failed before or during repository creation'],
  ['2', 'repository created, README failed'],
  ['3', 'deletion failed'],
];

export function help(): string {
  const table = (rows: [string, string][], width: number) =>
    rows.map(([left, right]) => `  ${pc.cyan(left.padEnd(width))}${right}`).join('\n');

  return [
    `${pc.bold('github-bot')}  Creates a private GitHub repository with a README, through the browser.`,
    '',
    `${pc.bold('Usage')}  npm start -- [options]`,
    '',
    pc.bold('Options'),
    table(OPTIONS, 28),
    '',
    pc.bold('Examples'),
    `  npm start -- -y`,
    `  npm start -- -t "My Repo" -d "Notes for the demo"`,
    '',
    pc.bold('Exit codes'),
    table(EXIT_CODES, 4),
    '',
    pc.dim('Every run ends by asking whether to delete the new repository.'),
  ].join('\n');
}
