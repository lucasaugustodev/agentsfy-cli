# agentsfy-cli

CLI for [Agentsfy](https://agentsfy.ai) — AI Agents as a Service.

Run agents, workflows, manage files and memories from your terminal. Integrate with any CI/CD, cron job, or other AI agent.

## Install

```bash
npm install -g agentsfy-cli
```

## Quick Start

```bash
# 1. Login with email + password
agentsfy auth login
# Email: you@example.com
# Password: ********
# ✓ Logged in as you@example.com

# Or use API key directly (get it at agentsfy.cc/keys)
agentsfy auth login --token ak_your_key_here

# 2. List your agents
agentsfy agents list
#   hub-oracle [claude] — Consulta Oracle database...
#   code-agent [smol] — Cria sites, apps, scripts...

# 3. Run an agent and get the result
agentsfy agents run code-agent "cria uma landing page de ebook"
# ⠋ Running code-agent... (15s)
# ✓ code-agent completed
# ─────────────────────────────
# Landing page criada com sucesso! URL: https://...
# ─────────────────────────────

# 4. Run a workflow
agentsfy workflows run bitrix-report "deals do mes"
```

## Commands

### Auth
```bash
agentsfy auth login <token>    # Save API token
agentsfy auth token            # Show current token
agentsfy auth config           # Show config
```

### Agents
```bash
agentsfy agents list                              # List agents
agentsfy agents run <slug> "<input>"              # Run agent (waits for result)
agentsfy agents run <slug> "<input>" --no-wait    # Run async (returns run_id)
agentsfy agents run <slug> "<input>" --json       # Output as JSON
agentsfy agents run <slug> "<input>" -p <project> # Run in project context
agentsfy agents status <run_id>                   # Check run status
```

### Workflows
```bash
agentsfy workflows list                            # List workflows
agentsfy workflows run <slug> "<input>"            # Run workflow
agentsfy workflows run <slug> "<input>" --json     # Output as JSON
```

### Memories
```bash
agentsfy memories list                # List memories
agentsfy memories search "<query>"    # Semantic search
```

### Files
```bash
agentsfy files ls [path]              # List files in container
agentsfy files exec "<command>"       # Execute shell command
```

### Projects
```bash
agentsfy projects list                # List projects
agentsfy projects use <slug>          # Set default project
```

### Webhooks
```bash
agentsfy webhooks list                # List webhooks
agentsfy webhooks add <url>           # Register webhook
```

## Environment Variables

| Variable | Description |
|---|---|
| `AGENTSFY_TOKEN` | API token (overrides config) |
| `AGENTSFY_API_URL` | API base URL (default: https://agentsfy.cc) |

## Integration with AI Agents

```bash
# Give any AI agent access to Agentsfy
export AGENTSFY_TOKEN=ak_xxx

# Claude Code
claude "run agentsfy agents run code-agent 'build a React dashboard'"

# Cron job
*/30 * * * * agentsfy agents run bitrix-agent "check new deals" --wait >> /var/log/deals.log

# CI/CD pipeline
agentsfy workflows run deploy-pipeline --input "deploy v2.1" --wait
```

## License

MIT
