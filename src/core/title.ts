const MAX_LENGTH = 100;

export function normalizeTitle(input: string): string | null {
  const name = input
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH);

  return name === '' || name === '.' || name === '..' ? null : name;
}

export function defaultName(index: number): string {
  return `project-title-${index}`;
}

export function defaultIndex(name: string): number | null {
  const match = /^project-title-(\d+)$/.exec(name);
  return match ? Number(match[1]) : null;
}

/** The profile README repo and the Pages site repo change how GitHub treats the account. */
export function isSpecialName(name: string, username: string): boolean {
  const lower = name.toLowerCase();
  return lower === username.toLowerCase() || lower === `${username.toLowerCase()}.github.io`;
}
