import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @EnvironmentObject private var appState: AppState

    @State private var logLines: [String] = ["Live agent telemetry updating every 5s…"]
    @State private var logExpanded: Bool = false

    @State private var agents: [AgentModel] = []
    @State private var projects: [ProjectInfo] = []
    @State private var assignments: AssignmentsFile = AssignmentsFile(activeProject: nil, projects: [:])
    @State private var activeTab: TopTab = .agents
    @State private var createProjectName: String = ""

    @State private var pendingDelete: AgentModel? = nil
    @State private var hasWarnedAccess: Bool = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    TopTabs(activeTab: $activeTab)

                    Group {
                        switch activeTab {
                        case .agents:
                            AgentsView(agents: agents, onDelete: requestDelete)
                        case .projects:
                            ProjectsView(projects: projects,
                                         assignments: assignments,
                                         agents: agents,
                                         onOpenProject: { appState.showOpenProject = true },
                                         onCloseProject: closeProject,
                                         onCreateProject: { appState.showCreateProject = true },
                                         onSelectProject: openProject,
                                         onAssignAgent: assignAgentToProject)
                        case .settings:
                            SettingsView(createProjectName: $createProjectName,
                                         onCreateProject: createProject,
                                         onOpenProject: { appState.showOpenProject = true },
                                         onCloseProject: closeProject,
                                         onAddAgent: { appState.showAddAgent = true })
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }

                RightRail(logLines: $logLines, logExpanded: $logExpanded, agents: agents, statusMessage: appState.statusMessage)
                    .frame(width: 360)
            }
            .padding(16)
        }
        .frame(minWidth: 1100, minHeight: 700)
        .background(WindowAccessor { window in
            guard let window else { return }
            window.title = "Claw Agent Manager"
            window.titleVisibility = .visible
            window.titlebarAppearsTransparent = false
            window.isMovableByWindowBackground = false
            window.setFrameAutosaveName("ClawAgentManagerMain")
            window.identifier = NSUserInterfaceItemIdentifier("ClawAgentManagerMain")
            window.setAccessibilityIdentifier("ClawAgentManagerMainWindow")
            window.isReleasedWhenClosed = false
            window.level = .normal
            window.makeKeyAndOrderFront(nil)
        })
        .sheet(isPresented: $appState.showAbout) {
            AboutView()
        }
        .sheet(isPresented: $appState.showAddAgent) {
            AddAgentSheet { name, model in
                Task {
                    let res = await OpenClawService.addAgent(name: name, model: model)
                    appendLog("[agent add] \(res.ok ? "OK" : "ERR") \(res.message)")
                    if res.ok {
                        appState.setStatus("Agent created")
                    } else {
                        appState.setError(res.message)
                    }
                    await refreshAll()
                }
            }
        }
        .sheet(isPresented: $appState.showOpenProject) {
            OpenProjectSheet(projects: projects) { selected in
                openProject(selected)
            }
        }
        .sheet(isPresented: $appState.showCreateProject) {
            CreateProjectSheet(name: $createProjectName) {
                createProject()
            }
        }
        .alert("Delete Agent", isPresented: Binding(
            get: { pendingDelete != nil },
            set: { newValue in
                if !newValue { pendingDelete = nil }
            }
        ), actions: {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                if let target = pendingDelete {
                    Task { await deleteAgent(target) }
                }
            }
        }, message: {
            Text("This will permanently remove the agent from OpenClaw.")
        })
        .alert("Error", isPresented: Binding(
            get: { appState.errorMessage != nil },
            set: { newValue in
                if !newValue {
                    appState.errorMessage = nil
                }
            }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(appState.errorMessage ?? "")
        }
        .task {
            await refreshAll()
            startRefreshTimer()
        }
        .onChange(of: appState.requestRefresh) { _, newValue in
            if newValue {
                Task { await refreshAll() }
                appState.requestRefresh = false
            }
        }
        .onChange(of: appState.requestCloseProject) { _, newValue in
            if newValue {
                closeProject()
                appState.requestCloseProject = false
            }
        }
    }

    private func startRefreshTimer() {
        Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
            Task { await refreshAll() }
        }
    }

    private func refreshAll() async {
        let newAgents = await OpenClawService.listAgents()
        let newProjects = ProjectsStore.listProjects()
        let newAssignments = ProjectsStore.loadAssignments(projects: newProjects)
        await MainActor.run {
            agents = newAgents
            projects = newProjects
            assignments = newAssignments
        }
    }

    private func appendLog(_ line: String) {
        logLines = ([line] + logLines).prefix(120).map { $0 }
    }

    private func requestDelete(_ agent: AgentModel) {
        pendingDelete = agent
    }

    private func deleteAgent(_ agent: AgentModel) async {
        let res = await OpenClawService.deleteAgent(id: agent.id)
        appendLog("[agent delete] \(res.ok ? "OK" : "ERR") \(res.message)")
        if res.ok {
            appState.setStatus("Agent deleted")
        } else {
            appState.setError(res.message)
        }
        pendingDelete = nil
        await refreshAll()
    }

    private func createProject() {
        let result = ProjectsStore.createProject(name: createProjectName)
        if result.ok, let project = result.project {
            appendLog("[project create] OK \(project.slug)")
            appState.setStatus("Project created")
            createProjectName = ""
            Task { await refreshAll() }
            Task {
                let res = await OpenClawService.sendScopingPrompt()
                await MainActor.run {
                    appendLog("[scoping prompt] \(res.ok ? "OK" : "ERR") \(res.message.trimmingCharacters(in: .whitespacesAndNewlines))")
                }
            }
            openProject(project.slug)
        } else {
            appState.setError(result.message)
        }
    }

    private func openProject(_ slug: String) {
        assignments.activeProject = slug
        ProjectsStore.saveAssignments(assignments)
        appendLog("[project open] \(slug)")
        appState.setStatus("Opened project \(slug)")
        Task { await refreshAll() }
    }

    private func closeProject() {
        assignments.activeProject = nil
        ProjectsStore.saveAssignments(assignments)
        appendLog("[project close]")
        appState.setStatus("Closed active project")
        Task { await refreshAll() }
    }

    private func assignAgentToProject(_ agentId: String, _ projectSlug: String) {
        guard let project = projects.first(where: { $0.slug == projectSlug }) else {
            appState.setError("Unknown project \(projectSlug)")
            return
        }
        if assignments.projects[projectSlug] == nil {
            assignments.projects[projectSlug] = ProjectAssignments(stations: ProjectsStore.defaultStations())
        }
        guard var projectAssignments = assignments.projects[projectSlug],
              !projectAssignments.stations.isEmpty else {
            appState.setError("Missing stations for \(projectSlug)")
            return
        }
        projectAssignments.stations[0].agentId = agentId
        assignments.projects[projectSlug] = projectAssignments
        assignments.activeProject = projectSlug
        ProjectsStore.saveAssignments(assignments)
        let agentName = agents.first(where: { $0.id == agentId })?.displayName ?? agentId
        appendLog("[assign] \(agentName) → \(project.slug)")
        appState.setStatus("Assigned \(agentName) to \(project.name)")
    }
}

private enum TopTab: String, CaseIterable, Identifiable {
    case agents = "Agents"
    case projects = "Projects"
    case settings = "Settings"

    var id: String { rawValue }
}

private struct TopTabs: View {
    @Binding var activeTab: TopTab

    var body: some View {
        HStack(spacing: 8) {
            ForEach(TopTab.allCases) { tab in
                Button {
                    activeTab = tab
                } label: {
                    Text(tab.rawValue)
                        .pixelFont(size: 11)
                        .padding(.vertical, 6)
                        .padding(.horizontal, 10)
                        .foregroundColor(activeTab == tab ? Theme.text : Theme.text.opacity(0.6))
                        .background(activeTab == tab ? Theme.accent.opacity(0.3) : Theme.panel)
                        .overlay(RoundedRectangle(cornerRadius: 6).stroke(activeTab == tab ? Theme.accent : Theme.panel, lineWidth: 2))
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
    }
}

private struct AgentsView: View {
    let agents: [AgentModel]
    let onDelete: (AgentModel) -> Void

    var body: some View {
        VStack {
            Spacer()
            Panel(title: "Agent Monitor") {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(agents) { agent in
                            AgentRow(agent: agent, onDelete: onDelete)
                        }
                    }
                }
                .frame(maxHeight: 7 * 28)
            }
        }
    }
}

private struct ProjectsView: View {
    let projects: [ProjectInfo]
    let assignments: AssignmentsFile
    let agents: [AgentModel]
    let onOpenProject: () -> Void
    let onCloseProject: () -> Void
    let onCreateProject: () -> Void
    let onSelectProject: (String) -> Void
    let onAssignAgent: (String, String) -> Void

    var body: some View {
        Panel(title: "Project Bridge") {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    if let activeSlug = assignments.activeProject,
                       let activeProject = projects.first(where: { $0.slug == activeSlug }) {
                        Text("Active: \(activeProject.name)").pixelFont(size: 10)
                    } else {
                        Text("No active project").pixelFont(size: 10)
                    }
                    Spacer()
                    Button("Open…") {
                        onOpenProject()
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    Button("Close") {
                        onCloseProject()
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }

                ProjectStationsView(projects: projects,
                                   assignments: assignments,
                                   agents: agents,
                                   onSelectProject: onSelectProject,
                                   onAssignAgent: onAssignAgent,
                                   onOpenProject: onOpenProject,
                                   onCreateProject: onCreateProject)
            }
        }
    }
}

private struct SettingsView: View {
    @Binding var createProjectName: String
    let onCreateProject: () -> Void
    let onOpenProject: () -> Void
    let onCloseProject: () -> Void
    let onAddAgent: () -> Void

    var body: some View {
        Panel(title: "Actions") {
            ActionsView(createProjectName: $createProjectName,
                        onCreateProject: onCreateProject,
                        onOpenProject: onOpenProject,
                        onCloseProject: onCloseProject,
                        onAddAgent: onAddAgent)
        }
    }
}

private struct RightRail: View {
    @Binding var logLines: [String]
    @Binding var logExpanded: Bool
    let agents: [AgentModel]
    let statusMessage: String

    var body: some View {
        VStack(spacing: 12) {
            Panel(title: "Status") {
                Text(statusMessage)
                    .pixelFont(size: 9)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Panel(title: "System Log") {
                LogView(lines: logLines, expanded: $logExpanded)
            }

            Panel(title: "Support Bays") {
                SupportBaysView(agents: agents)
            }
        }
    }
}

private struct Panel<Content: View>: View {
    let title: String
    let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .pixelFont(size: 12)
            content
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color(red: 0.173, green: 0.227, blue: 0.365), lineWidth: 3)
                .background(RoundedRectangle(cornerRadius: 10).fill(Theme.panel))
        )
    }
}

private struct ProjectStationsView: View {
    let projects: [ProjectInfo]
    let assignments: AssignmentsFile
    let agents: [AgentModel]
    let onSelectProject: (String) -> Void
    let onAssignAgent: (String, String) -> Void
    let onOpenProject: () -> Void
    let onCreateProject: () -> Void

    var body: some View {
        let showActionStation = projects.count == 1
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 16)], spacing: 16) {
            ForEach(projects) { project in
                ProjectStationView(project: project,
                                   assignments: assignments,
                                   agents: agents,
                                   isActive: assignments.activeProject == project.slug,
                                   onSelectProject: onSelectProject,
                                   onAssignAgent: onAssignAgent)
            }
            if showActionStation {
                ProjectActionStation(onOpenProject: onOpenProject, onCreateProject: onCreateProject)
            }
        }
    }
}

private struct ProjectStationView: View {
    let project: ProjectInfo
    let assignments: AssignmentsFile
    let agents: [AgentModel]
    let isActive: Bool
    let onSelectProject: (String) -> Void
    let onAssignAgent: (String, String) -> Void
    @State private var isTargeted: Bool = false

    var body: some View {
        let assignedAgentId = assignments.projects[project.slug]?.stations.first?.agentId
        let assignedAgent = assignedAgentId.flatMap { id in agents.first(where: { $0.id == id }) }
        let statusColor = statusColorFor(assignedAgent?.status)
        VStack(spacing: 6) {
            AgentAvatarView(color: statusColor)
            statusLight(color: statusColor)
            Text(project.name.uppercased())
                .pixelFont(size: 8)
                .multilineTextAlignment(.center)
            Text(assignedAgent?.displayName ?? "UNASSIGNED")
                .pixelFont(size: 8)
                .foregroundStyle(.secondary)
        }
        .frame(width: 160, height: 140)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isTargeted ? Theme.accent : (isActive ? Theme.accent.opacity(0.9) : Color(red: 0.173, green: 0.227, blue: 0.365)), lineWidth: 3)
                .background(RoundedRectangle(cornerRadius: 10).fill(Color(red: 0.055, green: 0.078, blue: 0.141)))
        )
        .onTapGesture {
            onSelectProject(project.slug)
        }
        .onDrop(of: [UTType.plainText], isTargeted: $isTargeted) { providers in
            guard let provider = providers.first(where: { $0.canLoadObject(ofClass: String.self) }) else { return false }
            _ = provider.loadObject(ofClass: String.self) { value, _ in
                guard let agentId = value else { return }
                DispatchQueue.main.async {
                    onAssignAgent(agentId, project.slug)
                }
            }
            return true
        }
    }

    private func statusLight(color: Color) -> some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(color)
            .frame(width: 16, height: 16)
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.black.opacity(0.6), lineWidth: 2))
            .shadow(color: color.opacity(0.8), radius: 6)
    }
}

private struct ProjectActionStation: View {
    let onOpenProject: () -> Void
    let onCreateProject: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            Text("SELECT / CREATE PROJECT")
                .pixelFont(size: 8)
                .multilineTextAlignment(.center)
            Button("Open…") {
                onOpenProject()
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            Button("Create…") {
                onCreateProject()
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
        .frame(width: 160, height: 140)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Theme.accent.opacity(0.8), style: StrokeStyle(lineWidth: 3, dash: [6]))
                .background(RoundedRectangle(cornerRadius: 10).fill(Color(red: 0.055, green: 0.078, blue: 0.141)))
        )
    }
}

private struct AgentRow: View {
    let agent: AgentModel
    let onDelete: (AgentModel) -> Void

    var body: some View {
        HStack(spacing: 8) {
            Text(statusLabel(agent.status))
                .pixelFont(size: 9)
                .padding(.vertical, 4)
                .padding(.horizontal, 6)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(statusColorFor(agent.status), lineWidth: 2))
                .foregroundStyle(statusColorFor(agent.status))
            Text(agent.displayName)
                .pixelFont(size: 10)
            Spacer()
            Text(formatTime(agent.lastActiveAt))
                .pixelFont(size: 8)
            Button("DELETE") {
                onDelete(agent)
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
    }

    private func formatTime(_ ts: Double?) -> String {
        guard let ts else { return "—" }
        let date = Date(timeIntervalSince1970: ts / 1000)
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

private struct ActionsView: View {
    @Binding var createProjectName: String
    let onCreateProject: () -> Void
    let onOpenProject: () -> Void
    let onCloseProject: () -> Void
    let onAddAgent: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Create Project").pixelFont(size: 8)
                TextField("project name", text: $createProjectName)
                Button("CREATE PROJECT") {
                    onCreateProject()
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Project Control").pixelFont(size: 8)
                HStack {
                    Button("OPEN PROJECT") {
                        onOpenProject()
                    }
                    Button("CLOSE PROJECT") {
                        onCloseProject()
                    }
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Add Agent").pixelFont(size: 8)
                Button("OPEN ADD AGENT") {
                    onAddAgent()
                }
            }
        }
        .pixelFont(size: 9)
        .textFieldStyle(.roundedBorder)
    }
}

private struct LogView: View {
    let lines: [String]
    @Binding var expanded: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button(expanded ? "Collapse" : "Expand") {
                expanded.toggle()
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(lines.indices, id: \.self) { idx in
                        Text(lines[idx]).pixelFont(size: 9)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxHeight: expanded ? 420 : 200)
            .padding(8)
            .background(RoundedRectangle(cornerRadius: 8).fill(Color(red: 0.039, green: 0.059, blue: 0.122)))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(red: 0.122, green: 0.168, blue: 0.302), lineWidth: 2))
        }
    }
}

private struct SupportBaysView: View {
    let agents: [AgentModel]

    var body: some View {
        let idle = agents.filter { ($0.status ?? "idle") == "idle" }
        let working = agents.filter { ($0.status ?? "") == "working" }
        let issue = agents.filter { ($0.status ?? "") == "issue" }

        HStack(spacing: 10) {
            BayView(title: "BREAK ROOM (\(idle.count))", color: Theme.yellow, agents: idle, draggable: true)
            BayView(title: "ACTIVE PATROL (\(working.count))", color: Theme.green, agents: working, draggable: false)
            BayView(title: "REPAIR BAY (\(issue.count))", color: Theme.red, agents: issue, draggable: false)
        }
    }
}

private struct BayView: View {
    let title: String
    let color: Color
    let agents: [AgentModel]
    let draggable: Bool

    var body: some View {
        VStack(spacing: 6) {
            Text(title).pixelFont(size: 10)
            AgentAvatarView(color: color)
            if agents.isEmpty {
                Text("—").pixelFont(size: 8).foregroundStyle(.secondary)
            } else {
                ScrollView {
                    VStack(spacing: 4) {
                        ForEach(agents) { agent in
                            AgentPill(agent: agent, color: color, draggable: draggable)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .frame(maxHeight: 120)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 180)
        .padding(6)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(color, style: StrokeStyle(lineWidth: 3, dash: [6])))
    }
}

private struct AgentPill: View {
    let agent: AgentModel
    let color: Color
    let draggable: Bool

    var body: some View {
        let pill = HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 3)
                .fill(color)
                .frame(width: 8, height: 8)
            Text(agent.displayName)
                .pixelFont(size: 8)
            Spacer(minLength: 0)
        }
        .padding(.vertical, 2)
        .padding(.horizontal, 4)
        .background(RoundedRectangle(cornerRadius: 6).fill(Color.black.opacity(0.25)))
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(color.opacity(0.6), lineWidth: 1))

        if draggable {
            pill.onDrag {
                let provider = NSItemProvider(object: agent.id as NSString)
                provider.suggestedName = agent.displayName
                return provider
            }
        } else {
            pill
        }
    }
}

private struct AgentAvatarView: View {
    let color: Color

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(color.opacity(0.75))
            PixelSprite(color: color)
                .frame(width: 36, height: 36)
        }
        .frame(width: 46, height: 46)
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(red: 0.78, green: 0.82, blue: 1.0), lineWidth: 3))
    }
}

private struct PixelSprite: View {
    let color: Color

    private let patternRows: [String] = [
        "0000011111100000",
        "0001111111111000",
        "0011110000111100",
        "0111101111011110",
        "0111111111111110",
        "1111111111111111",
        "1111001111001111",
        "1111011111011111",
        "1111011111011111",
        "1111001111001111",
        "1111111111111111",
        "0111111111111110",
        "0111101111011110",
        "0011110000111100",
        "0001111111111000",
        "0000011111100000"
    ]

    private let pixelSize: CGFloat = 2

    var body: some View {
        let pattern = patternRows.flatMap { row in
            row.map { $0 == "1" ? 1 : 0 }
        }
        let base = color.opacity(0.75)
        let highlight = color
        let shadow = color.opacity(0.35)
        VStack(spacing: 0) {
            ForEach(0..<16, id: \.self) { row in
                HStack(spacing: 0) {
                    ForEach(0..<16, id: \.self) { col in
                        let idx = row * 16 + col
                        let lit = pattern[idx] == 1
                        let useHighlight = lit && row < 6 && col < 8
                        Rectangle()
                            .fill(lit ? (useHighlight ? highlight : base) : shadow)
                            .frame(width: pixelSize, height: pixelSize)
                    }
                }
            }
        }
        .padding(2)
        .background(Color.black.opacity(0.35))
        .cornerRadius(4)
    }
}

private func statusColorFor(_ status: String?) -> Color {
    switch status {
    case "working": return Theme.green
    case "idle", nil: return Theme.yellow
    case "issue": return Theme.red
    default: return Theme.red
    }
}

private func statusLabel(_ status: String?) -> String {
    switch status {
    case "working": return "WORKING"
    case "idle", nil: return "IDLE"
    case "issue": return "ISSUE"
    default: return (status ?? "UNKNOWN").uppercased()
    }
}

private struct AddAgentSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name: String = ""
    @State private var model: String = ""
    let onSubmit: (String, String?) -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text("Add Agent").font(.title2)
            TextField("Name", text: $name)
            TextField("Model (optional)", text: $model)
            HStack {
                Button("Cancel") { dismiss() }
                Button("Create") {
                    guard !name.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    onSubmit(name, model.isEmpty ? nil : model)
                    dismiss()
                }
            }
        }
        .padding(20)
        .frame(width: 360)
    }
}

private struct OpenProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    let projects: [ProjectInfo]
    let onOpen: (String) -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text("Open Project").font(.title2)
            if projects.isEmpty {
                Text("No projects found in ~/Documents/OpenClaw/Projects")
                    .foregroundStyle(.secondary)
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(projects) { project in
                            Button(project.name) {
                                onOpen(project.slug)
                                dismiss()
                            }
                            .buttonStyle(.bordered)
                            .frame(maxWidth: .infinity)
                        }
                    }
                }
                .frame(maxHeight: 240)
            }
            Button("Cancel") { dismiss() }
        }
        .padding(20)
        .frame(width: 360)
    }
}

private struct CreateProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var name: String
    let onCreate: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text("Create Project").font(.title2)
            TextField("Project name", text: $name)
                .textFieldStyle(.roundedBorder)
            HStack {
                Button("Cancel") { dismiss() }
                Button("Create") {
                    let trimmed = name.trimmingCharacters(in: .whitespaces)
                    guard !trimmed.isEmpty else { return }
                    name = trimmed
                    onCreate()
                    dismiss()
                }
            }
        }
        .padding(20)
        .frame(width: 360)
    }
}

private struct WindowAccessor: NSViewRepresentable {
    let onResolve: (NSWindow?) -> Void

    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        DispatchQueue.main.async {
            self.onResolve(view.window)
        }
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        DispatchQueue.main.async {
            self.onResolve(nsView.window)
        }
    }
}

struct AboutView: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("ClawAgentManager")
                .font(.title)
            Text("SwiftUI macOS scaffold")
                .foregroundStyle(.secondary)
        }
        .padding(24)
        .frame(width: 360, height: 200)
    }
}

#Preview {
    ContentView().environmentObject(AppState())
}
