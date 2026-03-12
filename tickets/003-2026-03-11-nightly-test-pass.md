# Ticket 003 (2026-03-11) — Nightly Release Build + UI Smoke

## Requirements
- Run the standard testing checklist: launch app, open/close project, run core flows, verify menus, verify button interactions, exercise error paths, and run a basic smoke test.
- Build a Release bundle during the 08:00–23:00 window, increment semantic patch version, and update VERSION.txt + Info.plist entries.
- Record app bundle size, startup time notes, and any performance regressions.
- Capture blockers if UI automation is not possible.

## Acceptance Criteria
- Release build completes successfully; version bumped and stored in VERSION.txt.
- Test checklist results logged (pass/fail/blocker) with clear notes.
- Bundle size recorded and compared to 500MB limit.

## Testing Notes
- Activate the app before running System Events UI automation.
- If automated checks fail, record exact error output.

## Results (2026-03-11 22:55 ET)
- Release build: SUCCESS (0.1.25)
- App launch: SUCCESS (opened app bundle)
- Menu verification: PARTIAL (System Events menu bar access OK via menu bar item 6/7/8/9; invoked Open/Create/Close/Grant Access + Add/Refresh + Help; dismissed sheets via Escape)
- Button interactions: BLOCKED (System Events reports 0 windows; cannot click tabs/buttons)
- Open/close project: BLOCKED (menu items invoked but no window detected to select project; cannot verify close flow)
- Error paths: PARTIAL (Create Project sheet invoked via menu; unable to confirm validation/error due to missing window)
- Smoke test: PARTIAL (menu flows only)
- Bundle size: 1.0M (<500MB)
- Blocker: System Events reports 0 windows for ClawAgentManager, preventing UI button/test automation.

## Button-Functionality Checks
- Verify toolbar/in-view buttons respond to clicks.
- Verify menus are present and each menu item performs the intended action.
- Verify project open/close/create flows and drag/drop assignments.

## Catastrophic Warning
- **Do not delete yourself when testing.**
