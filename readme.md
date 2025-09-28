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
  updateGoVersion  Upgrade Go using the workspace script
  version          Reports the current version of flow

Flags:
  -h, --help   help for flow

Use "flow [command] --help" for more information about a command.
```

To give you a feel for it. I do most of the dev for it with [codex](https://github.com/openai/codex).

### 🖤

[![Discord](https://go.nikiv.dev/badge-discord)](https://go.nikiv.dev/discord) [![X](https://go.nikiv.dev/badge-x)](https://x.com/nikitavoloboev) [![nikiv.dev](https://go.nikiv.dev/badge-nikiv)](https://nikiv.dev)
