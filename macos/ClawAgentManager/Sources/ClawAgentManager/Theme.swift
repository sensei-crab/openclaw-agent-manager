import SwiftUI

enum Theme {
    static let bg = Color(red: 0.043, green: 0.059, blue: 0.102)      // #0b0f1a
    static let panel = Color(red: 0.075, green: 0.102, blue: 0.169)   // #131a2b
    static let accent = Color(red: 0.486, green: 0.361, blue: 1.0)    // #7c5cff
    static let green = Color(red: 0.298, green: 1.0, blue: 0.353)     // #4cff5a
    static let yellow = Color(red: 1.0, green: 0.902, blue: 0.427)    // #ffe66d
    static let red = Color(red: 1.0, green: 0.302, blue: 0.427)       // #ff4d6d
    static let text = Color(red: 0.914, green: 0.945, blue: 1.0)      // #e9f1ff
}

extension View {
    func pixelFont(size: CGFloat) -> some View {
        self.font(.system(size: size, weight: .regular, design: .monospaced))
    }
}
