import { getToken, getApiUrl } from "./config.js";
export async function apiFetch(path, options = {}) {
    const token = getToken();
    if (!token)
        throw new Error("Not authenticated. Run: agentsfy auth login");
    const url = `${getApiUrl()}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });
    if (res.status === 401)
        throw new Error("Invalid token. Run: agentsfy auth login");
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
}
export async function apiStream(path, body) {
    const token = getToken();
    if (!token)
        throw new Error("Not authenticated. Run: agentsfy auth login");
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
