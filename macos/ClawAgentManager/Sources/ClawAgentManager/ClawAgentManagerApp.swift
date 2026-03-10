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
                Button("New") {
                    appState.setStatus("New project")
                }
                .keyboardShortcut("n")

                Button("Open…") {
                    appState.setStatus("Open project…")
                }
                .keyboardShortcut("o")

                Button("Close") {
                    appState.setStatus("Close project")
                }
                .keyboardShortcut("w")

                Divider()

                Button("Save") {
                    appState.setStatus("Save")
                }
                .keyboardShortcut("s")
            }
            CommandMenu("View") {
                Button("Reload") {
                    appState.setStatus("Reload")
                }
                .keyboardShortcut("r")
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
