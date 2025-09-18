# Ask on Slack MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to request
information from humans via Slack. This server acts as a bridge between AI
systems and human experts, allowing AI to ask questions and receive responses
through Slack when it needs human knowledge or clarification.

## How It Works in Slack

1) If `ASK_SLACK_CHANNEL` is set and `ASK_SLACK_USER` is also set, the bot will post questions in that channel mentioning the user, and will listen for a reply in the thread that mentions that user.

2) If `ASK_SLACK_CHANNEL` is set but `ASK_SLACK_USER` is NOT set, the bot will post the question in that channel (without a mention) and will listen for the first reply in the thread (no mention required).

3) If `ASK_SLACK_CHANNEL` is not set, the bot will open a direct message (DM) to user `ASK_SLACK_USER`.

**Important**: The bot must be invited to the channel if using a public or private channel.

**Mandatory**: You must set both `ASK_SLACK_BOT` and `ASK_SLACK_APP` environment variables.

**Optional**: Either set both `ASK_SLACK_CHANNEL` and `ASK_SLACK_USER`, only `ASK_SLACK_CHANNEL` (thread replies without mention), or just `ASK_SLACK_USER` (DM).

(Or their respective command-line arguments `--slack-bot-token`, `--slack-app-token`,
`--slack-channel-id`, `--slack-user-id`)

### Replying with a mention

The MCP server receives the AI's questions, posts them to a specified Slack
channel, and waits for a human to respond. If a `--slack-user-id` or `$ASK_SLACK_USER` 
is configured, the bot will wait for either:
1. A reply in the thread of the posted message
2. A direct mention of the bot user in any message in the channel

If no user ID is configured, it will only wait for thread replies. The response 
is then sent back to the AI, allowing it to continue its task with the newly 
acquired information.

## Quick Start with npm

Install and run the package:

```bash
npx @rodrigolive/ask-on-slack-mcp \
  --slack-bot-token "xoxb-your-bot-token" \
  --slack-app-token "xapp-your-app-token" \
  --slack-channel-id "C1234567890" \
  --slack-user-id "U1234567890"
```

or set environment variables:

```bash
export ASK_SLACK_BOT="xoxb-your-bot-token"
export ASK_SLACK_APP="xapp-your-app-token"
export ASK_SLACK_CHANNEL="C1234567890"
export ASK_SLACK_USER="U1234567890"

npx -y @rodrigolive/ask-on-slack-mcp
```


### Example with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ask-on-slack": {
      "command": "npx",
      "args": [
        "@rodrigolive/ask-on-slack-mcp",
        "--slack-bot-token", "xoxb-your-actual-token",
        "--slack-app-token", "xapp-your-actual-token", 
        "--slack-channel-id", "C1234567890",
        "--slack-user-id", "U1234567890"
      ]
    }
  }
}
```

## Features

- MCP-compliant server for AI assistant integration
- Slack integration via HTTP polling
- Thread-based conversations for maintaining context
- 5-minute timeout for human responses
- User mentions (`@username`) for notifications or writes to a channel
- Comprehensive debugging and logging capabilities
- Secure token handling
- Dynamic handler initialization for faster startup
- Optimized for instant response detection with HTTP polling

## Prerequisites

Make sure you have the following done before using the server:

1. **Slack App Setup**
   - Create a new Slack app at https://api.slack.com/apps
   - Install the app to your workspace

2. **Bot Token Scopes**
   - `chat:write` - Send messages
   - `channels:read` - Access channel information
   - `users:read` - Access user information

## Required Slack App Permissions

### **Bot Token Scopes (OAuth & Permissions)**

Your app needs these **Bot Token Scopes**:

1. **`chat:write`** - Required for `chat.postMessage()` to send messages to channels
2. **`channels:read`** - Required to access channel information
3. **`users:read`** - Required to access user information

### **App-Level Token**

An App-Level Token is no longer required since we're using HTTP polling instead of Socket Mode.

## Installation

### Global Installation

Install the package globally:

```bash
npm install -g @rodrigolive/ask-on-slack-mcp
```

Then run it directly:
```bash
ask-on-slack-mcp \
  --slack-bot-token "xoxb-your-bot-token" \
  --slack-app-token "xapp-your-app-token" \
  --slack-channel-id "C1234567890" \
  --slack-user-id "U1234567890"
```

### Local Development

If you want to install locally for development:

1. Clone the repository:
```bash
git clone https://github.com/rodrigolive/ask-on-slack-mcp.git
cd ask-on-slack-mcp
```

2. Install dependencies:
```bash
bun install
```

3. Build the TypeScript code:
```bash
bun run build
```

## Configuration

Configuration can be provided via command-line arguments or environment variables. Command-line arguments take precedence over environment variables.

### Command-Line Arguments

- `--slack-bot-token` - Bot User OAuth Token (xoxb-...)
- `--slack-app-token` - App-Level Token for Socket Mode (xapp-...)
- `--slack-channel-id` - Channel ID where the bot will operate
- `--slack-user-id` - User ID to mention when asking questions
- `--log-level` - (Optional) Logging level (default: INFO)
- `--log-file` - (Optional) Log file path (if specified, logs will be written to file instead of stderr)

### Environment Variables (Alternative)

You can also set these environment variables instead of using command-line arguments:

- `ASK_SLACK_BOT` - Bot User OAuth Token (xoxb-...)
- `ASK_SLACK_APP` - App-Level Token for Socket Mode (xapp-...)
- `ASK_SLACK_CHANNEL` - Channel ID where the bot will operate
- `ASK_SLACK_USER` - User ID to mention when asking questions

### Example with Environment Variables

```bash
export ASK_SLACK_BOT="xoxb-your-bot-token"
export ASK_SLACK_APP="xapp-your-app-token"
export ASK_SLACK_CHANNEL="C1234567890"
export ASK_SLACK_USER="U1234567890"

# Now you can run without command-line arguments
bunx @rodrigolive/ask-on-slack-mcp
```

### Example with Log File

```bash
# Log to a file instead of stderr
bunx @rodrigolive/ask-on-slack-mcp \
  --slack-bot-token "xoxb-your-token" \
  --slack-app-token "xapp-your-token" \
  --slack-channel-id "C1234567890" \
  --slack-user-id "U1234567890" \
  --log-file "/tmp/ask-on-slack.log" \
  --log-level "DEBUG"
```

### Logging Behavior

- **Without `--log-file`**: All log messages are written to stderr (default behavior)
- **With `--log-file`**: All log messages are written to the specified file instead of stderr
- **Log levels**: DEBUG, INFO, WARN, ERROR (default: INFO)
- **Log format**: `[LEVEL] YYYY-MM-DDTHH:mm:ss.sssZ - message`

## Usage

### Development Mode

Run with hot-reloading:
```bash
bun run dev
```

### Production Mode

Build and run:
```bash
bun run build
bun run start
```

### With MCP Client (Using npx)

Configure your MCP client to use this server from npm:

```json
{
  "mcpServers": {
    "ask-on-slack": {
      "command": "npx",
      "args": [
        "@rodrigolive/ask-on-slack-mcp",
        "--slack-bot-token", "xoxb-your-token",
        "--slack-app-token", "xapp-your-token",
        "--slack-channel-id", "C1234567890",
        "--slack-user-id", "U1234567890"
      ]
    }
  }
}
```

### With MCP Client (Using Environment Variables)

You can also configure using environment variables:

```json
{
  "mcpServers": {
    "ask-on-slack": {
      "command": "npx",
      "args": ["@rodrigolive/ask-on-slack-mcp"],
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

### With MCP Client (Global Installation)

If you've installed globally:

```json
{
  "mcpServers": {
    "ask-on-slack": {
      "command": "ask-on-slack-mcp",
      "args": [
        "--slack-bot-token", "xoxb-your-token",
        "--slack-app-token", "xapp-your-token",
        "--slack-channel-id", "C1234567890",
        "--slack-user-id", "U1234567890"
      ]
    }
  }
}
```

## Available Tools

### `ask_on_slack`
Main tool for asking questions to humans via Slack.

**Parameters:**
- `question` (string): The question to ask the human. Be specific and provide context.

**Example:**
```json
{
  "tool": "ask_on_slack",
  "arguments": {
    "question": "What is the API endpoint for the production server?"
  }
}
```

**Usage Notes:**
- The bot will mention the specified user in the Slack channel
- The human has 60 seconds to respond in a thread
- The tool will return the human's response or timeout after 60 seconds

## Development

### Scripts

- `bun run build` - Compile TypeScript
- `bun run dev` - Run with hot-reloading
- `bun run start` - Run compiled code
- `bun test` - Run tests with Bun's test runner
- `bun run test:ci` - Run tests with coverage
- `bun run lint` - Run ESLint
- `bun run format` - Format code with Prettier
- `bun run clean` - Clean build artifacts

### Project Structure

```
src/
├── index.ts                  # Main MCP server implementation
├── bin.ts                    # Binary entry point for npx execution
├── human.ts                  # Abstract Human interface
├── slack-http-client.ts      # HTTP-based Slack implementation
└── types.ts                  # TypeScript type definitions

tests/
├── human.test.ts             # Human abstract class tests
├── index.test.ts             # CLI argument parsing tests
├── slack-http-client.test.ts # Slack HTTP client tests
└── types.test.ts             # Type definition tests
```

### Testing

The project uses Bun's built-in test runner. Tests are located in the `tests/` directory.

To run tests:
```bash
bun test              # Run tests in watch mode
bun run test:ci       # Run tests once with coverage
```

### CI/CD

The project uses GitHub Actions for continuous integration and deployment.

- **CI Workflow** (`ci.yml`): Runs on every push and pull request
  - Tests on Bun latest version
  - Runs linting and type checking
  - Generates code coverage reports
  - Builds the project

- **Release Workflow** (`release.yml`): Runs on version tags
  - Builds and tests the project
  - Creates GitHub releases
  - Publishes to npm (requires NPM_TOKEN secret)

## Troubleshooting

1. **Connection Issues**
   - Verify all tokens are correct
   - Check that the bot is invited to the channel

2. **No Response Received**
   - Verify the user ID is correct (format: U1234567890)
   - Ensure the user responds in the message thread, or mentions the bot user directly
   - Check that the bot has permission to read messages in the channel

3. **Authentication Errors**
   - Bot token should start with `xoxb-`
   - Regenerate tokens if needed
   - Verify bot has required scopes: `chat:write`, `channels:read`, `users:read`

4. **Performance Optimization**
   - The server uses HTTP polling with exponential backoff to reduce API calls
   - Detailed timing logs available with `[TIMING]` prefix for debugging

## License

MIT
