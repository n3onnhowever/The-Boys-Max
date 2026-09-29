# Codex workflow audit

Read: root AGENTS.md, README_CODEX.md, docs/tasks/ACTIVE_TASK.md, T010, current docs and global AGENTS.md (empty). Root rules already cover source hierarchy, one integration owner, tests-first for defects, runtime truthfulness and concise handoffs. Archive/SOURCE26_AGENTS.md is historical, not active scope authority.

Observed:
- No repo .agents or .codex directory, no repo skills/hooks/MCP configuration.
- .git/hooks contains only sample hooks; core.hooksPath unset.
- Global ~/.codex/config.toml exists; only section names were inspected. Explicit MCP section: mcp_servers.node_repl. Plugin tools are also available through this Codex session; no change to their settings.
- Requested custom scope-guard, test-and-verify and runtime-evidence skills absent from repo and inspected user skill roots/session catalog.
- package.json provides test:unit, test:integration, typecheck, build, syntax and verification helpers, but no lint command. No CI or configured remote. No committed dedicated secret scanner found.
- Old ACTIVE_TASK pointed to a nonexistent T001-prefixed filename. Updated only to the current documentation preflight; previous pointer retained as history.
- Sandbox launch failed; approved external shell read worked. This is environment evidence, not grounds to weaken sandbox/approval settings.

Minimal staged recommendation (not installed):
1. T101: reconcile concise AGENTS source pointers/name/scope/queue-gate language after human review. Preserve durable-state/auth/UNKNOWN invariants. One writer owns shared contracts, routes, migrations and dependencies.
2. Add repo-local scope-guard only if recurring scope checks warrant it: read freeze/patch/current ticket, classify P0/P1/Stretch, print exact conflicts; never auto-edit canonical files.
3. Add test-and-verify: discover real package scripts, run targeted then final checks, distinguish FAIL/BLOCKED/NOT_RUN, verify diff and scan; never generate a lock through unsafe flags.
4. Add runtime-evidence: bind receipts to source SHA and runtime build, record actual commands/screenshots/client and versions, redact secrets; unit PASS never upgrades Docker/MAX/provider evidence.
5. Later only when repeated work needs it: provider-adapter, max-integration, data-safety. Reuse contracts and invariants rather than fork engines.

Repository skills can live under .agents/skills and use a SKILL.md with a precise name/description and task-specific instructions. Official documentation was fetched at https://learn.chatgpt.com/docs/build-skills (via developers.openai.com/codex/skills/). This audit recommends organization, not reliance on unverified host settings.

Do not install marketplace collections, add MCP servers, hooks or extra agents just for this project. External skills require repository + pinned revision + licence + manual/security review before use. Defer new tooling until an observed workflow gap justifies it. No third-party skills installed, no hooks enabled, no Codex settings altered.
