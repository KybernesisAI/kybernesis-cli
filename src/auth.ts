import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const API_BASE = 'https://api.kybernesis.ai';
const CONFIG_DIR = join(homedir(), '.config', 'kybernesis');
const AUTH_FILE = join(CONFIG_DIR, 'auth.json');

export interface AuthTokens {
  clientId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  workspace: string;
  orgId: string;
  userId: string;
}

function base64url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

function generateCodeVerifier(): string {
  return base64url(randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64url(createHash('sha256').update(verifier).digest());
}

function generateState(): string {
  return base64url(randomBytes(16));
}

async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
}

export async function loadTokens(): Promise<AuthTokens | null> {
  try {
    const data = await readFile(AUTH_FILE, 'utf-8');
    return JSON.parse(data) as AuthTokens;
  } catch {
    return null;
  }
}

async function saveTokens(tokens: AuthTokens): Promise<void> {
  await ensureConfigDir();
  await writeFile(AUTH_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export async function clearTokens(): Promise<void> {
  const { unlink } = await import('node:fs/promises');
  try {
    await unlink(AUTH_FILE);
  } catch {
    // Already gone
  }
}

/**
 * Register a dynamic OAuth client (DCR) if we don't have a stored clientId.
 */
async function registerClient(): Promise<string> {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Kybernesis CLI',
      redirect_uris: ['http://127.0.0.1/callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Client registration failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { client_id: string };
  return data.client_id;
}

/**
 * Start the OAuth login flow:
 * 1. Register client if needed
 * 2. Start local callback server
 * 3. Open browser to authorize
 * 4. Wait for callback
 * 5. Exchange code for tokens
 * 6. Save tokens
 */
export async function login(): Promise<AuthTokens> {
  // Check for existing client_id
  const existing = await loadTokens();
  let clientId = existing?.clientId;

  if (!clientId) {
    process.stdout.write('Registering CLI client...\n');
    clientId = await registerClient();
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  return new Promise<AuthTokens>((resolve, reject) => {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url!, `http://${req.headers.host}`);

        if (url.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
          const desc = url.searchParams.get('error_description') || error;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h2>Authorization Failed</h2><p>${desc}</p><p>You can close this tab.</p></body></html>`);
          server.close();
          reject(new Error(`Authorization failed: ${desc}`));
          return;
        }

        if (!code || returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h2>Invalid callback</h2><p>Missing code or state mismatch.</p></body></html>');
          server.close();
          reject(new Error('Invalid callback: missing code or state mismatch'));
          return;
        }

        // Exchange code for tokens
        const port = (server.address() as { port: number }).port;
        const tokenResponse = await fetch(`${API_BASE}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId!,
            code,
            code_verifier: codeVerifier,
            redirect_uri: `http://127.0.0.1:${port}/callback`,
          }),
        });

        if (!tokenResponse.ok) {
          const text = await tokenResponse.text();
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h2>Token Exchange Failed</h2><p>${text}</p></body></html>`);
          server.close();
          reject(new Error(`Token exchange failed: ${tokenResponse.status} ${text}`));
          return;
        }

        const tokenData = (await tokenResponse.json()) as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };

        // Validate the token to get user/org info
        const validateResponse = await fetch(`${API_BASE}/v1/user/validate`, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        let userId = '';
        let orgId = '';
        let workspace = '';

        if (validateResponse.ok) {
          const userInfo = (await validateResponse.json()) as {
            userId: string;
            orgId: string;
            workspace?: string;
          };
          userId = userInfo.userId;
          orgId = userInfo.orgId;
          workspace = userInfo.workspace || 'default';
        }

        const tokens: AuthTokens = {
          clientId: clientId!,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: Date.now() + tokenData.expires_in * 1000,
          workspace,
          orgId,
          userId,
        };

        await saveTokens(tokens);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body style="font-family:system-ui;text-align:center;padding-top:80px">' +
          '<h2>Authenticated!</h2>' +
          '<p>You can close this tab and return to the terminal.</p>' +
          '</body></html>'
        );

        server.close();
        resolve(tokens);
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    // Listen on a random available port
    server.listen(0, '127.0.0.1', async () => {
      const port = (server.address() as { port: number }).port;
      const redirectUri = `http://127.0.0.1:${port}/callback`;

      const authorizeUrl = new URL(`${API_BASE}/authorize`);
      authorizeUrl.searchParams.set('client_id', clientId!);
      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
      authorizeUrl.searchParams.set('state', state);
      authorizeUrl.searchParams.set('response_type', 'code');
      authorizeUrl.searchParams.set('scope', 'read write');

      process.stdout.write(`\nOpening browser to authenticate...\n`);
      process.stdout.write(`If the browser doesn't open, visit:\n${authorizeUrl.toString()}\n\n`);
      process.stdout.write('Waiting for authorization...\n');

      try {
        const open = (await import('open')).default;
        await open(authorizeUrl.toString());
      } catch {
        // If open fails, user has the URL printed above
      }
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Login timed out after 5 minutes'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Get a valid access token, refreshing if needed.
 */
export async function getToken(): Promise<string> {
  const tokens = await loadTokens();

  if (!tokens) {
    throw new Error('Not logged in. Run `kybernesis login` first.');
  }

  // If token expires in less than 5 minutes, refresh
  if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
    try {
      const response = await fetch(`${API_BASE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: tokens.clientId,
          refresh_token: tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      tokens.accessToken = data.access_token;
      tokens.refreshToken = data.refresh_token;
      tokens.expiresAt = Date.now() + data.expires_in * 1000;

      await saveTokens(tokens);
    } catch {
      throw new Error('Session expired. Run `kybernesis login` to re-authenticate.');
    }
  }

  return tokens.accessToken;
}
