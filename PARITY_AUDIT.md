# CLI Parity Audit — Claw Agent Manager

## CLI Surface (relevant to agent management)
- `openclaw agents`:
  - add ✅ (GUI)
  - delete ✅ (GUI; gated)
  - list ✅ (GUI uses `openclaw agents list` via agent-data)
  - set-identity ✅ (GUI)
  - bind ❌ (missing)
  - bindings ❌ (missing)
  - unbind ❌ (missing)

- `openclaw sessions`:
  - list ✅ (GUI: sessions list)
  - cleanup ❌ (missing; potentially destructive)

- `openclaw agent` (run agent turn / send message):
  - run/send ❌ (missing; needs messaging UI + confirmation)

## Non-core / optional (not in scope yet)
- `openclaw channels` (login/status/logs) — out of scope for Agent Manager core.
- `openclaw nodes` / `system.run` — out of scope for Agent Manager core.

## Proposed next core additions (after current batch)
1) Routing controls: bind / unbind / view bindings.
2) Sessions cleanup with explicit confirmation.
3) Agent run (send message) with channel/target selector + confirmation.

## Notes
- Destructive actions should remain gated by confirmation prompts.
