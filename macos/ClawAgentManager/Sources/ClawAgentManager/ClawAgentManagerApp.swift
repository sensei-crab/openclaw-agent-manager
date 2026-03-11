import SwiftUI

@main
struct ClawAgentManagerApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
        .commands {
            CommandGroup(replacing: .appInfo) {
                Button("About ClawAgentManager") {
                    appState.showAbout = true
                }
            }
            CommandMenu("File") {
                Button("Open Project…") {
                    appState.showOpenProject = true
                }
                .keyboardShortcut("o")
                Button("Close Project") {
                    appState.requestCloseProject = true
                }
                .keyboardShortcut("w", modifiers: [.command, .shift])
            }
            CommandMenu("Agents") {
                Button("Add Agent…") {
                    appState.showAddAgent = true
                }
                .keyboardShortcut("n")
                Button("Refresh Agents") {
                    appState.requestRefresh = true
                }
                .keyboardShortcut("r")
            }
            CommandMenu("Projects") {
                Button("Refresh Projects") {
                    appState.requestRefresh = true
                }
            }
            CommandMenu("Help") {
                Button("ClawAgentManager Help") {
                    appState.setStatus("Help")
                }
                .keyboardShortcut("?")
            }
        }
    }
}
