// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "ClawAgentManager",
  platforms: [.macOS(.v14)],
  products: [
    .executable(name: "ClawAgentManager", targets: ["ClawAgentManager"])
  ],
  targets: [
    .executableTarget(
      name: "ClawAgentManager",
      resources: [.process("Resources")],
      swiftSettings: [
        .unsafeFlags(["-gnone"], .when(configuration: .debug))
      ]
    )
  ]
)
