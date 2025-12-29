import Foundation

enum HomeDestination: Hashable {
    case saved
    case tariffs
    // Add others
}

struct DeeplinkRouter {
    static func destination(for deeplink: String) -> HomeDestination? {
        let cleanLink = deeplink.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Handle explicit paths (normalized)
        if cleanLink == "/saved" || cleanLink == "/saved/" { return .saved }
        if cleanLink == "/tariffs" || cleanLink == "/tariffs/" { return .tariffs }
        
        // Handle scheme-based if any left (optional fallback)
        if let url = URL(string: cleanLink), url.scheme == "app" {
             switch url.host?.lowercased() {
             case "me":
                 if url.path == "/saved" || url.path == "/saved/" { return .saved }
             case "tariffs":
                 return .tariffs
             default: break
             }
        }
        
        let parsingResult: HomeDestination? = nil
        print("[SDUI] parse deeplink=\(cleanLink) -> \(String(describing: parsingResult))")
        return parsingResult
    }
}
