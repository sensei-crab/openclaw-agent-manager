import AppKit
import Foundation

final class DocumentAccessStore {
    static let shared = DocumentAccessStore()

    private let bookmarkURL: URL
    private var cachedURL: URL?
    private var didStartAccess: Bool = false

    private init() {
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = support.appendingPathComponent("ClawAgentManager", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        bookmarkURL = dir.appendingPathComponent("documents-bookmark")
        restoreBookmark()
    }

    var hasBookmark: Bool { cachedURL != nil }

    func projectsURL() -> URL {
        cachedURL ?? defaultProjectsURL()
    }

    func requestAccess() {
        let panel = NSOpenPanel()
        panel.message = "Select the OpenClaw Projects folder to grant access"
        panel.prompt = "Grant Access"
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.directoryURL = defaultProjectsURL()
        if panel.runModal() == .OK, let url = panel.url {
            saveBookmark(url: url)
        }
    }

    private func defaultProjectsURL() -> URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Documents/OpenClaw/Projects", isDirectory: true)
    }

    private func restoreBookmark() {
        guard let data = try? Data(contentsOf: bookmarkURL) else { return }
        var stale = false
        if let url = try? URL(resolvingBookmarkData: data, options: [.withSecurityScope], bookmarkDataIsStale: &stale) {
            cachedURL = url
            if stale { saveBookmark(url: url) }
            startAccessing(url: url)
        }
    }

    private func saveBookmark(url: URL) {
        do {
            let data = try url.bookmarkData(options: [.withSecurityScope], includingResourceValuesForKeys: nil, relativeTo: nil)
            try data.write(to: bookmarkURL)
            cachedURL = url
            startAccessing(url: url)
        } catch {
            NSLog("Failed to save documents bookmark: \(error)")
        }
    }

    private func startAccessing(url: URL) {
        guard !didStartAccess else { return }
        didStartAccess = url.startAccessingSecurityScopedResource()
    }
}
