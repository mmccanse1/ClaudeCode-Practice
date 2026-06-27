# Claude Session Notes

## User Environment

- **OS**: Windows
- **Root user folder**: `C:\Users\thoma`
- **Repo location**: `C:\Users\thoma\ClaudeCode_Practice\ClaudeCode-Practice`
- **App folder**: `C:\Users\thoma\ClaudeCode_Practice\ClaudeCode-Practice\weekly-meal-planner\app`

## IMPORTANT — Two local clones, one GitHub remote

There are two local clones of the same GitHub repo (`mmccanse1/ClaudeCode-Practice`):
- `C:\Users\thoma\ClaudeCode_Practice\ClaudeCode-Practice` — **DEV SERVER RUNS FROM HERE** (user's working path)
- `C:\Users\thoma\OneDrive\Documents\ClaudeCode_Practice` — Claude Code session working directory

**Always run git commits and pushes against the ClaudeCode_Practice path**, or push to GitHub and pull into both. The Expo dev server reads from the ClaudeCode_Practice path, so changes must be there for the user to see them in Expo Go.

## Navigate to app

```
cd C:\Users\thoma\ClaudeCode_Practice\ClaudeCode-Practice\weekly-meal-planner\app
```

## Next Session — Planned Review Pipeline

Run in this order:
1. `/stress-test` — stress test the current app state
2. `/dev-team-review` — dev team review
3. `/user-panel-review` — **targeted trust check**: we removed health-based statements from the app (legal de-risking, Phase 8). Need to gauge how real users react to the shift in trust signals now that those claims are gone.
