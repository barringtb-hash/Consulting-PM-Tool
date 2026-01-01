# Implement Issue from Bug Tracking

Generate an implementation prompt for a bug tracking issue and implement the fix or feature.

## Usage

```
/implement-issue <issue-id> [--include-comments] [--include-related]
```

## Arguments

- `issue-id` (required): The numeric ID of the issue to implement
- `--include-comments`: Include issue comments for additional context
- `--include-related`: Include related issues with same labels

## Configuration

To use this command, you need a Bug Tracking API key. Set the environment variable:

```bash
export BUG_TRACKER_API_KEY="bt_your_api_key_here"
export BUG_TRACKER_API_URL="https://your-api.onrender.com/api"
```

Or create an API key in the Bug Tracking settings page at `/bug-tracking` → API Keys.

## Instructions

When this command is invoked with an issue ID, you should:

1. **Fetch the issue prompt** from the Bug Tracking External API:
   - Endpoint: `GET {BUG_TRACKER_API_URL}/bug-tracking/external/issues/{issue-id}/prompt`
   - Header: `X-API-Key: {BUG_TRACKER_API_KEY}`
   - Query params: `?includeComments=true&includeErrorLogs=true`

   If the API key is not configured, fall back to asking the user to share the issue details manually.

2. **Parse the response** which contains:
   - `prompt`: The formatted implementation prompt
   - `issue`: Issue metadata (id, title, type, priority, status)
   - `context`: Additional context (files to check, stack traces, etc.)

3. **Analyze the issue** and determine the implementation approach:
   - For BUG type: Focus on reproducing and fixing the issue
   - For FEATURE_REQUEST: Focus on implementing new functionality
   - For IMPROVEMENT: Focus on enhancing existing code
   - For TASK: Follow the task description

4. **Search the codebase** for relevant files mentioned in:
   - The suggested files list from the prompt
   - Stack traces (if error-related)
   - Component or function names in the description

5. **Implement the fix or feature**:
   - Make minimal, focused changes
   - Follow existing code patterns and conventions
   - Add appropriate error handling
   - Consider edge cases mentioned in comments

6. **Test the implementation**:
   - Run relevant tests if they exist
   - Consider adding new tests for bug fixes

7. **Prepare a summary** of changes made

## Example

```
/implement-issue 42
```

This will:
1. Fetch issue #42 from the bug tracking system using the API key
2. Generate an implementation prompt with all context
3. Analyze and implement the required changes
4. Summarize what was done

## API Response Format

The `/bug-tracking/external/issues/:id/prompt` endpoint returns:

```json
{
  "prompt": "# Implementation Task: Fix login button...",
  "issue": {
    "id": 42,
    "title": "Login button not working on mobile",
    "type": "BUG",
    "priority": "HIGH",
    "status": "OPEN"
  },
  "context": {
    "suggestedFiles": ["src/components/LoginButton.tsx"],
    "stackTrace": "...",
    "environment": "production",
    "errorCount": 15
  },
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00Z",
    "format": "markdown"
  }
}
```

## External API Endpoints Available

With an API key (`X-API-Key` header), you can access:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/bug-tracking/external/issues` | GET | List all issues |
| `/bug-tracking/external/issues/:id` | GET | Get single issue |
| `/bug-tracking/external/issues/:id/prompt` | GET | Get AI implementation prompt |
| `/bug-tracking/external/issues/:id/status` | POST | Update issue status |

$ARGUMENTS
