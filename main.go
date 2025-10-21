package main

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"

	"github.com/dzonerzy/go-snap/snap"
	"github.com/ktr0731/go-fuzzyfinder"
)

const (
	flowName    = "flow"
	flowVersion = "1.0.0"
)

func main() {
	app := snap.New(flowName, "flow is CLI to do things fast").
		Version(flowVersion).
		DisableHelp()

	app.Command("updateGoVersion", "Upgrade Go using the workspace script").
		Action(func(ctx *snap.Context) error {
			scriptPath, err := determineUpgradeScriptPath()
			if err != nil {
				return err
			}

			if _, err := os.Stat(scriptPath); err != nil {
				return fmt.Errorf("unable to access %s: %w", scriptPath, err)
			}

			cmd := exec.Command(scriptPath)
			cmd.Stdout = ctx.Stdout()
			cmd.Stderr = ctx.Stderr()
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("running %s: %w", scriptPath, err)
			}

			return nil
		})

	app.Command("killPort", "Kill a process by the port it listens on, optionally with fuzzy finder").
		Action(func(ctx *snap.Context) error {
			if ctx.NArgs() > 1 {
				fmt.Fprintf(ctx.Stderr(), "Usage: %s killPort [port]\n", flowName)
				return fmt.Errorf("expected at most 1 argument, got %d", ctx.NArgs())
			}

			processes, err := listListeningProcesses()
			if err != nil {
				return err
			}

			if len(processes) == 0 {
				fmt.Fprintln(ctx.Stdout(), "No listening TCP ports found.")
				return nil
			}

			targets := processes
			if ctx.NArgs() == 1 {
				rawPort := strings.TrimSpace(ctx.Arg(0))
				if rawPort == "" {
					fmt.Fprintf(ctx.Stderr(), "Usage: %s killPort [port]\n", flowName)
					return fmt.Errorf("port cannot be empty")
				}

				targets = uniqueByPID(filterProcessesByPort(processes, rawPort))
				if len(targets) == 0 {
					fmt.Fprintf(ctx.Stdout(), "No listening process found on port %s.\n", rawPort)
					return nil
				}

				if len(targets) == 1 {
					selected := targets[0]
					if err := killProcess(selected.PID); err != nil {
						return fmt.Errorf("kill pid %d: %w", selected.PID, err)
					}
					fmt.Fprintf(ctx.Stdout(), "Killed %s (pid %d) listening on %s\n", selected.Command, selected.PID, selected.Address)
					return nil
				}
			}

			idx, err := fuzzyfinder.Find(
				targets,
				func(i int) string {
					p := targets[i]
					return fmt.Sprintf("%s (%d) %s", p.Command, p.PID, p.Address)
				},
				fuzzyfinder.WithPromptString("killPort> "),
			)
			if err != nil {
				if errors.Is(err, fuzzyfinder.ErrAbort) {
					return nil
				}
				return fmt.Errorf("select port: %w", err)
			}

			selected := targets[idx]
			if err := killProcess(selected.PID); err != nil {
				return fmt.Errorf("kill pid %d: %w", selected.PID, err)
			}

			fmt.Fprintf(ctx.Stdout(), "Killed %s (pid %d) listening on %s\n", selected.Command, selected.PID, selected.Address)
			return nil
		})

	app.Command("checkoutPR", "Checkout a GitHub pull request by URL or number").
		Action(func(ctx *snap.Context) error {
			if ctx.NArgs() != 1 {
				fmt.Fprintf(ctx.Stderr(), "Usage: %s checkoutPR <github-pr-url-or-number>\n", flowName)
				return fmt.Errorf("expected 1 argument, got %d", ctx.NArgs())
			}

			input := strings.TrimSpace(ctx.Arg(0))
			if input == "" {
				fmt.Fprintf(ctx.Stderr(), "Usage: %s checkoutPR <github-pr-url-or-number>\n", flowName)
				return fmt.Errorf("pull request reference cannot be empty")
			}

			prNumber, err := extractPullRequestNumber(input)
			if err != nil {
				return err
			}

			if _, err := exec.LookPath("gh"); err != nil {
				return fmt.Errorf("gh CLI not found in PATH: %w", err)
			}

			cmd := exec.Command("gh", "pr", "checkout", strconv.Itoa(prNumber))
			cmd.Stdout = ctx.Stdout()
			cmd.Stderr = ctx.Stderr()
			cmd.Stdin = ctx.Stdin()
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("gh pr checkout %d: %w", prNumber, err)
			}

			return nil
		})

	app.Command("version", "Reports the current version of flow").
		Action(func(ctx *snap.Context) error {
			fmt.Fprintln(ctx.Stdout(), flowVersion)
			return nil
		})

	args := os.Args[1:]
	if handled := handleTopLevel(args, os.Stdout); handled {
		return
	}

	app.RunAndExit()
}

func handleTopLevel(args []string, out io.Writer) bool {
	if len(args) == 0 {
		if err := openCurrentDirectory(out); err != nil {
			fmt.Fprintf(out, "open . failed: %v\n", err)
			printRootHelp(out)
		}
		return true
	}

	switch args[0] {
	case "--help", "-h", "h":
		printRootHelp(out)
		return true
	case "--version":
		fmt.Fprintln(out, flowVersion)
		return true
	case "help":
		if len(args) == 1 {
			printRootHelp(out)
			return true
		}
		if printCommandHelp(args[1], out) {
			return true
		}
		fmt.Fprintf(out, "Unknown help topic %q\n", args[1])
		return true
	}

	if len(args) > 1 {
		last := args[len(args)-1]
		if last == "--help" || last == "-h" {
			if printCommandHelp(args[0], out) {
				return true
			}
			printRootHelp(out)
			return true
		}
	}

	return false
}

func printCommandHelp(name string, out io.Writer) bool {
	switch name {
	case "checkoutPR":
		fmt.Fprintln(out, "Checkout a GitHub pull request by URL or number")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow checkoutPR <github-pr-url-or-number>")
		return true
	case "killPort":
		fmt.Fprintln(out, "Kill a process by the port it listens on, optionally with fuzzy finder")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow killPort [port]")
		return true
	case "updateGoVersion":
		fmt.Fprintln(out, "Upgrade Go using the workspace script")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow updateGoVersion")
		return true
	case "version":
		fmt.Fprintln(out, "Reports the current version of flow")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow version")
		return true
	}

	return false
}

func printRootHelp(out io.Writer) {
	fmt.Fprintln(out, "flow is CLI to do things fast")
	fmt.Fprintln(out)
	fmt.Fprintln(out, "Usage:")
	fmt.Fprintln(out, "  flow [command]")
	fmt.Fprintln(out)
	fmt.Fprintln(out, "Available Commands:")
	fmt.Fprintln(out, "  help             Help about any command")
	fmt.Fprintln(out, "  checkoutPR       Checkout a GitHub pull request by URL or number")
	fmt.Fprintln(out, "  killPort         Kill a process by the port it listens on, optionally with fuzzy finder")
	fmt.Fprintln(out, "  updateGoVersion  Upgrade Go using the workspace script")
	fmt.Fprintln(out, "  version          Reports the current version of flow")
	fmt.Fprintln(out)
	fmt.Fprintln(out, "Flags:")
	fmt.Fprintln(out, "  -h, --help   help for flow")
	fmt.Fprintln(out)
	fmt.Fprintln(out, "Use \"flow [command] --help\" for more information about a command.")
}

func determineUpgradeScriptPath() (string, error) {
	if path := os.Getenv("FLOW_UPGRADE_SCRIPT_PATH"); path != "" {
		return path, nil
	}

	if root := os.Getenv("FLOW_CONFIG_ROOT"); root != "" {
		return filepath.Join(root, "sh", "upgrade-go-version.sh"), nil
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("determine home directory: %w", err)
	}

	return filepath.Join(home, "src", "config", "sh", "upgrade-go-version.sh"), nil
}

func openCurrentDirectory(out io.Writer) error {
	cmd := exec.Command("open", ".")
	cmd.Stdout = out
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

type listeningProcess struct {
	Command string
	User    string
	PID     int
	Address string
	Port    string
	Raw     string
}

func listListeningProcesses() ([]listeningProcess, error) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer

	cmd := exec.Command("lsof", "-nP", "-iTCP", "-sTCP:LISTEN")
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg != "" {
			return nil, fmt.Errorf("list listening ports: %s: %w", msg, err)
		}
		return nil, fmt.Errorf("list listening ports: %w", err)
	}

	scanner := bufio.NewScanner(&stdout)
	var processes []listeningProcess
	firstLine := true
	for scanner.Scan() {
		line := scanner.Text()
		if firstLine {
			firstLine = false
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 9 {
			continue
		}

		pid, err := strconv.Atoi(fields[1])
		if err != nil {
			continue
		}

		address := fields[len(fields)-2]
		port := address
		if idx := strings.LastIndex(address, ":"); idx >= 0 && idx+1 < len(address) {
			port = address[idx+1:]
		}

		processes = append(processes, listeningProcess{
			Command: fields[0],
			User:    fields[2],
			PID:     pid,
			Address: address,
			Port:    port,
			Raw:     line,
		})
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("scan lsof output: %w", err)
	}

	return processes, nil
}

func killProcess(pid int) error {
	if err := syscall.Kill(pid, syscall.SIGTERM); err != nil {
		if errors.Is(err, syscall.ESRCH) {
			return nil
		}
		return err
	}
	return nil
}

func filterProcessesByPort(processes []listeningProcess, targetPort string) []listeningProcess {
	var filtered []listeningProcess
	for _, p := range processes {
		if p.Port == targetPort {
			filtered = append(filtered, p)
		}
	}
	return filtered
}

func uniqueByPID(processes []listeningProcess) []listeningProcess {
	seen := make(map[int]struct{})
	var unique []listeningProcess
	for _, p := range processes {
		if _, ok := seen[p.PID]; ok {
			continue
		}
		seen[p.PID] = struct{}{}
		unique = append(unique, p)
	}
	return unique
}

func extractPullRequestNumber(input string) (int, error) {
	candidate := strings.TrimSpace(input)
	candidate = strings.TrimSuffix(candidate, "/")
	if candidate == "" {
		return 0, fmt.Errorf("pull request reference cannot be empty")
	}

	if number, ok := parseNumericCandidate(candidate); ok {
		return number, nil
	}

	if strings.HasPrefix(candidate, "http://") || strings.HasPrefix(candidate, "https://") {
		u, err := url.Parse(candidate)
		if err == nil && u.Host != "" {
			segments := strings.Split(strings.Trim(u.Path, "/"), "/")
			for i := 0; i < len(segments); i++ {
				segment := segments[i]
				if segment == "pull" || segment == "pulls" {
					if i+1 < len(segments) {
						if number, ok := parseNumericCandidate(segments[i+1]); ok {
							return number, nil
						}
					}
				}
			}
		}
	}

	if idx := strings.LastIndex(candidate, "#"); idx >= 0 && idx+1 < len(candidate) {
		if number, ok := parseNumericCandidate(candidate[idx+1:]); ok {
			return number, nil
		}
	}

	if idx := strings.LastIndex(candidate, "/"); idx >= 0 && idx+1 < len(candidate) {
		if number, ok := parseNumericCandidate(candidate[idx+1:]); ok {
			return number, nil
		}
	}

	return 0, fmt.Errorf("unable to determine pull request number from %q", input)
}

func parseNumericCandidate(raw string) (int, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return 0, false
	}
	if idx := strings.IndexAny(trimmed, "?#"); idx >= 0 {
		trimmed = trimmed[:idx]
	}
	trimmed = strings.TrimSpace(trimmed)
	if trimmed == "" {
		return 0, false
	}
	number, err := strconv.Atoi(trimmed)
	if err != nil || number <= 0 {
		return 0, false
	}
	return number, true
}
