#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { getConfig, saveConfig, getToken } from "./config.js";
import { apiFetch, apiStream } from "./api.js";

const program = new Command();

program
  .name("agentsfy")
  .description("CLI for Agentsfy — AI Agents as a Service")
  .version("1.0.0");

// ── Auth ──
const auth = program.command("auth");

auth.command("login")
  .description("Authenticate with API token")
  .argument("<token>", "API token (ak_...)")
  .action((token: string) => {
    saveConfig({ token });
    console.log(chalk.green("✓") + " Token saved to ~/.agentsfy/config.json");
  });

auth.command("token")
  .description("Show current token")
  .action(() => {
    const token = getToken();
    if (token) {
      console.log(chalk.dim("Token:"), token.slice(0, 10) + "..." + token.slice(-4));
    } else {
      console.log(chalk.yellow("No token set.") + " Run: agentsfy auth login <token>");
    }
  });

auth.command("config")
  .description("Show config")
  .action(() => {
    const config = getConfig();
    console.log(chalk.dim("API:"), config.api_url);
    console.log(chalk.dim("Token:"), config.token ? "set" : "not set");
    if (config.default_project) console.log(chalk.dim("Project:"), config.default_project);
  });

// ── Agents ──
const agents = program.command("agents");

agents.command("list")
  .description("List your agents")
  .action(async () => {
    try {
      const { agents } = await apiFetch("/api/v1/agents");
      if (!agents.length) { console.log(chalk.dim("No agents found.")); return; }
      console.log(chalk.bold(`\n  Agents (${agents.length})\n`));
      for (const a of agents) {
        const runtime = a.runtime_tier === "smolagents" ? chalk.cyan("[smol]") : chalk.magenta("[claude]");
        console.log(`  ${chalk.bold(a.slug)} ${runtime} — ${chalk.dim(a.description || a.name)}`);
      }
      console.log();
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

agents.command("run")
  .description("Run an agent")
  .argument("<slug>", "Agent slug")
  .argument("<input>", "Message / prompt")
  .option("-p, --project <id>", "Project ID")
  .option("-w, --wait", "Wait for result (sync mode)", true)
  .option("--json", "Output as JSON")
  .action(async (slug: string, input: string, opts: any) => {
    try {
      const ora = (await import("ora")).default;
      const spinner = ora(`Running ${chalk.bold(slug)}...`).start();

      const { run_id, poll_url } = await apiFetch("/api/v1/agents/run", {
        method: "POST",
        body: JSON.stringify({ agent: slug, input, project_id: opts.project }),
      });

      if (!opts.wait) {
        spinner.succeed(`Run started: ${run_id}`);
        console.log(chalk.dim(`  Poll: agentsfy agents status ${run_id}`));
        return;
      }

      // Poll for result
      let result: any = null;
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 3000));
        result = await apiFetch(poll_url);
        if (result.status === "succeeded" || result.status === "failed") break;
        spinner.text = `Running ${chalk.bold(slug)}... (${i * 3}s)`;
      }

      if (result?.status === "succeeded") {
        spinner.succeed(`${chalk.bold(slug)} completed`);
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.dim("\n─────────────────────────────────────────\n"));
          console.log(result.result || "(no output)");
          console.log(chalk.dim("\n─────────────────────────────────────────"));
          if (result.duration_ms) console.log(chalk.dim(`  Duration: ${(result.duration_ms / 1000).toFixed(1)}s`));
        }
      } else if (result?.status === "failed") {
        spinner.fail(`${slug} failed`);
        console.log(chalk.red(result.result || "Unknown error"));
      } else {
        spinner.warn("Still running... check later:");
        console.log(chalk.dim(`  agentsfy agents status ${run_id}`));
      }
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

agents.command("status")
  .description("Check run status")
  .argument("<id>", "Run ID")
  .action(async (id: string) => {
    try {
      const result = await apiFetch(`/api/v1/agents/run/${id}`);
      const statusColor = result.status === "succeeded" ? chalk.green : result.status === "failed" ? chalk.red : chalk.yellow;
      console.log(chalk.bold("\n  Run Status\n"));
      console.log(`  Status:   ${statusColor(result.status)}`);
      console.log(`  Input:    ${chalk.dim(result.input || "")}`);
      if (result.result) console.log(`  Result:   ${result.result.slice(0, 200)}${result.result.length > 200 ? "..." : ""}`);
      if (result.duration_ms) console.log(`  Duration: ${chalk.dim((result.duration_ms / 1000).toFixed(1) + "s")}`);
      console.log();
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

// ── Workflows ──
const workflows = program.command("workflows");

workflows.command("list")
  .description("List workflows")
  .action(async () => {
    try {
      const { workflows } = await apiFetch("/api/v1/workflows");
      if (!workflows.length) { console.log(chalk.dim("No workflows.")); return; }
      console.log(chalk.bold(`\n  Workflows (${workflows.length})\n`));
      for (const w of workflows) {
        console.log(`  ${chalk.bold(w.slug)} — ${chalk.dim(w.description || w.name)} (${w.steps?.length || 0} steps)`);
      }
      console.log();
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

workflows.command("run")
  .description("Run a workflow")
  .argument("<slug>", "Workflow slug")
  .argument("<input>", "Input text")
  .option("-w, --wait", "Wait for result", true)
  .option("--json", "Output as JSON")
  .action(async (slug: string, input: string, opts: any) => {
    try {
      const ora = (await import("ora")).default;
      const spinner = ora(`Running workflow ${chalk.bold(slug)}...`).start();

      const { run_id, poll_url, total_steps } = await apiFetch("/api/v1/workflows/run", {
        method: "POST",
        body: JSON.stringify({ workflow: slug, input }),
      });

      if (!opts.wait) {
        spinner.succeed(`Workflow started: ${run_id} (${total_steps} steps)`);
        return;
      }

      let result: any = null;
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 5000));
        result = await apiFetch(poll_url);
        spinner.text = `Running ${chalk.bold(slug)}... step ${result.current_step}/${result.total_steps} (${i * 5}s)`;
        if (result.status === "completed" || result.status === "failed") break;
      }

      if (result?.status === "completed") {
        spinner.succeed(`Workflow ${chalk.bold(slug)} completed`);
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          for (const [key, step] of Object.entries(result.steps || {})) {
            const s = step as any;
            console.log(chalk.dim(`\n── ${key} (${s.agent}) ──\n`));
            console.log(s.result || "(no output)");
          }
        }
      } else {
        spinner.fail(`Workflow ${result?.status || "timeout"}`);
      }
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

// ── Memories ──
const memories = program.command("memories");

memories.command("list")
  .description("List memories")
  .action(async () => {
    try {
      const { memories } = await apiFetch("/api/v1/agents"); // reuse agents endpoint format
      // Actually use the memories endpoint
      const data = await apiFetch("/api/memories");
      const mems = data.memories || [];
      if (!mems.length) { console.log(chalk.dim("No memories.")); return; }
      console.log(chalk.bold(`\n  Memories (${mems.length})\n`));
      for (const m of mems) {
        console.log(`  ${chalk.cyan(`[${m.scope || "global"}]`)} ${m.content?.slice(0, 80)}${m.content?.length > 80 ? "..." : ""}`);
      }
      console.log();
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

memories.command("search")
  .description("Search memories")
  .argument("<query>", "Search query")
  .action(async (query: string) => {
    try {
      const { results } = await apiFetch("/api/memories/search", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      if (!results?.length) { console.log(chalk.dim("No results.")); return; }
      console.log(chalk.bold(`\n  Results (${results.length})\n`));
      for (const r of results) {
        console.log(`  ${chalk.green(`${Math.round((r.similarity || 0) * 100)}%`)} ${r.content?.slice(0, 100)}`);
      }
      console.log();
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

// ── Files ──
const files = program.command("files");

files.command("ls")
  .description("List files in container")
  .argument("[path]", "Directory path", "/home/user")
  .action(async (path: string) => {
    try {
      const { files } = await apiFetch(`/api/files?path=${encodeURIComponent(path)}`);
      const filtered = (files || []).filter((f: any) => f.name !== "." && f.name !== "..");
      if (!filtered.length) { console.log(chalk.dim("Empty directory.")); return; }
      for (const f of filtered) {
        const icon = f.isDir ? chalk.blue("📁") : "📄";
        const size = f.isDir ? "" : chalk.dim(`${f.size}B`);
        console.log(`  ${icon} ${f.name} ${size}`);
      }
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

files.command("exec")
  .description("Execute command in container")
  .argument("<command>", "Shell command")
  .action(async (command: string) => {
    try {
      const result = await apiFetch("/api/files/exec", {
        method: "POST",
        body: JSON.stringify({ command }),
      });
      console.log(result.output || "(no output)");
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

// ── Projects ──
const projects = program.command("projects");

projects.command("list")
  .description("List projects")
  .action(async () => {
    try {
      const { projects } = await apiFetch("/api/projects");
      if (!projects.length) { console.log(chalk.dim("No projects.")); return; }
      console.log(chalk.bold(`\n  Projects (${projects.length})\n`));
      for (const p of projects) {
        console.log(`  ${p.icon} ${chalk.bold(p.name)} ${chalk.dim(`(${p.role})`)} — ${chalk.dim(p.slug)}`);
      }
      console.log();
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

projects.command("use")
  .description("Set default project")
  .argument("<slug>", "Project slug")
  .action((slug: string) => {
    saveConfig({ default_project: slug });
    console.log(chalk.green("✓") + ` Default project set to ${chalk.bold(slug)}`);
  });

// ── Webhooks ──
const webhooks = program.command("webhooks");

webhooks.command("list")
  .description("List webhooks")
  .action(async () => {
    try {
      const { webhooks } = await apiFetch("/api/v1/webhooks");
      if (!webhooks.length) { console.log(chalk.dim("No webhooks.")); return; }
      for (const w of webhooks) {
        console.log(`  ${chalk.green("●")} ${w.url} ${chalk.dim(`(${w.events?.join(", ")})`)} `);
      }
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

webhooks.command("add")
  .description("Register a webhook")
  .argument("<url>", "Webhook URL")
  .action(async (url: string) => {
    try {
      const result = await apiFetch("/api/v1/webhooks", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      console.log(chalk.green("✓") + ` Webhook registered`);
      console.log(chalk.dim("  Secret:"), result.secret);
      console.log(chalk.yellow("  Save this secret — it's used to verify signatures"));
    } catch (e: any) { console.error(chalk.red("Error:"), e.message); }
  });

program.parse();
