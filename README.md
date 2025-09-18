# Ask on Slack MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to request information from humans via Slack. This server acts as a bridge between AI systems and human experts, allowing AI to ask questions and receive responses through Slack when it needs human knowledge or clarification.

## Features

- **MCP-compliant server** for AI assistant integration
- **Two transport modes**: stdio (for MCP clients) and HTTP (for web-based clients)
- **Slack integration** via HTTP polling with thread-based conversations
- **Smart fallback**: Works with or without build step
- **Multiple deployment options**: Bun, npm, global installation
- **Comprehensive logging** with configurable levels and file output
- **Secure token handling** via environment variables or CLI arguments

## Quick Start

### Using Bun (Recommended)

```bash
# Run directly without installation
bunx @rodrigolive/ask-on-slack stdio \
  --slack-bot-token "xoxb-your-bot-token" \
  --slack-app-token "xapp-your-app-token" \
  --slack-channel-id "C1234567890" \
  --slack-user-id "U1234567890"
```

### Using npm

```bash
# Run directly without installation
npx @rodrigolive/ask-on-slack stdio \
  --slack-bot-token "xoxb-your-bot-token" \
  --slack-app-token "xapp-your-app-token" \
  --slack-channel-id "C1234567890" \
  --slack-user-id "U1234567890"
```

### Using Environment Variables

```bash
export ASK_SLACK_BOT="xoxb-your-bot-token"
export ASK_SLACK_APP="xapp-your-app-token"
export ASK_SLACK_CHANNEL="C1234567890"
export ASK_SLACK_USER="U1234567890"

# Now run without arguments
bunx @rodrigolive/ask-on-slack stdio
```

## Transport Modes

### Stdio Mode (Default for MCP Clients)

Use stdio mode for MCP clients like Claude Desktop:

```bash
bunx @rodrigolive/ask-on-slack stdio [options]
```

### HTTP Mode (For Web Clients)

Use HTTP mode for web-based MCP clients:

```bash
bunx @rodrigolive/ask-on-slack serve [options]
```

The HTTP server will listen on port 3000 (or specified port) at the `/mcp` endpoint.

## How It Works in Slack

The server supports three different Slack interaction modes:

1. **Channel + User Mention**: If both `ASK_SLACK_CHANNEL` and `ASK_SLACK_USER` are set, the bot posts questions in the channel mentioning the user and listens for replies in the thread.

2. **Channel Only**: If only `ASK_SLACK_CHANNEL` is set, the bot posts questions in the channel (without mention) and listens for the first reply in the thread.

3. **Direct Message**: If only `ASK_SLACK_USER` is set, the bot opens a direct message to the user.

**Important**: The bot must be invited to the channel if using a public or private channel.

## Prerequisites

### Slack App Setup

1. Create a new Slack app at https://api.slack.com/apps
2. Install the app to your workspace
3. Configure the required permissions

### Required Bot Token Scopes

Your app needs these **Bot Token Scopes**:

- **`chat:write`** - Send messages to channels
- **`channels:read`** - Access channel information  
- **`users:read`** - Access user information

### App-Level Token

An App-Level Token is required for the HTTP polling functionality.

## Installation Options

### Global Installation

```bash
# Using Bun
bun install -g @rodrigolive/ask-on-slack

# Using npm
npm install -g @rodrigolive/ask-on-slack
```

Then run directly:
```bash
ask-on-slack stdio --slack-bot-token "xoxb-your-token" --slack-app-token "xapp-your-token"
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/rodrigolive/ask-on-slack-mcp.git
cd ask-on-slack-mcp

# Install dependencies
bun install

# Run in development mode (no build required)
bun run dev

# Or build and run
bun run build
bun run start
```

## Configuration

### Command-Line Arguments

- `--slack-bot-token` - Bot User OAuth Token (xoxb-...)
- `--slack-app-token` - App-Level Token (xapp-...)
- `--slack-channel-id` - Channel ID where the bot will operate
- `--slack-user-id` - User ID to mention when asking questions
- `--log-level` - Logging level (default: INFO)
- `--log-file` - Log file path (if specified, logs will be written to file instead of stderr)
- `--port` - Port to listen on for HTTP mode (default: 3000)

### Environment Variables

- `ASK_SLACK_BOT` - Bot User OAuth Token (xoxb-...)
- `ASK_SLACK_APP` - App-Level Token (xapp-...)
- `ASK_SLACK_CHANNEL` - Channel ID where the bot will operate
- `ASK_SLACK_USER` - User ID to mention when asking questions
- `LOG_LEVEL` - Logging level (default: INFO)
- `LOG_FILE` - Log file path
- `PORT` - Port for HTTP mode (default: 3000)

## MCP Client Configuration

### Claude Desktop Configuration

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

#### Using Bun (Recommended)

```json
{
  "mcpServers": {
    "ask-on-slack": {
      "command": "bunx",
      "args": [
        "@rodrigolive/ask-on-slack",
        "stdio",
        "--slack-bot-token", "xoxb-your-actual-token",
        "--slack-app-token", "xapp-your-actual-token", 
        "--slack-channel-id", "C1234567890",
        "--slack-user-id", "U1234567890"
      ]
    }
  }
}
```

#### Using npm

```json
{
  "mcpServers": {
    "ask-on-slack": {
      "command": "npx",
      "args": [
        "@rodrigolive/ask-on-slack",
        "stdio",
        "--slack-bot-token", "xoxb-your-actual-token",
        "--slack-app-token", "xapp-your-actual-token", 
        "--slack-channel-id", "C1234567890",
        "--slack-user-id", "U1234567890"
      ]
    }
  }
}
```

#### Using Environment Variables

```json
{
  "mcpServers": {
    "ask-on-slack": {
      "command": "bunx",
      "args": ["@rodrigolive/ask-on-slack", "stdio"],
      "env": {
        "ASK_SLACK_BOT": "xoxb-your-token",
        "ASK_SLACK_APP": "xapp-your-token",
        "ASK_SLACK_CHANNEL": "C1234567890",
        "ASK_SLACK_USER": "U1234567890"
      }
    }
  }
}
```

#### Global Installation

```json
{
  "mcpServers": {
    "ask-on-slack": {
      "command": "ask-on-slack",
      "args": [
        "stdio",
        "--slack-bot-token", "xoxb-your-token",
        "--slack-app-token", "xapp-your-token",
        "--slack-channel-id", "C1234567890",
        "--slack-user-id", "U1234567890"
      ]
    }
  }
}
```

### HTTP Mode Configuration

For web-based MCP clients, use HTTP mode:

```json
{
  "mcpServers": {
    "ask-on-slack": {
      "command": "bunx",
      "args": [
        "@rodrigolive/ask-on-slack",
        "serve",
        "--port", "3000",
        "--slack-bot-token", "xoxb-your-token",
        "--slack-app-token", "xapp-your-token",
        "--slack-channel-id", "C1234567890",
        "--slack-user-id", "U1234567890"
      ]
    }
  }
}
```

The server will be available at `http://localhost:3000/mcp`.

### Codex Configuration

For Codex, add to your configuration file (`~/.codex/config.toml`):

```toml
[mcp.servers.ask-on-slack]
command = "bunx"
args = [
  "@rodrigolive/ask-on-slack",
  "stdio",
  "--slack-bot-token", "xoxb-your-token",
  "--slack-app-token", "xapp-your-token",
  "--slack-channel-id", "C1234567890",
  "--slack-user-id", "U1234567890"
]
```

Or using environment variables:

```toml
[mcp.servers.ask-on-slack]
command = "bunx"
args = ["@rodrigolive/ask-on-slack", "stdio"]

[mcp.servers.ask-on-slack.env]
ASK_SLACK_BOT = "xoxb-your-token"
ASK_SLACK_APP = "xapp-your-token"
ASK_SLACK_CHANNEL = "C1234567890"
ASK_SLACK_USER = "U1234567890"
```

**Note**: Codex only supports stdio mode, so always use the `stdio` command.

## Available Tools

The server provides three MCP tools for interacting with humans via Slack:

### `ask_the_boss_on_slack`

Main tool for asking questions to humans via Slack.

**Parameters:**
- `question` (string): The question to ask the human. Be specific and provide context.

**Example:**
```json
{
  "tool": "ask_the_boss_on_slack",
  "arguments": {
    "question": "What is the API endpoint for the production server?"
  }
}
```

### `clarify_with_the_boss_on_slack`

Use this tool to re-ask a question in a clearer way if the boss didn't understand or asked something back.

**Parameters:**
- `question` (string): The clarification to ask the human boss. Be specific and provide context.

**Example:**
```json
{
  "tool": "clarify_with_the_boss_on_slack",
  "arguments": {
    "question": "I need the exact URL for the production API, including the protocol (http/https) and port number."
  }
}
```

### `acknowledge_the_boss_on_slack`

Use this tool to acknowledge receiving a reply from the boss.

**Parameters:**
- `acknowledgement` (string): The text to tell the boss to acknowledge receiving their reply. Keep it short.

**Example:**
```json
{
  "tool": "acknowledge_the_boss_on_slack",
  "arguments": {
    "acknowledgement": "Thanks, got it!"
  }
}
```

## Development

### Scripts

- `bun run build` - Build all TypeScript files
- `bun run dev` - Run with hot-reloading (no build required)
- `bun run start` - Run built code
- `bun test` - Run tests with Bun's test runner
- `bun run test:ci` - Run tests with coverage
- `bun run clean` - Clean build artifacts

### Project Structure

```
src/
├── cli.ts                    # CLI entry point with sade
├── stdio.ts                  # Stdio MCP server implementation
├── serve.ts                  # HTTP MCP server implementation
├── human.ts                  # Abstract Human interface
├── slack-http-client.ts      # HTTP-based Slack implementation
├── slack-client.ts           # Slack client utilities
├── logger.ts                 # Logging utilities
└── types.ts                  # TypeScript type definitions

bin/
└── ask-on-slack              # Executable wrapper with fallback

dist/                         # Built files (generated)
├── cli.js                    # Built CLI
├── stdio.js                  # Built stdio server
└── serve.js                  # Built HTTP server
```

### Smart Fallback

The `bin/ask-on-slack` file includes intelligent fallback behavior:

- **Primary**: Uses `dist/cli.js` if it exists (built version)
- **Fallback**: Uses `src/cli.ts` if built version doesn't exist (source version)
- **No build step required**: You can run the CLI directly from source

### Testing

```bash
bun test              # Run tests in watch mode
bun run test:ci       # Run tests once with coverage
```

## Logging

### Log Levels

- `DEBUG` - Detailed debugging information
- `INFO` - General information (default)
- `WARN` - Warning messages
- `ERROR` - Error messages

### Log Output

- **Without `--log-file`**: All log messages are written to stderr (default behavior)
- **With `--log-file`**: All log messages are written to the specified file instead of stderr

### Example with Logging

```bash
# Log to a file with debug level
bunx @rodrigolive/ask-on-slack stdio \
  --slack-bot-token "xoxb-your-token" \
  --slack-app-token "xapp-your-token" \
  --slack-channel-id "C1234567890" \
  --slack-user-id "U1234567890" \
  --log-file "/tmp/ask-on-slack.log" \
  --log-level "DEBUG"
```

## Troubleshooting

### Common Issues

1. **Connection Issues**
   - Verify all tokens are correct
   - Check that the bot is invited to the channel
   - Ensure bot has required scopes: `chat:write`, `channels:read`, `users:read`

2. **No Response Received**
   - Verify the user ID is correct (format: U1234567890)
   - Ensure the user responds in the message thread
   - Check that the bot has permission to read messages in the channel

3. **Authentication Errors**
   - Bot token should start with `xoxb-`
   - App token should start with `xapp-`
   - Regenerate tokens if needed

4. **Build Issues**
   - The CLI works without build step (fallback to source)
   - Use `DEBUG=1` to see which CLI is being used
   - Run `bun run build` to create optimized dist files

### Debug Mode

Enable debug output to see which CLI is being used:

```bash
DEBUG=1 bunx @rodrigolive/ask-on-slack --version
# Output: Using CLI: /path/to/dist/cli.js (or src/cli.ts)
```

## License

MIT
