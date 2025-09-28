package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/dzonerzy/go-snap/snap"
	openai "github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/openai/openai-go/shared"
)

const (
	flowVersion        = "1.0.0"
	upgradeScriptPath  = "/Users/nikiv/src/config/sh/upgrade-go-version.sh"
	taskfilePath       = "Taskfile.yml"
	commitModelName    = "gpt-5-nano"
	maxCommitDiffRunes = 12000
	openAIAPIKeyEnv    = "OPENAI_API_KEY"
)

var cachedOpenAIKey string

func main() {
	app := snap.New("flow", "flow is CLI to do things fast").
		Version(flowVersion).
		DisableHelp()

	app.Command("updateGoVersion", "Upgrade Go using the workspace script").
		Action(func(ctx *snap.Context) error {
			if _, err := os.Stat(upgradeScriptPath); err != nil {
				return fmt.Errorf("unable to access %s: %w", upgradeScriptPath, err)
			}

			cmd := exec.Command(upgradeScriptPath)
			cmd.Stdout = ctx.Stdout()
			cmd.Stderr = ctx.Stderr()
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("running %s: %w", upgradeScriptPath, err)
			}

			return nil
		})

	app.Command("deploy", "Deploy the current project using task publish").
		Action(func(ctx *snap.Context) error {
			return runDeploy(ctx)
		})

	app.Command("commit", "Generate a commit message with GPT-5 nano and create the commit").
		Action(func(ctx *snap.Context) error {
			return runCommit(ctx)
		})

	app.Command("clone", "Clone a GitHub repository into ~/gh/<owner>/<repo>").
		Action(func(ctx *snap.Context) error {
			return runClone(ctx)
		})

	app.Command("gitCheckout", "Check out a branch from the remote, creating a local tracking branch if needed").
		Action(func(ctx *snap.Context) error {
			return runGitCheckout(ctx)
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
	case "updateGoVersion":
		fmt.Fprintln(out, "Upgrade Go using the workspace script")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow updateGoVersion")
		return true
	case "deploy":
		fmt.Fprintln(out, "Deploy the current project using task publish")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow deploy [project]")
		return true
	case "commit":
		fmt.Fprintln(out, "Generate a commit message with GPT-5 nano and create the commit")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow commit")
		return true
	case "clone":
		fmt.Fprintln(out, "Clone a GitHub repository into ~/gh/<owner>/<repo>")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow clone <github-url>")
		return true
	case "gitCheckout":
		fmt.Fprintln(out, "Check out a branch from the remote, creating a local tracking branch if needed")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow gitCheckout <branch>")
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
	fmt.Fprintln(out, "  deploy           Deploy the current project using task publish")
	fmt.Fprintln(out, "  commit           Generate a commit message with GPT-5 nano and create the commit")
	fmt.Fprintln(out, "  clone            Clone a GitHub repository into ~/gh/<owner>/<repo>")
	fmt.Fprintln(out, "  gitCheckout      Check out a branch from the remote, creating a local tracking branch if needed")
	fmt.Fprintln(out, "  updateGoVersion  Upgrade Go using the workspace script")
	fmt.Fprintln(out, "  version          Reports the current version of flow")
	fmt.Fprintln(out)
	fmt.Fprintln(out, "Flags:")
	fmt.Fprintln(out, "  -h, --help   help for flow")
	fmt.Fprintln(out)
	fmt.Fprintln(out, "Use \"flow [command] --help\" for more information about a command.")
}

func openCurrentDirectory(out io.Writer) error {
	cmd := exec.Command("open", ".")
	cmd.Stdout = out
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func runClone(ctx *snap.Context) error {
	if ctx.NArgs() != 1 {
		fmt.Fprintln(ctx.Stderr(), "Usage: flow clone <github-url>")
		return fmt.Errorf("expected 1 argument, got %d", ctx.NArgs())
	}

	input := strings.TrimSpace(ctx.Arg(0))
	if input == "" {
		fmt.Fprintln(ctx.Stderr(), "Usage: flow clone <github-url>")
		return fmt.Errorf("github url cannot be empty")
	}

	owner, repo, cloneURL, err := parseGitHubCloneInfo(input)
	if err != nil {
		return err
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("determine home directory: %w", err)
	}

	targetDir := filepath.Join(homeDir, "gh", owner, repo)
	parentDir := filepath.Dir(targetDir)
	if err := os.MkdirAll(parentDir, 0o755); err != nil {
		return fmt.Errorf("creating %s: %w", parentDir, err)
	}

	if info, err := os.Stat(targetDir); err == nil {
		if info.IsDir() {
			return fmt.Errorf("destination %s already exists", targetDir)
		}
		return fmt.Errorf("destination %s exists and is not a directory", targetDir)
	} else if !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("checking %s: %w", targetDir, err)
	}

	cmd := exec.Command("git", "clone", cloneURL, targetDir)
	output, err := cmd.CombinedOutput()
	if err != nil {
		trimmed := strings.TrimSpace(string(output))
		if trimmed != "" {
			fmt.Fprintln(ctx.Stderr(), trimmed)
		}
		return fmt.Errorf("git clone failed: %w", err)
	}

	fmt.Fprintf(ctx.Stdout(), "✔️ Cloned to %s\n", targetDir)
	return nil
}

func runDeploy(ctx *snap.Context) error {
	if ctx.NArgs() > 1 {
		fmt.Fprintln(ctx.Stderr(), "Usage: flow deploy [project]")
		return fmt.Errorf("expected at most 1 argument, got %d", ctx.NArgs())
	}

	if ctx.NArgs() == 1 && strings.TrimSpace(ctx.Arg(0)) == "" {
		fmt.Fprintln(ctx.Stderr(), "Usage: flow deploy [project]")
		return fmt.Errorf("project name cannot be empty")
	}

	if _, err := os.Stat(taskfilePath); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("%s not found", taskfilePath)
		}
		return fmt.Errorf("checking %s: %w", taskfilePath, err)
	}

	contents, err := os.ReadFile(taskfilePath)
	if err != nil {
		return fmt.Errorf("reading %s: %w", taskfilePath, err)
	}

	if !strings.Contains(string(contents), "publish") {
		return fmt.Errorf("%s does not define a publish task", taskfilePath)
	}

	cmd := exec.Command("task", "publish")
	cmd.Stdin = ctx.Stdin()
	output, err := cmd.CombinedOutput()
	if err != nil {
		trimmed := strings.TrimSpace(string(output))
		if trimmed != "" {
			fmt.Fprintln(ctx.Stderr(), trimmed)
		}
		return fmt.Errorf("task publish failed: %w", err)
	}

	fmt.Fprintln(ctx.Stdout(), "✔️ in your PATH, ready to use as `f` command")
	return nil
}

func runCommit(ctx *snap.Context) error {
	if ctx.NArgs() != 0 {
		fmt.Fprintln(ctx.Stderr(), "Usage: flow commit")
		return fmt.Errorf("commit does not accept positional arguments")
	}

	if err := ensureGitRepository(); err != nil {
		return err
	}

	apiKey, err := resolveOpenAIKey(ctx.Context())
	if err != nil {
		return reportError(ctx, err)
	}

	if err := runGitCommandStreaming(ctx, "add", "."); err != nil {
		return reportError(ctx, fmt.Errorf("git add .: %w", err))
	}

	diffOutput, err := exec.Command("git", "diff", "--cached").CombinedOutput()
	if err != nil {
		return reportError(ctx, fmt.Errorf("git diff --cached: %w", err))
	}

	diff := string(diffOutput)
	if strings.TrimSpace(diff) == "" {
		return reportError(ctx, fmt.Errorf("no staged changes to commit; stage files with git add"))
	}

	trimmedDiff, truncated := truncateDiffForCommit(diff)

	statusOutput, statusErr := exec.Command("git", "status", "--short").CombinedOutput()
	status := ""
	if statusErr == nil {
		status = string(statusOutput)
	}

	message, err := generateCommitMessage(ctx.Context(), apiKey, trimmedDiff, status, truncated)
	if err != nil {
		return reportError(ctx, err)
	}

	message = strings.TrimSpace(trimMatchingQuotes(message))
	if message == "" {
		return reportError(ctx, fmt.Errorf("commit message is empty"))
	}
	paragraphs := splitCommitMessageParagraphs(message)
	if len(paragraphs) == 0 {
		return reportError(ctx, fmt.Errorf("commit message is empty after formatting"))
	}

	fmt.Fprintf(ctx.Stdout(), "Proposed commit message:\n%s\n\n", message)

	args := []string{"commit"}
	for _, paragraph := range paragraphs {
		args = append(args, "-m", paragraph)
	}

	cmd := exec.Command("git", args...)
	cmd.Stdout = ctx.Stdout()
	cmd.Stderr = ctx.Stderr()
	cmd.Stdin = ctx.Stdin()
	if err := cmd.Run(); err != nil {
		return reportError(ctx, fmt.Errorf("git commit: %w", err))
	}

	fmt.Fprintf(ctx.Stdout(), "✔️ Committed with message: %s\n", paragraphs[0])
	return nil
}

// resolveOpenAIKey attempts to find an OpenAI key quickly without extra config.
// resolveOpenAIKey reads the key from OPENAI_API_KEY and caches it for reuse.
func resolveOpenAIKey(context.Context) (string, error) {
	if key := strings.TrimSpace(os.Getenv(openAIAPIKeyEnv)); key != "" {
		cachedOpenAIKey = key
		return key, nil
	}

	if cachedOpenAIKey != "" {
		return cachedOpenAIKey, nil
	}

	return "", fmt.Errorf("%s is not set; export it before running flow commit", openAIAPIKeyEnv)
}

func reportError(ctx *snap.Context, err error) error {
	if err == nil {
		return nil
	}
	fmt.Fprintln(ctx.Stderr(), err.Error())
	return err
}

func generateCommitMessage(parent context.Context, apiKey string, diff string, status string, truncated bool) (string, error) {
	client := openai.NewClient(option.WithAPIKey(apiKey))

	requestCtx, cancel := context.WithTimeout(parent, 45*time.Second)
	defer cancel()

	systemPrompt := "You are an expert software engineer who writes clear, concise git commit messages. Use imperative mood, keep the subject line under 72 characters, and include an optional body with bullet points if helpful. Never wrap the message in quotes."

	var userPromptBuilder strings.Builder
	userPromptBuilder.WriteString("Write a git commit message for the staged changes.\n\nGit diff:\n")
	userPromptBuilder.WriteString(diff)
	if truncated {
		userPromptBuilder.WriteString("\n\n[Diff truncated to fit within prompt]")
	}

	if s := strings.TrimSpace(status); s != "" {
		userPromptBuilder.WriteString("\n\nGit status --short:\n")
		userPromptBuilder.WriteString(s)
	}

	resp, err := client.Chat.Completions.New(requestCtx, openai.ChatCompletionNewParams{
		Model: shared.ChatModel(commitModelName),
		Messages: []openai.ChatCompletionMessageParamUnion{
			{
				OfSystem: &openai.ChatCompletionSystemMessageParam{
					Content: openai.ChatCompletionSystemMessageParamContentUnion{OfString: openai.String(systemPrompt)},
				},
			},
			{
				OfUser: &openai.ChatCompletionUserMessageParam{
					Content: openai.ChatCompletionUserMessageParamContentUnion{OfString: openai.String(userPromptBuilder.String())},
				},
			},
		},
	})
	if err != nil {
		return "", fmt.Errorf("generate commit message: %w", err)
	}

	if resp == nil || len(resp.Choices) == 0 {
		return "", fmt.Errorf("model returned no commit message choices")
	}

	message := strings.TrimSpace(resp.Choices[0].Message.Content)
	if message == "" {
		return "", fmt.Errorf("model returned an empty commit message")
	}

	return message, nil
}

func truncateDiffForCommit(diff string) (string, bool) {
	runes := []rune(diff)
	if len(runes) <= maxCommitDiffRunes {
		return diff, false
	}

	trimmed := string(runes[:maxCommitDiffRunes])
	return trimmed + fmt.Sprintf("\n\n[Diff truncated to the first %d characters]", maxCommitDiffRunes), true
}

func splitCommitMessageParagraphs(message string) []string {
	lines := strings.Split(message, "\n")
	var paragraphs []string
	var current []string

	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			if len(current) > 0 {
				paragraphs = append(paragraphs, strings.Join(current, "\n"))
				current = nil
			}
			continue
		}

		current = append(current, strings.TrimRight(line, " \t"))
	}

	if len(current) > 0 {
		paragraphs = append(paragraphs, strings.Join(current, "\n"))
	}

	return paragraphs
}

func trimMatchingQuotes(message string) string {
	if len(message) >= 2 {
		first := message[0]
		last := message[len(message)-1]
		if (first == '"' && last == '"') || (first == '\'' && last == '\'') {
			return message[1 : len(message)-1]
		}
	}
	return message
}

func parseGitHubCloneInfo(input string) (string, string, string, error) {
	switch {
	case strings.HasPrefix(input, "git@"):
		if !strings.HasPrefix(input, "git@github.com:") {
			return "", "", "", fmt.Errorf("unsupported git host in %q", input)
		}
		path := strings.TrimPrefix(input, "git@github.com:")
		owner, repo, err := splitOwnerRepo(path)
		if err != nil {
			return "", "", "", err
		}
		return owner, repo, input, nil
	case strings.HasPrefix(input, "http://") || strings.HasPrefix(input, "https://"):
		u, err := url.Parse(input)
		if err != nil {
			return "", "", "", fmt.Errorf("parse url %q: %w", input, err)
		}
		if !strings.EqualFold(u.Host, "github.com") {
			return "", "", "", fmt.Errorf("expected github.com host, got %s", u.Host)
		}
		owner, repo, err := splitOwnerRepo(u.Path)
		if err != nil {
			return "", "", "", err
		}
		cloneURL := fmt.Sprintf("https://github.com/%s/%s", owner, repo)
		return owner, repo, cloneURL, nil
	default:
		owner, repo, err := splitOwnerRepo(input)
		if err != nil {
			return "", "", "", err
		}
		cloneURL := fmt.Sprintf("https://github.com/%s/%s", owner, repo)
		return owner, repo, cloneURL, nil
	}
}

func splitOwnerRepo(path string) (string, string, error) {
	trimmed := strings.Trim(path, "/")
	if trimmed == "" {
		return "", "", fmt.Errorf("invalid GitHub repository path: %q", path)
	}
	parts := strings.Split(trimmed, "/")
	if len(parts) < 2 {
		return "", "", fmt.Errorf("invalid GitHub repository path: %q", path)
	}
	if len(parts) > 2 {
		return "", "", fmt.Errorf("unexpected extra path components in %q", path)
	}
	owner := parts[0]
	repo := strings.TrimSuffix(parts[1], ".git")
	if owner == "" || repo == "" {
		return "", "", fmt.Errorf("invalid GitHub repository path: %q", path)
	}
	return owner, repo, nil
}

func runGitCheckout(ctx *snap.Context) error {
	if ctx.NArgs() != 1 {
		fmt.Fprintln(ctx.Stderr(), "Usage: flow gitCheckout <branch>")
		return fmt.Errorf("expected 1 argument, got %d", ctx.NArgs())
	}

	branchInput := strings.TrimSpace(ctx.Arg(0))
	if branchInput == "" {
		fmt.Fprintln(ctx.Stderr(), "Usage: flow gitCheckout <branch>")
		return fmt.Errorf("branch name cannot be empty")
	}

	if err := ensureGitRepository(); err != nil {
		return err
	}

	remotes, err := listGitRemotes()
	if err != nil {
		return err
	}

	branchName := branchInput
	preferredRemote := ""
	if idx := strings.Index(branchInput, "/"); idx > 0 {
		candidateRemote := branchInput[:idx]
		remaining := branchInput[idx+1:]
		if remaining != "" {
			for _, r := range remotes {
				if r == candidateRemote {
					preferredRemote = candidateRemote
					branchName = remaining
					break
				}
			}
		}
	}

	if branchName == "" {
		fmt.Fprintln(ctx.Stderr(), "Usage: flow gitCheckout <branch>")
		return fmt.Errorf("branch name cannot be empty")
	}

	remote, err := selectGitRemote(remotes, preferredRemote)
	if err != nil {
		return err
	}

	if err := runGitCommandStreaming(ctx, "fetch", remote, branchName); err != nil {
		return fmt.Errorf("git fetch %s %s: %w", remote, branchName, err)
	}

	exists, err := gitRefExists(branchName)
	if err != nil {
		return fmt.Errorf("check local branch %s: %w", branchName, err)
	}
	if exists {
		return runGitCommandStreaming(ctx, "checkout", branchName)
	}

	remoteRef := fmt.Sprintf("%s/%s", remote, branchName)
	remoteExists, err := gitRefExists(remoteRef)
	if err != nil {
		return fmt.Errorf("check remote branch %s: %w", remoteRef, err)
	}
	if !remoteExists {
		return fmt.Errorf("remote branch %s not found", remoteRef)
	}

	return runGitCommandStreaming(ctx, "checkout", "-b", branchName, remoteRef)
}

func ensureGitRepository() error {
	cmd := exec.Command("git", "rev-parse", "--is-inside-work-tree")
	out, err := cmd.CombinedOutput()
	if err != nil {
		trimmed := strings.TrimSpace(string(out))
		if trimmed != "" {
			return fmt.Errorf("%s", trimmed)
		}
		return fmt.Errorf("git rev-parse --is-inside-work-tree: %w", err)
	}

	if strings.TrimSpace(string(out)) != "true" {
		return fmt.Errorf("not inside a git repository")
	}

	return nil
}

func listGitRemotes() ([]string, error) {
	out, err := exec.Command("git", "remote").Output()
	if err != nil {
		return nil, fmt.Errorf("git remote: %w", err)
	}

	trimmed := strings.TrimSpace(string(out))
	if trimmed == "" {
		return nil, fmt.Errorf("no git remotes configured")
	}

	lines := strings.Split(trimmed, "\n")
	remotes := make([]string, 0, len(lines))
	for _, line := range lines {
		name := strings.TrimSpace(line)
		if name != "" {
			remotes = append(remotes, name)
		}
	}

	if len(remotes) == 0 {
		return nil, fmt.Errorf("no git remotes configured")
	}

	return remotes, nil
}

func selectGitRemote(remotes []string, preferred string) (string, error) {
	if len(remotes) == 0 {
		return "", fmt.Errorf("no git remotes configured")
	}

	if preferred != "" {
		for _, r := range remotes {
			if r == preferred {
				return preferred, nil
			}
		}
		return "", fmt.Errorf("git remote %q not found", preferred)
	}

	for _, r := range remotes {
		if r == "origin" {
			return r, nil
		}
	}

	return remotes[0], nil
}

func gitRefExists(ref string) (bool, error) {
	cmd := exec.Command("git", "rev-parse", "--verify", "--quiet", ref)
	if err := cmd.Run(); err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func runGitCommandStreaming(ctx *snap.Context, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Stdout = ctx.Stdout()
	cmd.Stderr = ctx.Stderr()
	cmd.Stdin = ctx.Stdin()
	return cmd.Run()
}
