import Foundation

struct ProjectInfo: Identifiable, Codable {
    let id: String
    let slug: String
    let name: String
    let path: String
    let scopingPath: String?
}

struct Station: Identifiable, Codable {
    let id: String
    let x: Double
    let y: Double
    var agentId: String?
}

struct AssignmentsFile: Codable {
    var activeProject: String?
    var projects: [String: ProjectAssignments]
}

struct ProjectAssignments: Codable {
    var stations: [Station]
}

struct ProjectsStore {
    static let projectsDir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Documents/OpenClaw/Projects")
    static let assignmentsPath: URL = {
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = support.appendingPathComponent("ClawAgentManager")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("project-assignments.json")
    }()

    static func listProjects() -> [ProjectInfo] {
        let fm = FileManager.default
        guard let entries = try? fm.contentsOfDirectory(at: projectsDir, includingPropertiesForKeys: nil) else { return [] }
        let dirs = entries.filter { $0.hasDirectoryPath && !$0.lastPathComponent.hasPrefix(".") }
        return dirs.map { url in
            let scoping = url.appendingPathComponent("SCOPING.md")
            let name = readProjectName(scopingPath: scoping, fallback: url.lastPathComponent)
            return ProjectInfo(
                id: url.lastPathComponent,
                slug: url.lastPathComponent,
                name: name,
                path: url.path,
                scopingPath: fm.fileExists(atPath: scoping.path) ? scoping.path : nil
            )
        }
    }

    static func readProjectName(scopingPath: URL, fallback: String) -> String {
        guard let data = try? String(contentsOf: scopingPath) else { return fallback }
        let firstLine = data.split(separator: "\n").first ?? ""
        let pattern = try? NSRegularExpression(pattern: "#\\s*Project Scoping\\s*—\\s*(.*)", options: [.caseInsensitive])
        if let match = pattern?.firstMatch(in: String(firstLine), range: NSRange(location: 0, length: firstLine.count)) {
            if let range = Range(match.range(at: 1), in: String(firstLine)) {
                return String(firstLine[range]).trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
        return fallback
    }

    static func loadAssignments(projects: [ProjectInfo]) -> AssignmentsFile {
        var data = AssignmentsFile(activeProject: nil, projects: [:])
        var hadPersisted = false
        if let raw = try? Data(contentsOf: assignmentsPath), let decoded = try? JSONDecoder().decode(AssignmentsFile.self, from: raw) {
            data = decoded
            hadPersisted = true
        }
        for proj in projects {
            if data.projects[proj.slug] == nil {
                data.projects[proj.slug] = ProjectAssignments(stations: defaultStations())
            }
        }
        if let active = data.activeProject, projects.first(where: { $0.slug == active }) == nil {
            data.activeProject = projects.first?.slug
        } else if data.activeProject == nil && !hadPersisted {
            data.activeProject = projects.first?.slug
        }
        saveAssignments(data)
        return data
    }

    static func createProject(name: String) -> (ok: Bool, message: String, project: ProjectInfo?) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return (false, "Project name cannot be empty.", nil)
        }
        let slug = slugify(trimmed)
        if slug.isEmpty {
            return (false, "Project name must include letters or numbers.", nil)
        }
        let projectDir = projectsDir.appendingPathComponent(slug)
        if FileManager.default.fileExists(atPath: projectDir.path) {
            return (false, "Project already exists: \(slug)", nil)
        }
        do {
            try FileManager.default.createDirectory(at: projectDir, withIntermediateDirectories: true)
            let scoping = projectDir.appendingPathComponent("SCOPING.md")
            let scopingBody = "# Project Scoping — \(trimmed)\n\n**Priority:** Medium\n\n## Goals\n- TBD\n"
            try scopingBody.write(to: scoping, atomically: true, encoding: .utf8)
            let project = ProjectInfo(
                id: slug,
                slug: slug,
                name: trimmed,
                path: projectDir.path,
                scopingPath: scoping.path
            )
            return (true, "Created project \(trimmed)", project)
        } catch {
            return (false, "Failed to create project: \(error.localizedDescription)", nil)
        }
    }

    static func slugify(_ name: String) -> String {
        let lower = name.lowercased()
        let allowed = lower.map { char -> Character in
            if char.isLetter || char.isNumber { return char }
            return "-"
        }
        let cleaned = String(allowed)
            .replacingOccurrences(of: "-+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return cleaned
    }

    static func saveAssignments(_ data: AssignmentsFile) {
        if let raw = try? JSONEncoder().encode(data) {
            try? raw.write(to: assignmentsPath)
        }
    }

    static func defaultStations() -> [Station] {
        return [
            Station(id: "station-1", x: 40, y: 80, agentId: nil),
            Station(id: "station-2", x: 200, y: 80, agentId: nil),
            Station(id: "station-3", x: 360, y: 80, agentId: nil),
            Station(id: "station-4", x: 120, y: 240, agentId: nil),
            Station(id: "station-5", x: 280, y: 240, agentId: nil)
        ]
    }
}
