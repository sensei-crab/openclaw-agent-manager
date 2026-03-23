# Ticket 004 (2026-03-12) — Automation Accessibility + Smoke Test Pass

## Requirements
- Attempt automated UI verification for menus and buttons (launch app, menu items, button interactions).
- Exercise project open/create/close flows and error paths where possible.
- Continue troubleshooting System Events accessibility (window detection) to unlock button automation.
- Run release build in 08:00–23:00 window with version bump.
- Document results, blockers, and app bundle size.

## Acceptance Criteria
- App launches successfully and remains responsive.
- Menus can be enumerated and invoked via automation (or blocker is documented).
- Button interactions are validated (or blocker is documented).
- Project open/create/close flows are exercised (or blocker is documented).
- Error paths are exercised (or blocker is documented).
- Release build created with new semantic version; VERSION.txt updated; app bundle size recorded.

## Testing Notes
- Checklist: launch app, open/close project, run core flows, verify menus, verify button interactions, exercise error paths, basic smoke test of primary features.
- If UI automation fails, document System Events errors and any accessibility diagnostics.

## Catastrophic Warning
- Do not delete yourself when testing.

## Button Functionality Checks
- Verify top tabs (Agents/Projects/Settings) respond.
- Verify project buttons (Open/Create/Close/Select Project) respond.
- Verify agent controls (Add/Delete/Refresh) respond.
- Verify settings actions (Grant Access, Open/Create/Close Project) respond.
