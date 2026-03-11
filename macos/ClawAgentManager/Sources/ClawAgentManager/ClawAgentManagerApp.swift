import SwiftUI
import AppKit

@main
struct ClawAgentManagerApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
        MenuBarExtra(menuBarTitle(), systemImage: "antenna.radiowaves.left.and.right") {
            Text("ClawAgentManager")
            Text("Version \(menuBarVersion())")
            Divider()
            Button("Open Project…") {
                appState.showOpenProject = true
            }
            Button("Create Project…") {
                appState.showCreateProject = true
            }
            Button("Add Agent…") {
                appState.showAddAgent = true
            }
            Divider()
            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
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
                Button("Create Project…") {
                    appState.showCreateProject = true
                }
                .keyboardShortcut("n", modifiers: [.command, .shift])
                Button("Close Project") {
                    appState.requestCloseProject = true
                }
                .keyboardShortcut("w", modifiers: [.command, .shift])
                Divider()
                Button("Grant Documents Access…") {
                    DocumentAccessStore.shared.requestAccess()
                }
            }
            CommandMenu("Agents") {
                Button("Add Agent…") {
                    appState.showAddAgent = true
                }
                .keyboardShortcut("a", modifiers: [.command, .shift])
                Button("Refresh Agents") {
                    appState.requestRefresh = true
                }
                .keyboardShortcut("r")
            }
            CommandMenu("Projects") {
                Button("Create Project…") {
                    appState.showCreateProject = true
                }
                Button("Open Project…") {
                    appState.showOpenProject = true
                }
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

    private func menuBarVersion() -> String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0"
    }

    private func menuBarTitle() -> String {
        "CAM \(menuBarVersion())"
    }
}
