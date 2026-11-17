const API = 'https://api.github.com';

export interface ApiRepo {
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  created_at: string;
  owner: { login: string };
}

export class GitHubApi {
  constructor(private readonly token: string) {}

  static fromEnv(): GitHubApi | null {
    const token = process.env.GITHUB_TOKEN?.trim();
    return token ? new GitHubApi(token) : null;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'github-bot-e2e',
        ...init.headers,
      },
    });
  }

  async viewer(): Promise<string> {
    const res = await this.request('/user');
    if (!res.ok) throw new Error(`GET /user returned ${res.status}. Check GITHUB_TOKEN.`);
    return ((await res.json()) as { login: string }).login;
  }

  async getRepo(owner: string, name: string): Promise<ApiRepo | null> {
    const res = await this.request(`/repos/${owner}/${name}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET /repos/${owner}/${name} returned ${res.status}`);
    return (await res.json()) as ApiRepo;
  }

  async getReadme(owner: string, name: string): Promise<{ path: string; content: string } | null> {
    const res = await this.request(`/repos/${owner}/${name}/readme`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET readme returned ${res.status}`);
    const body = (await res.json()) as { path: string; content: string; encoding: string };
    return { path: body.path, content: Buffer.from(body.content, body.encoding as BufferEncoding).toString('utf8') };
  }

  async commitMessages(owner: string, name: string): Promise<string[]> {
    const res = await this.request(`/repos/${owner}/${name}/commits?per_page=10`);
    if (res.status === 409) return [];
    if (!res.ok) throw new Error(`GET commits returned ${res.status}`);
    return ((await res.json()) as { commit: { message: string } }[]).map((c) => c.commit.message);
  }

  async deleteRepo(owner: string, name: string): Promise<boolean> {
    const res = await this.request(`/repos/${owner}/${name}`, { method: 'DELETE' });
    if (res.status === 404) return false;
    if (res.status !== 204) throw new Error(`DELETE /repos/${owner}/${name} returned ${res.status}`);
    return true;
  }

  async listOwnRepos(): Promise<ApiRepo[]> {
    const res = await this.request('/user/repos?affiliation=owner&per_page=100&sort=created&direction=desc');
    if (!res.ok) throw new Error(`GET /user/repos returned ${res.status}`);
    return (await res.json()) as ApiRepo[];
  }
}
