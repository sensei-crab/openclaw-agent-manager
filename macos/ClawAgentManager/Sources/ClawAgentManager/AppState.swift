import SwiftUI

@MainActor
final class AppState: ObservableObject {
    @Published var statusMessage: String = "Ready"
    @Published var showAbout: Bool = false
    @Published var showAddAgent: Bool = false
    @Published var showCreateProject: Bool = false
    @Published var showOpenProject: Bool = false
    @Published var errorMessage: String? = nil
    @Published var requestRefresh: Bool = false
    @Published var requestCloseProject: Bool = false

    func setStatus(_ message: String) {
        statusMessage = message
    }

    func setError(_ message: String) {
        statusMessage = "Error: \(message)"
        errorMessage = message
    }
}
