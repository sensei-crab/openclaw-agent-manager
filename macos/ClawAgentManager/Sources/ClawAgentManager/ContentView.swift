import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 6) {
                Text("ClawAgentManager")
                    .font(.largeTitle)

                Text("SwiftUI scaffold in progress")
                    .foregroundStyle(.secondary)

                Image("AppIcon")
                    .resizable()
                    .interpolation(.none)
                    .frame(width: 96, height: 96)
                    .padding(.top, 4)
            }

            Divider().padding(.vertical, 8)

            VStack(alignment: .leading, spacing: 12) {
                Text("Bridge Controls")
                    .font(.headline)

                HStack(spacing: 12) {
                    Button("New Project") {
                        appState.setStatus("New project (scoping prompt pending)")
                    }
                    Button("Open Project…") {
                        appState.setStatus("Open project… (mock)")
                    }
                    Button("Close Project") {
                        appState.setStatus("Close project (mock)")
                    }
                }

                HStack(spacing: 12) {
                    Button("Run Core Flow") {
                        appState.setStatus("Core flow: agent refresh + project sync")
                    }
                    Button("Reload Status") {
                        appState.setStatus("Reloaded agent status")
                    }
                    Button("Show About") {
                        appState.showAbout = true
                    }
                }

                HStack(spacing: 12) {
                    Button("Simulate Error") {
                        appState.setError("Agent list fetch failed")
                    }
                    .foregroundStyle(.red)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider().padding(.vertical, 8)

            HStack {
                Text("Status:")
                    .foregroundStyle(.secondary)
                Text(appState.statusMessage)
                    .fontWeight(.semibold)
            }
        }
        .frame(minWidth: 800, minHeight: 520)
        .padding(24)
        .sheet(isPresented: $appState.showAbout) {
            AboutView()
        }
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
