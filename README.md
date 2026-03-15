# Kybernesis CLI

A command-line interface for interacting with your [Kybernesis](https://kybernesis.ai) memory workspace. Authenticate once via browser, then search, save, list, and manage memories directly from your terminal.

## Installation

```bash
npm install -g kybernesis
```

### From source

```bash
git clone https://github.com/KybernesisAI/kybernesis-cli.git
cd kybernesis-cli
npm install
npm run build
npm install -g .
```

## Quick Start

### 1. Log in

```bash
kybernesis login
```

This opens your browser to authenticate via Kybernesis. Sign in with your account, pick a workspace, and the CLI stores your credentials locally at `~/.config/kybernesis/auth.json`.

### 2. Check your status

```bash
kybernesis status
```

Shows your current workspace, user ID, token expiry, and server connection status.

### 3. Search your memories

```bash
kybernesis search "react patterns"
```

Returns matching memories with titles, summaries, tags, and metadata.

### 4. Save a memory

```bash
kybernesis save "We decided to use Zustand for global state management" \
  --title "State management decision" \
  --tags react,zustand,state
```

### 5. List recent memories

```bash
kybernesis list
kybernesis list --limit 50
kybernesis list --limit 20 --offset 40
```

### 6. View statistics

```bash
kybernesis stats
```

Shows total memory count, breakdown by tier (hot/warm/archive) and source (upload/chat/connector).

### 7. Delete a memory

```bash
kybernesis delete <memoryId>
kybernesis delete <memoryId> -y   # skip confirmation
```

### 8. Switch workspace

```bash
kybernesis switch
```

Clears your current session and re-opens the browser to authenticate with a different workspace.

### 9. Log out

```bash
kybernesis logout
```

Removes all stored credentials from your machine.

## All Commands

| Command | Description |
|---------|-------------|
| `kybernesis login` | Authenticate via browser (OAuth 2.1 + PKCE) |
| `kybernesis logout` | Clear stored credentials |
| `kybernesis status` | Show auth & workspace info |
| `kybernesis search <query>` | Search memories |
| `kybernesis save <content>` | Save a new memory (`--title`, `--tags`) |
| `kybernesis list` | List recent memories (`--limit`, `--offset`) |
| `kybernesis delete <id>` | Delete a memory (with confirmation, or `-y`) |
| `kybernesis stats` | Memory statistics |
| `kybernesis switch` | Re-authenticate to a different workspace |
| `kybernesis help` | Show help |
| `kybernesis version` | Show version |

## How Authentication Works

1. `kybernesis login` registers a dynamic OAuth client (one-time) and starts a local callback server on a random port
2. Your browser opens to `api.kybernesis.ai/authorize` where you sign in via Clerk and pick a workspace
3. After authorization, the browser redirects to `http://127.0.0.1:<port>/callback` with an auth code
4. The CLI exchanges the code for access + refresh tokens using PKCE (no client secret needed)
5. Tokens are stored at `~/.config/kybernesis/auth.json` with `chmod 600` (owner-only read/write)
6. On subsequent commands, tokens are auto-refreshed when they expire — no re-login needed unless the refresh token expires (30 days)

## Using with Claude Code

The CLI is designed to work seamlessly with Claude Code. Claude can call it via Bash to interact with your memory workspace without needing an MCP connection:

```bash
# Claude can search your memories
kybernesis search "deployment checklist"

# Claude can save context for later
kybernesis save "The API rate limit is 100 req/min per org" --tags api,limits

# Claude can check workspace stats
kybernesis stats
```

## Requirements

- Node.js 18 or later
- A [Kybernesis](https://kybernesis.ai) account

## License

MIT
