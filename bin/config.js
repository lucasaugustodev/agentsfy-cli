import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
const CONFIG_DIR = join(homedir(), ".agentsfy");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
export function getConfig() {
    if (!existsSync(CONFIG_FILE)) {
        return { token: "", api_url: "https://agentsfy.cc" };
    }
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
}
export function saveConfig(config) {
    const current = getConfig();
    const merged = { ...current, ...config };
    if (!existsSync(CONFIG_DIR))
        mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}
export function getToken() {
    return process.env.AGENTSFY_TOKEN || getConfig().token;
}
export function getApiUrl() {
    return process.env.AGENTSFY_API_URL || getConfig().api_url;
}
