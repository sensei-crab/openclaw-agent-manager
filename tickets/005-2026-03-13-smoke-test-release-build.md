# Ticket 005 (2026-03-13) — Smoke Test + Release Build

## Requirements
- Launch the app and confirm it remains responsive.
- Exercise project open/create/close flows (or document blockers).
- Verify menus are present and usable (or document blockers).
- Verify button interactions (tabs, project actions, agent controls).
- Exercise error paths where possible.
- Run a Release build in the 08:00–23:00 window with semantic version bump.
- Record app bundle size and note any performance regressions.

## Acceptance Criteria
- App launches successfully.
- Menus are validated or blockers are documented.
- Button interactions are validated or blockers are documented.
- Project open/create/close flows are exercised or blockers are documented.
- Error paths are exercised or blockers are documented.
- Release build created with updated VERSION.txt and Info.plist.

## Testing Notes
- Checklist: launch app, open/close project, run core flows, verify menus, verify button interactions, exercise error paths, basic smoke test of primary features.
- If UI automation fails, capture System Events/accessibility errors.

## Catastrophic Warning
- Do not delete yourself when testing.

## Button Functionality Checks
- Verify top tabs (Agents/Projects/Settings) respond.
- Verify project buttons (Open/Create/Close/Select Project) respond.
- Verify agent controls (Add/Delete/Refresh) respond.
- Verify settings actions (Grant Access, Open/Create/Close Project) respond.
