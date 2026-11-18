// AX inspection / action helper for the native Cevtuo Causa app.
// Usage:
//   swift scripts/ax-tool.swift dump [--max-depth N] [--all]
//   swift scripts/ax-tool.swift press <label-substring>
//   swift scripts/ax-tool.swift value <label-substring>
//
// Only AX actions are used (no coordinates / keyboard synthesis), so it does
// not hijack the user's current keyboard focus.

import AppKit
import ApplicationServices

let appName = "cevtuo-causa"
let maxDepthDefault = 40

func attr(_ el: AXUIElement, _ name: String) -> AnyObject? {
  var v: AnyObject?
  let err = AXUIElementCopyAttributeValue(el, name as CFString, &v)
  return err == .success ? v : nil
}

func str(_ el: AXUIElement, _ name: String) -> String {
  if let s = attr(el, name) as? String { return s }
  if let n = attr(el, name) as? NSNumber { return n.stringValue }
  return ""
}

func children(_ el: AXUIElement) -> [AXUIElement] {
  return (attr(el, kAXChildrenAttribute) as? [AXUIElement]) ?? []
}

func findApp() -> AXUIElement? {
  for app in NSWorkspace.shared.runningApplications {
    let name = app.localizedName ?? ""
    let exe = app.executableURL?.lastPathComponent ?? ""
    if name == "Cevtuo Causa" || exe == appName {
      return AXUIElementCreateApplication(app.processIdentifier)
    }
  }
  return nil
}

func dump(_ el: AXUIElement, depth: Int, maxDepth: Int, all: Bool) {
  let role = str(el, kAXRoleAttribute)
  let title = str(el, kAXTitleAttribute)
  let value = str(el, kAXValueAttribute)
  let desc = str(el, kAXDescriptionAttribute)
  let label = str(el, "AXLabel") // web content label, if exposed
  let interesting = all || ["AXButton", "AXTextField", "AXStaticText", "AXLink", "AXCheckBox", "AXPopUpButton", "AXHeading", "AXGroup"].contains(role)
  if interesting && (!title.isEmpty || !value.isEmpty || !desc.isEmpty || !label.isEmpty || role == "AXButton" || role == "AXTextField") {
    let pad = String(repeating: "  ", count: depth)
    print("\(pad)\(role) | title=\(title.prefix(120)) | value=\(value.prefix(160)) | desc=\(desc.prefix(80)) | label=\(label.prefix(120))")
  }
  if depth >= maxDepth { return }
  for c in children(el) { dump(c, depth: depth + 1, maxDepth: maxDepth, all: all) }
}

func walk(_ el: AXUIElement, depth: Int = 0, visit: (AXUIElement, Int) -> Bool) -> AXUIElement? {
  if visit(el, depth) { return el }
  for c in children(el) {
    if let hit = walk(c, depth: depth + 1, visit: visit) { return hit }
  }
  return nil
}

let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: dump|press|value"); exit(2) }
guard let app = findApp() else { print("app not running"); exit(1) }

switch args[1] {
case "dump":
  var maxDepth = maxDepthDefault
  var all = false
  var i = 2
  while i < args.count {
    if args[i] == "--max-depth", i + 1 < args.count { maxDepth = Int(args[i + 1]) ?? maxDepth; i += 2; continue }
    if args[i] == "--all" { all = true }
    i += 1
  }
  dump(app, depth: 0, maxDepth: maxDepth, all: all)

case "press", "value":
  guard args.count >= 3 else { print("missing label"); exit(2) }
  let needle = args[2]
  let hit = walk(app) { el, _ in
    let role = str(el, kAXRoleAttribute)
    guard role == "AXButton" || role == "AXTextField" else { return false }
    let texts = [str(el, kAXTitleAttribute), str(el, kAXDescriptionAttribute), str(el, "AXLabel"), str(el, kAXValueAttribute)]
    return texts.contains { $0.contains(needle) }
  }
  guard let el = hit else { print("not found: \(needle)"); exit(3) }
  if args[1] == "value" {
    print("value=\(str(el, kAXValueAttribute)) title=\(str(el, kAXTitleAttribute)) desc=\(str(el, kAXDescriptionAttribute)) label=\(str(el, "AXLabel"))")
  } else {
    let err = AXUIElementPerformAction(el, kAXPressAction as CFString)
    print(err == .success ? "pressed: \(needle)" : "press failed: \(err.rawValue)")
    exit(err == .success ? 0 : 4)
  }

default:
  print("unknown command")
  exit(2)
}
