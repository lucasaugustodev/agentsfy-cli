import { getToken, getApiUrl, getConfig } from "./config.js";

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated. Run: agentsfy auth login");

  const url = `${getApiUrl()}${path}`;

  // For /api/v1/ endpoints, prefer API key if available
  const config = getConfig();
  const authToken = (path.includes("/api/v1/") && config.api_key) ? config.api_key : token;

  let res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
      ...(options.headers as Record<string, string> || {}),
    },
  });

  // If 401 and path is /api/v1/, might need different auth format
  if (res.status === 401) throw new Error("Invalid or expired token. Run: agentsfy auth login");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function apiStream(path: string, body: any): Promise<Response> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated. Run: agentsfy auth login");

  const res = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return res;
}
