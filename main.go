package main

import (
	"bufio"
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

	app.Command("commitPush", "Commit using GPT-5 nano and push the result to the tracked remote").
		Action(func(ctx *snap.Context) error {
			return runCommitPush(ctx)
		})

	app.Command("commitReviewAndPush", "Generate a commit message, review it interactively, commit, and push").
		Action(func(ctx *snap.Context) error {
			return runCommitReviewAndPush(ctx)
		})

	app.Command("clone", "Clone a GitHub repository into ~/gh/<owner>/<repo>").
		Action(func(ctx *snap.Context) error {
			return runClone(ctx)
		})

	app.Command("gitCheckout", "Check out a branch from the remote, creating a local tracking branch if needed").
		Action(func(ctx *snap.Context) error {
			return runGitCheckout(ctx)
		})

	app.Command("youtubeToSound", "Download audio from a YouTube URL into ~/.flow/youtube-sound using yt-dlp").
		Action(func(ctx *snap.Context) error {
			return runYoutubeToSound(ctx)
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
	case "commitPush":
		fmt.Fprintln(out, "Generate a commit message, commit, and push to the default remote")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow commitPush")
		return true
	case "commitReviewAndPush":
		fmt.Fprintln(out, "Generate a commit message, review it interactively, commit, and push")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow commitReviewAndPush")
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
	case "youtubeToSound":
		fmt.Fprintln(out, "Download audio from a YouTube URL into ~/.flow/youtube-sound using yt-dlp")
		fmt.Fprintln(out)
		fmt.Fprintln(out, "Usage:")
		fmt.Fprintln(out, "  flow youtubeToSound <youtube-url>")
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
	fmt.Fprintln(out, "  commitPush       Generate a commit message, commit, and push to the default remote")
	fmt.Fprintln(out, "  commitReviewAndPush Generate a commit message, review it interactively, commit, and push")
	fmt.Fprintln(out, "  clone            Clone a GitHub repository into ~/gh/<owner>/<repo>")
	fmt.Fprintln(out, "  gitCheckout      Check out a branch from the remote, creating a local tracking branch if needed")
	fmt.Fprintln(out, "  updateGoVersion  Upgrade Go using the workspace script")
	fmt.Fprintln(out, "  youtubeToSound   Download audio from a YouTube URL into ~/.flow/youtube-sound using yt-dlp")
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

func runYoutubeToSound(ctx *snap.Context) error {
	if ctx.NArgs() != 1 {
		fmt.Fprintln(ctx.Stderr(), "Usage: flow youtubeToSound <youtube-url>")
		return reportError(ctx, fmt.Errorf("expected 1 argument, got %d", ctx.NArgs()))
	}

	videoURL := strings.TrimSpace(ctx.Arg(0))
	if videoURL == "" {
		fmt.Fprintln(ctx.Stderr(), "Usage: flow youtubeToSound <youtube-url>")
		return reportError(ctx, fmt.Errorf("youtube url cannot be empty"))
	}

	if _, err := url.ParseRequestURI(videoURL); err != nil {
		return reportError(ctx, fmt.Errorf("validate url %q: %w", videoURL, err))
	}

	downloader := "yt-dlp"
	if _, err := exec.LookPath(downloader); err != nil {
		return reportError(ctx, fmt.Errorf("%s not found in PATH: %w", downloader, err))
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return reportError(ctx, fmt.Errorf("determine home directory: %w", err))
	}

	targetDir := filepath.Join(homeDir, ".flow", "youtube-sound")
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return reportError(ctx, fmt.Errorf("create directory %s: %w", targetDir, err))
	}

	outputTemplate := filepath.Join(targetDir, "%(title)s.%(ext)s")
	cmd := exec.Command(downloader, "--extract-audio", "--audio-format", "mp3", "--audio-quality", "0", "--no-playlist", "-o", outputTemplate, videoURL)
	cmd.Stdout = ctx.Stdout()
	cmd.Stderr = ctx.Stderr()
	cmd.Stdin = ctx.Stdin()
	if err := cmd.Run(); err != nil {
		return reportError(ctx, fmt.Errorf("%s failed: %w", downloader, err))
	}

	fmt.Fprintf(ctx.Stdout(), "✔️ Audio saved to %s\n", targetDir)
	return nil
}

type commitPayload struct {
	message    string
	paragraphs []string
}

func runCommit(ctx *snap.Context) error {
	if ctx.NArgs() != 0 {
		return reportError(ctx, fmt.Errorf("Usage: flow commit"))
	}

	payload, err := prepareCommit(ctx)
	if err != nil {
		return err
	}

	printProposedMessage(ctx, payload.message)
	if err := commitWithPayload(ctx, payload); err != nil {
		return err
	}

	printCommitSuccess(ctx, payload)
	return nil
}

func runCommitPush(ctx *snap.Context) error {
	if ctx.NArgs() != 0 {
		return reportError(ctx, fmt.Errorf("Usage: flow commitPush"))
	}

	payload, err := prepareCommit(ctx)
	if err != nil {
		return err
	}

	printProposedMessage(ctx, payload.message)
	if err := commitWithPayload(ctx, payload); err != nil {
		return err
	}
	printCommitSuccess(ctx, payload)

	if err := runGitCommandStreaming(ctx, "push"); err != nil {
		return reportError(ctx, fmt.Errorf("git push: %w", err))
	}

	fmt.Fprintln(ctx.Stdout(), "✔️ Pushed")
	return nil
}

func runCommitReviewAndPush(ctx *snap.Context) error {
	if ctx.NArgs() != 0 {
		return reportError(ctx, fmt.Errorf("Usage: flow commitReviewAndPush"))
	}

	payload, err := prepareCommit(ctx)
	if err != nil {
		return err
	}

	updatedMessage, confirmed, err := promptCommitConfirmation(ctx, payload.message)
	if err != nil {
		return reportError(ctx, err)
	}

	if !confirmed {
		fmt.Fprintln(ctx.Stdout(), "Commit cancelled.")
		return nil
	}

	if updatedMessage != payload.message {
		trimmed := strings.TrimSpace(updatedMessage)
		if trimmed == "" {
			return reportError(ctx, fmt.Errorf("commit message is empty after editing"))
		}
		paragraphs := splitCommitMessageParagraphs(trimmed)
		if len(paragraphs) == 0 {
			return reportError(ctx, fmt.Errorf("commit message is empty after formatting"))
		}
		payload.message = trimmed
		payload.paragraphs = paragraphs
	}

	printProposedMessage(ctx, payload.message)
	if err := commitWithPayload(ctx, payload); err != nil {
		return err
	}
	printCommitSuccess(ctx, payload)

	if err := runGitCommandStreaming(ctx, "push"); err != nil {
		return reportError(ctx, fmt.Errorf("git push: %w", err))
	}

	fmt.Fprintln(ctx.Stdout(), "✔️ Pushed")
	return nil
}

func prepareCommit(ctx *snap.Context) (*commitPayload, error) {
	if err := ensureGitRepository(); err != nil {
		return nil, err
	}

	apiKey, err := resolveOpenAIKey(ctx.Context())
	if err != nil {
		return nil, reportError(ctx, err)
	}

	if err := runGitCommandStreaming(ctx, "add", "."); err != nil {
		return nil, reportError(ctx, fmt.Errorf("git add .: %w", err))
	}

	diffOutput, err := exec.Command("git", "diff", "--cached").CombinedOutput()
	if err != nil {
		return nil, reportError(ctx, fmt.Errorf("git diff --cached: %w", err))
	}

	diff := string(diffOutput)
	if strings.TrimSpace(diff) == "" {
		return nil, reportError(ctx, fmt.Errorf("no staged changes to commit; stage files with git add"))
	}

	trimmedDiff, truncated := truncateDiffForCommit(diff)

	statusOutput, statusErr := exec.Command("git", "status", "--short").CombinedOutput()
	status := ""
	if statusErr == nil {
		status = string(statusOutput)
	}

	message, err := generateCommitMessage(ctx.Context(), apiKey, trimmedDiff, status, truncated)
	if err != nil {
		return nil, reportError(ctx, err)
	}

	message = strings.TrimSpace(trimMatchingQuotes(message))
	if message == "" {
		return nil, reportError(ctx, fmt.Errorf("commit message is empty"))
	}
	paragraphs := splitCommitMessageParagraphs(message)
	if len(paragraphs) == 0 {
		return nil, reportError(ctx, fmt.Errorf("commit message is empty after formatting"))
	}

	return &commitPayload{message: message, paragraphs: paragraphs}, nil
}

func commitWithPayload(ctx *snap.Context, payload *commitPayload) error {
	args := []string{"commit"}
	for _, paragraph := range payload.paragraphs {
		args = append(args, "-m", paragraph)
	}

	cmd := exec.Command("git", args...)
	cmd.Stdout = ctx.Stdout()
	cmd.Stderr = ctx.Stderr()
	cmd.Stdin = ctx.Stdin()
	if err := cmd.Run(); err != nil {
		return reportError(ctx, fmt.Errorf("git commit: %w", err))
	}

	return nil
}

func printProposedMessage(ctx *snap.Context, message string) {
	fmt.Fprintf(ctx.Stdout(), "Proposed commit message:\n%s\n\n", message)
}

func printCommitSuccess(ctx *snap.Context, payload *commitPayload) {
	if len(payload.paragraphs) == 0 {
		return
	}
	fmt.Fprintf(ctx.Stdout(), "✔️ Committed with message: %s\n", payload.paragraphs[0])
}

func promptCommitConfirmation(ctx *snap.Context, message string) (string, bool, error) {
	current := message

	for {
		fmt.Fprintln(ctx.Stdout(), strings.Repeat("─", 60))
		fmt.Fprintln(ctx.Stdout(), "Review commit message:")
		fmt.Fprintln(ctx.Stdout(), strings.Repeat("─", 60))
		fmt.Fprintln(ctx.Stdout(), current)
		fmt.Fprintln(ctx.Stdout(), strings.Repeat("─", 60))
		fmt.Fprintln(ctx.Stdout(), "Options: [y] commit  [n] cancel  [e] edit message")
		fmt.Fprint(ctx.Stdout(), "Choice [y/n/e]: ")

		choice, err := readConfirmationChoice(ctx)
		if err != nil {
			return "", false, fmt.Errorf("reading choice: %w", err)
		}

		switch strings.ToLower(string(choice)) {
		case "y":
			return current, true, nil
		case "n":
			return current, false, nil
		case "e":
			edited, err := editCommitMessage(ctx, current)
			if err != nil {
				return "", false, fmt.Errorf("edit commit message: %w", err)
			}
			trimmed := strings.TrimSpace(edited)
			if trimmed == "" {
				fmt.Fprintln(ctx.Stdout(), "Edited message is empty; keeping previous message.")
				continue
			}
			current = trimmed
		default:
			fmt.Fprintln(ctx.Stdout(), "Please choose y, n, or e.")
		}
	}
}

func editCommitMessage(ctx *snap.Context, current string) (string, error) {
	tmpFile, err := os.CreateTemp("", "flow-commit-*.md")
	if err != nil {
		return "", err
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.WriteString(current + "\n"); err != nil {
		tmpFile.Close()
		return "", err
	}
	if err := tmpFile.Close(); err != nil {
		return "", err
	}

	editor := findEditor()
	cmd := exec.Command(editor, tmpFile.Name())
	cmd.Stdout = ctx.Stdout()
	cmd.Stderr = ctx.Stderr()
	cmd.Stdin = ctx.Stdin()
	if err := cmd.Run(); err != nil {
		return "", err
	}

	content, err := os.ReadFile(tmpFile.Name())
	if err != nil {
		return "", err
	}

	return string(content), nil
}

func findEditor() string {
	for _, env := range []string{"GIT_EDITOR", "VISUAL", "EDITOR"} {
		if val := strings.TrimSpace(os.Getenv(env)); val != "" {
			return val
		}
	}
	return "vi"
}

func readConfirmationChoice(ctx *snap.Context) (byte, error) {
	if file, ok := ctx.Stdin().(*os.File); ok {
		stateCmd := exec.Command("stty", "-g")
		stateCmd.Stdin = file
		stateCmd.Stdout = nil
		stateCmd.Stderr = nil
		if oldStateBytes, err := stateCmd.Output(); err == nil {
			oldState := strings.TrimSpace(string(oldStateBytes))
			if oldState != "" {
				rawCmd := exec.Command("stty", "raw", "-echo")
				rawCmd.Stdin = file
				rawCmd.Stdout = nil
				rawCmd.Stderr = nil
				if err := rawCmd.Run(); err == nil {
					defer func() {
						restoreCmd := exec.Command("stty", oldState)
						restoreCmd.Stdin = file
						restoreCmd.Stdout = nil
						restoreCmd.Stderr = nil
						_ = restoreCmd.Run()
					}()

					var buf [1]byte
					for {
						n, err := file.Read(buf[:])
						if err != nil {
							return 0, err
						}
						if n == 0 {
							continue
						}
						b := buf[0]
						if b == '\r' || b == '\n' {
							continue
						}
						fmt.Fprintln(ctx.Stdout())
						return b, nil
					}
				}
			}
		}
	}

	reader := bufio.NewReader(ctx.Stdin())
	for {
		b, err := reader.ReadByte()
		if err != nil {
			return 0, err
		}
		if b == '\r' || b == '\n' {
			continue
		}
		return b, nil
	}
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

	systemPrompt := "You are an expert software engineer who writes clear, concise git commit messages. Use imperative mood, keep the subject line under 72 characters, and include an optional body with bullet points if helpful. Never wrap the message in quotes. Never include secrets, credentials, or file contents from .env files, environment variables, keys, or other sensitive data—even if they appear in the diff."

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

	var (
		branchName           string
		preferredRemote      string
		branchCandidates     []string
		branchDerivedFromURL bool
	)

	if strings.HasPrefix(branchInput, "http://") || strings.HasPrefix(branchInput, "https://") {
		candidates, err := parseGitHubTreeURL(branchInput)
		if err != nil {
			return fmt.Errorf("parse GitHub tree URL: %w", err)
		}
		branchCandidates = candidates
		branchName = branchCandidates[0]
		branchDerivedFromURL = true
	} else {
		branchName = branchInput
		branchCandidates = []string{branchName}

		if idx := strings.Index(branchInput, "/"); idx > 0 {
			candidateRemote := branchInput[:idx]
			remaining := branchInput[idx+1:]
			if remaining != "" {
				for _, r := range remotes {
					if r == candidateRemote {
						preferredRemote = candidateRemote
						branchName = remaining
						branchCandidates[0] = remaining
						break
					}
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

	if branchDerivedFromURL && len(branchCandidates) > 0 {
		selected, err := pickBranchCandidateForRemote(remote, branchCandidates)
		if err != nil {
			return err
		}
		branchName = selected
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

func parseGitHubTreeURL(raw string) ([]string, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("parse url %q: %w", raw, err)
	}

	host := strings.ToLower(u.Host)
	if host != "github.com" && host != "www.github.com" {
		return nil, fmt.Errorf("expected github.com host, got %s", u.Host)
	}

	escapedPath := u.EscapedPath()
	trimmed := strings.Trim(escapedPath, "/")
	parts := strings.Split(trimmed, "/")
	if len(parts) < 4 || !strings.EqualFold(parts[2], "tree") {
		return nil, fmt.Errorf("unsupported GitHub tree URL path %q", u.Path)
	}

	branchParts := parts[3:]
	if len(branchParts) == 0 {
		return nil, fmt.Errorf("branch name missing in GitHub tree URL")
	}

	seen := make(map[string]struct{})
	candidates := make([]string, 0, len(branchParts)+1)
	addCandidate := func(candidate string) {
		if candidate == "" {
			return
		}
		if _, ok := seen[candidate]; ok {
			return
		}
		seen[candidate] = struct{}{}
		candidates = append(candidates, candidate)
	}

	if ref := u.Query().Get("ref"); ref != "" {
		if decoded, err := url.PathUnescape(ref); err == nil {
			addCandidate(decoded)
		}
	}

	for i := 1; i <= len(branchParts); i++ {
		joined := strings.Join(branchParts[:i], "/")
		decoded, err := url.PathUnescape(joined)
		if err != nil {
			continue
		}
		addCandidate(decoded)
	}

	if len(candidates) == 0 {
		return nil, fmt.Errorf("could not determine branch name from GitHub tree URL")
	}

	return candidates, nil
}

func pickBranchCandidateForRemote(remote string, candidates []string) (string, error) {
	if len(candidates) == 0 {
		return "", fmt.Errorf("no branch candidates supplied")
	}

	for _, candidate := range candidates {
		hasBranch, err := gitRemoteHasBranch(remote, candidate)
		if err != nil {
			return "", err
		}
		if hasBranch {
			return candidate, nil
		}
	}

	return candidates[0], nil
}

func gitRemoteHasBranch(remote, branch string) (bool, error) {
	cmd := exec.Command("git", "ls-remote", "--heads", remote, branch)
	out, err := cmd.Output()
	if err != nil {
		return false, fmt.Errorf("git ls-remote %s %s: %w", remote, branch, err)
	}

	return strings.TrimSpace(string(out)) != "", nil
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
