import Foundation

struct SDUIWidget: Codable, Identifiable {
    let id: String = UUID().uuidString
    let productId: String
    let platform: String
    let audienceType: String
    let audienceId: String
    let widgetKey: String
    let content: SDUIContent
    
    enum CodingKeys: String, CodingKey {
        case productId = "product_id"
        case platform
        case audienceType = "audience_type"
        case audienceId = "audience_id"
        case widgetKey = "widget_key"
        case content
    }
}

struct SDUIContent: Codable {
    let schemaVersion: Int
    let dataVersion: Int
    let root: SDUIComponent
    
    enum CodingKeys: String, CodingKey {
        case schemaVersion = "schema_version"
        case dataVersion = "data_version"
        case root
    }
}

struct SDUIComponent: Codable {
    let type: String
    let title: String?
    let text: String?
    let label: String?
    let deeplink: String?
    let items: [SDUIComponent]?
}
