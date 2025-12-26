import XCTest
@testable import ios_home

final class DecodingTests: XCTestCase {
    func testDecodeRealWidgetSnapshot() throws {
        // 1. Get real JSON sample from fixture
        let bundle = Bundle(for: type(of: self))
        guard let url = bundle.url(forResource: "user_widget_snapshot", withExtension: "json") else {
            XCTFail("Fixture missing")
            return
        }
        
        let data = try Data(contentsOf: url)
        
        // 2. Decode
        let decoder = JSONDecoder()
        let widget = try decoder.decode(SDUIWidget.self, from: data)
        
        // 3. Assert
        XCTAssertEqual(widget.productId, "deals_app")
        XCTAssertEqual(widget.content.root.title, "TOP DEALS")
        XCTAssertEqual(widget.content.root.items?.count, 3)
        XCTAssertEqual(widget.content.root.items?[1].label, "View All")
    }
}
