import Foundation

enum AppEnvironment {
    case staging
    case production
    
    static var current: AppEnvironment {
        #if DEBUG
        return .staging
        #else
        return .production
        #endif
    }
    
    static var coreBaseURL: URL {
        let string = Bundle.main.object(forInfoDictionaryKey: "CORE_BASE_URL") as? String ?? ""
        return URL(string: string)!
    }
    
    static var productBaseURL: URL {
        let string = Bundle.main.object(forInfoDictionaryKey: "PRODUCT_BASE_URL") as? String ?? ""
        return URL(string: string)!
    }
    
    static var iOSVersion: Int {
        return Int(ProcessInfo().operatingSystemVersion.majorVersion)
    }
}
