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

struct SDUIPadding: Codable {
    let top: Int?
    let right: Int?
    let bottom: Int?
    let left: Int?
}

struct SDUIComponent: Codable {
    let type: String
    let title: String?
    let text: String?
    let label: String?
    let deeplink: String?
    let items: [SDUIComponent]?
    let padding: SDUIPadding?
    
    // section_header
    let subtitle: String?
    let icon: String?
    
    // deal_card
    let category: String?
    let imageUrl: String?
    let price: Double?
    let originalPrice: Double?
    let badgeText: String?
    
    // grid
    let columns: Int?
    
    enum CodingKeys: String, CodingKey {
        case type, title, text, label, deeplink, items, padding
        case subtitle, icon, category
        case imageUrl = "image_url"
        case price
        case originalPrice = "original_price"
        case badgeText = "badge_text"
        case columns
    }
}
