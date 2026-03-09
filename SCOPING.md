# Project Scoping — Claw Agent Manager

## Goals
- Deliver a GUI with feature‑parity to the OpenClaw CLI for controlling, managing, and monitoring agents.
- Present the control surface as a “starship bridge” with 16‑bit iRobot‑style agents.

## Requirements
- Agent status lights: green = working, yellow = idle/break, red/repair = issue/not reporting.
- Idle agents should be visually moved to a “Break Room.”
- Agents with issues should appear in “Repair Bay.”
- GUI should allow common CLI actions where possible (start/stop/inspect/run/etc.).
- Drag agents from Break Room to Bridge stations to assign them.
- Bridge stations represent **projects** (not just fixed stations).
- If only 1 project exists: show that project as a workstation, plus a second “Select Project / Create New Project” station.
- Creating a new project should create a new folder under ~/Documents/OpenClaw/Projects/<project-slug>/.
- When creating a new project, trigger an OpenClaw chat prompt: “I see you want to create a new project. Let’s scope it out together.”

## Out of scope
- Non‑OpenClaw external integrations unless explicitly approved.

## Deliverables
- Electron desktop app (macOS) with working GUI controls + monitoring.
- Clear mapping from CLI commands to GUI actions.
- Project-based stations with drag/drop assignment from Break Room.
- New-project creation flow that creates a project folder and prompts scoping chat.

## Timeline / ETA
- TBD after confirming action plan.

## Risks / Dependencies
- Requires stable CLI access to list/control agents.
- Some CLI commands may not be safe/possible to expose without confirmation.

## Acceptance criteria
- App can list agents, show status and last active.
- App can execute the same core actions as CLI (as approved).
- Visual bridge view updates in near‑real‑time.
- Drag/drop from Break Room assigns an agent to a Bridge project station.
- Project stations accurately reflect current projects (including 1‑project edge case).
- New project creation creates folder in ~/Documents/OpenClaw/Projects/ and triggers scoping prompt.

## Proposed model to use
- openai-codex/gpt-5.2-codex (current default) for code changes and UI iterations.

## Estimated token cost
- Estimate: 200k–500k tokens for full parity + UI polish (subject to refinement after action plan).

## Other costs (subscriptions/APIs/software)
- None expected beyond existing OpenAI OAuth subscription.

## Special access requests needed
- None (assuming local CLI access remains available).

## Notes
- Bobby prefers starship/bridge vibe with 16‑bit iRobot agents and clear station lights.
