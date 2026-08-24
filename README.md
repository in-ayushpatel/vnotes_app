# vNotes

vNotes is a developer-first notes workspace backed by your own GitHub repository. Write in Markdown or rich text, browse related source code, and keep every saved change in Git history without a proprietary notes database.

Current release: **v1.0.0** · [Release notes](./CHANGELOG.md)

## Features

- GitHub OAuth with access to public and private repositories
- Markdown editing with CodeMirror, syntax highlighting, and GFM support
- Rich-text editing with Markdown serialization
- Edit, preview, and resizable split-view modes
- Automatic saves to GitHub after three seconds of inactivity
- File and folder creation, deletion, drag-and-drop moves, and inline rename
- Command palette and fuzzy file search with `⌘/Ctrl + P`
- Mermaid diagram rendering in Markdown previews
- Drag-and-drop and clipboard image uploads
- Automatic table of contents for Markdown headings
- Read-only syntax-highlighted source-code viewing
- Responsive desktop and mobile layouts

## How it works

vNotes is a stateless Next.js application that uses GitHub as its storage layer:

```text
Browser → Next.js route handlers → GitHub REST API → Your repository
```

New notes and folders are created under `notes/`. Uploaded images are stored under `notes/.images/`. Supported text and source files elsewhere in the selected repository are visible in read-only mode.

Each Markdown save writes directly to the selected repository through the GitHub Contents API, so the repository remains the source of truth.

## Supported files

Markdown files (`.md`) are editable. The following formats are currently available in read-only code view:

`Java`, `Kotlin`, `JavaScript`, `JSX`, `TypeScript`, `TSX`, `Python`, `C`, `C++`, `Go`, `Rust`, `SQL`, `Shell`, `JSON`, `YAML`, `XML`, `Properties`, and `TOML`.

## Requirements

- Node.js 20.9 or newer
- npm
- A GitHub account
- A GitHub OAuth App

## Local setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/in-ayushpatel/vnotes_app.git
   cd vnotes_app
   npm install
   ```

2. Create a GitHub OAuth App from **GitHub Settings → Developer settings → OAuth Apps**. For local development, configure:

   ```text
   Homepage URL:               http://localhost:3000
   Authorization callback URL: http://localhost:3000/api/auth/callback
   ```

3. Create `.env.local` in the project root:

   ```dotenv
   GITHUB_CLIENT_ID=your_oauth_client_id
   GITHUB_CLIENT_SECRET=your_oauth_client_secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000), sign in with GitHub, and select a repository.

The OAuth flow requests the `repo` scope so vNotes can read and update both public and private repositories selected by the user. Never commit `.env.local` or expose the client secret to browser code.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create and type-check the production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘/Ctrl + P` | Open the file command palette |
| `⌘/Ctrl + S` | Save the current Markdown note immediately |
| `Escape` | Close the command palette |

## Project structure

```text
src/
├── app/
│   ├── api/          # GitHub OAuth and repository operations
│   ├── app/          # Authenticated notes workspace
│   └── page.tsx      # Landing and sign-in page
├── components/
│   ├── editor/       # Markdown, rich-text, preview, and code views
│   ├── sidebar/      # Repository tree and search
│   └── ui/           # Command palette and shared UI
├── lib/              # GitHub API client and file-type helpers
├── store/            # Zustand application state
└── types/            # Shared TypeScript types
```

## Production deployment

Build and validate the application before deployment:

```bash
npm run lint
npm run build
```

Deploy to a Next.js-compatible Node.js host and add the same three environment variables in the hosting provider. Set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin, then update the GitHub OAuth App:

```text
Homepage URL:               https://your-domain.example
Authorization callback URL: https://your-domain.example/api/auth/callback
```

## Data and security

- GitHub access tokens are stored in an HTTP-only, same-site cookie.
- Authentication cookies are marked secure in production.
- Repository content is fetched and changed server-side through GitHub's API.
- vNotes does not use a separate database for note content.

## Release history

See [CHANGELOG.md](./CHANGELOG.md). The current source release is tagged [`v1.0.0`](https://github.com/in-ayushpatel/vnotes_app/tree/v1.0.0).
