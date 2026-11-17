export function buildReadme(title: string, description?: string): string {
  return description ? `# ${title}\n\n${description}\n` : `# ${title}\n`;
}
