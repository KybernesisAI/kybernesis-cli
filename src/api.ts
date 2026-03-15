import { getToken, loadTokens } from './auth.js';

const API_BASE = 'https://api.kybernesis.ai';

export interface MemoryResult {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  source: string;
  layer: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryStats {
  total: number;
  byTier: { hot: number; warm: number; archive: number };
  bySource: { upload: number; chat: number; connector: number };
  recentlyAccessed: number;
}

export interface UserInfo {
  valid: boolean;
  userId: string;
  orgId: string;
  keyPrefix: string;
  scopes: string[];
}

async function rpc<T>(tool: string, input: Record<string, unknown>): Promise<T> {
  const token = await getToken();
  const tokens = await loadTokens();

  // Auto-fill orgId from stored tokens if not provided
  if (tokens?.orgId && !('orgId' in input)) {
    input.orgId = tokens.orgId;
  }

  const response = await fetch(`${API_BASE}/rpc/${tool}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function search(
  query: string,
  limit = 10
): Promise<MemoryResult[]> {
  const result = await rpc<{ results: MemoryResult[] }>('searchMemory', {
    query,
    limit,
  });
  return result.results;
}

export async function save(
  content: string,
  opts?: { title?: string; tags?: string[]; source?: string }
): Promise<MemoryResult> {
  const result = await rpc<{ memory: MemoryResult }>('addMemory', {
    content,
    title: opts?.title,
    tags: opts?.tags,
    source: opts?.source ?? 'chat',
  });
  return result.memory;
}

export async function list(
  limit = 20,
  offset = 0
): Promise<MemoryResult[]> {
  const result = await rpc<{ results: MemoryResult[] }>('listMemories', {
    limit,
    offset,
  });
  return result.results;
}

export async function deleteMemory(
  memoryId: string
): Promise<{ deleted: boolean }> {
  return rpc<{ deleted: boolean }>('deleteMemory', { memoryId });
}

export async function stats(): Promise<MemoryStats> {
  const result = await rpc<{ stats: MemoryStats }>('stats', {});
  return result.stats;
}

export async function validate(): Promise<UserInfo> {
  const token = await getToken();

  const response = await fetch(`${API_BASE}/v1/user/validate`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error (${response.status}): ${text}`);
  }

  return response.json() as Promise<UserInfo>;
}
