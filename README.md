# selenium-bot

A command-line tool that drives Chrome with Selenium to create a private GitHub repository, commit a README to it, and optionally delete it again. Everything happens through GitHub's web interface, the same way a person would click through it, with no API calls.

## What it does

1. **Signs in** with the username and password from `.env`. It reuses a saved Chrome profile, so later runs skip the login form. If GitHub asks for an emailed device code, the bot waits up to 5 minutes for you to enter it in the browser.
2. **Creates a private repository.** You give a title or accept the default `project-title-N`. Titles are cleaned up to match GitHub's naming rules, and if a name is taken the bot moves on to the next free one.
3. **Commits a README** with the title as a heading and the description below it, then opens the repo page and checks that it rendered correctly.
4. **Asks whether to delete the repository** and, if you say yes, deletes it through the settings page.

Each step is checked before the next one starts. When a step fails, the bot saves a screenshot named after that step to `screenshots/` and exits with a specific code.

## Setup

Requires Node.js 18+ and Google Chrome.

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```env
GITHUB_USERNAME=your-username
GITHUB_PASSWORD=your-password
HEADLESS=false
```

Use an account without two-factor authentication. The bot stops with a clear message if 2FA is turned on.

## Usage

```bash
npm start                                  # asks for a title and description
npm start -- -y                            # uses the defaults, no prompts
npm start -- -t "My Repo" -d "Some notes"  # sets both up front
npm start -- --headless                    # runs Chrome without a window
npm start -- --cleanup                     # deletes every project-title-N repo
```

| Exit code | Meaning                                   |
|-----------|-------------------------------------------|
| 0         | Finished                                  |
| 1         | Failed during sign-in or repo creation    |
| 2         | Repository created, README failed         |
| 3         | Deletion failed                           |

## Project layout

- `src/flows/`: the sign-in, create, README and delete sequences, split into numbered steps
- `src/pages/`: page objects that hold the selectors for each GitHub screen
- `src/core/`: title normalisation and README content, with no browser code
- `src/utils/`: waits, prompts, terminal output and screenshots

Run the unit tests with `npm test` and type-check with `npm run typecheck`.
