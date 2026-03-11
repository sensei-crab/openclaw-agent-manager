import Foundation

struct OpenClawService {
    static func run(_ args: [String]) async -> (ok: Bool, stdout: String, stderr: String) {
        await withCheckedContinuation { continuation in
            let process = Process()
            process.launchPath = "/bin/bash"
            let cmd = (["openclaw"] + args).map { $0.contains(" ") ? "\"\($0)\"" : $0 }.joined(separator: " ")
            process.arguments = ["-lc", cmd]
            let stdoutPipe = Pipe()
            let stderrPipe = Pipe()
            process.standardOutput = stdoutPipe
            process.standardError = stderrPipe
            process.terminationHandler = { proc in
                let stdoutData = stdoutPipe.fileHandleForReading.readDataToEndOfFile()
                let stderrData = stderrPipe.fileHandleForReading.readDataToEndOfFile()
                let stdout = String(data: stdoutData, encoding: .utf8) ?? ""
                let stderr = String(data: stderrData, encoding: .utf8) ?? ""
                let ok = proc.terminationStatus == 0
                continuation.resume(returning: (ok, stdout, stderr))
            }
            do {
                try process.run()
            } catch {
                continuation.resume(returning: (false, "", error.localizedDescription))
            }
        }
    }

    static func listAgents() async -> [AgentModel] {
        let res = await run(["agents", "list", "--json"])
        guard res.ok, let data = res.stdout.data(using: .utf8) else { return [] }
        do {
            struct Response: Decodable { let agents: [AgentModel] }
            let decoded = try JSONDecoder().decode(Response.self, from: data)
            return decoded.agents
        } catch {
            return []
        }
    }

    static func addAgent(name: String, model: String?) async -> (ok: Bool, message: String) {
        var args = ["agents", "add", name, "--non-interactive", "--workspace", "/Users/openclaw/.openclaw/workspace"]
        if let model, !model.isEmpty { args += ["--model", model] }
        let res = await run(args)
        return (res.ok, (res.stderr.isEmpty ? res.stdout : res.stderr))
    }

    static func deleteAgent(id: String) async -> (ok: Bool, message: String) {
        let res = await run(["agents", "delete", id, "--force"])
        return (res.ok, (res.stderr.isEmpty ? res.stdout : res.stderr))
    }

    static func sendScopingPrompt() async -> (ok: Bool, message: String) {
        let text = "I see you want to create a new project. Let’s scope it out together."
        let res = await run(["system", "event", "--mode", "now", "--text", text])
        return (res.ok, (res.stderr.isEmpty ? res.stdout : res.stderr))
    }
}

struct AgentModel: Identifiable, Decodable {
    let id: String
    let name: String?
    let status: String?
    let workspace: String?
    let lastActiveAt: Double?

    var displayName: String {
        if id == "main" && (name == nil || name == "main") { return "Sensei" }
        return name ?? id
    }
}
