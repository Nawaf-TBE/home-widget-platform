import XCTest
@testable import ios_home

final class ComponentDecodingTests: XCTestCase {
    
    func testDecodeTariffTile() throws {
        let json = """
        {
            "type": "tariff_tile",
            "data_gb": 50,
            "price_per_month": 29.99,
            "compare_count": 5,
            "deeplink": "app://tariff/123",
            "badge_text": "Best Value"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let component = try decoder.decode(SDUIComponent.self, from: json)
        
        XCTAssertEqual(component.type, "tariff_tile")
        XCTAssertEqual(component.dataGb, 50)
        XCTAssertEqual(component.pricePerMonth, 29.99)
        XCTAssertEqual(component.compareCount, 5)
        XCTAssertEqual(component.badgeText, "Best Value")
    }
    
    func testDecodeList() throws {
        let json = """
        {
            "type": "list",
            "items": [
                { "type": "text_row", "text": "Item 1" },
                { "type": "text_row", "text": "Item 2" }
            ]
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let component = try decoder.decode(SDUIComponent.self, from: json)
        
        XCTAssertEqual(component.type, "list")
        XCTAssertEqual(component.items?.count, 2)
        XCTAssertEqual(component.items?[0].text, "Item 1")
    }
    
    func testDecodeDealCardWithOptionalPrice() throws {
        let json = """
        {
            "type": "deal_card",
            "title": "Electronics",
            "image_url": "https://example.com/img.png",
            "deeplink": "app://cat/1"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let component = try decoder.decode(SDUIComponent.self, from: json)
        
        XCTAssertEqual(component.type, "deal_card")
        XCTAssertEqual(component.title, "Electronics")
        XCTAssertNil(component.price)
    }
}
