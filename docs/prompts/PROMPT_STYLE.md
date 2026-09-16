# Prompt style for Codex

Use English for Codex task prompts. Keep durable project context in repository files, not repeated in each chat.

Recommended structure:

```text
Goal
Inputs / authority
Do
Do not
Acceptance
Deliver
```

Rules:
- Prefer paths and exact commands over prose history.
- State one source-of-truth tree.
- Separate required checks from optional checks.
- Mark live/mock/inherited evidence explicitly.
- Never ask the model to “analyze everything”.
- Do not repeat `AGENTS.md` in the task prompt.
- End with concrete completion criteria and expected handoff path.
