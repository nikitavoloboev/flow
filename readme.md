# flow

> CLI to do things fast

## Setup

Currently this assumes it will put binary in `~/bin`. So create folder and add it to `$PATH`.

Then, clone repo, install [Taskfile](https://taskfile.dev). Run:

```
task publish
```

This puts `f` command into your path to use. I use this CLI to do various things but you are free to create a similar CLI for your use cases.

If there is something you want to contribute to this CLI too, feel free to PR.

Current output of CLI is:

```
f h
flow is CLI to do things fast

Usage:
  flow [command]

Available Commands:
  help             Help about any command
  deploy           Deploy the current project using task publish
  commit           Generate a commit message with GPT-5 nano and create the commit
  commitPush       Generate a commit message, commit, and push to the default remote
  clone            Clone a GitHub repository into ~/gh/<owner>/<repo>
  gitCheckout      Check out a branch from the remote, creating a local tracking branch if needed
  updateGoVersion  Upgrade Go using the workspace script
  version          Reports the current version of flow

Flags:
  -h, --help   help for flow

Use "flow [command] --help" for more information about a command.
```

For `f commit`, export `OPENAI_API_KEY` in your shell profile (e.g. fish config) so the CLI can talk to OpenAI. This environment variable is the only requirement, so the command works in local shells and CI alike.

## Contributing

Any PR to improve is welcome. I do most of the dev with [codex](https://github.com/openai/codex) & hand writing code with [Cursor](https://cursor.com). But I would love good **working** & **useful** patches (ideally).

### 🖤

[![Discord](https://go.nikiv.dev/badge-discord)](https://go.nikiv.dev/discord) [![X](https://go.nikiv.dev/badge-x)](https://x.com/nikitavoloboev) [![nikiv.dev](https://go.nikiv.dev/badge-nikiv)](https://nikiv.dev)
