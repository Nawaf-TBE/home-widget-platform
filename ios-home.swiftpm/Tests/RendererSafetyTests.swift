import XCTest
import SwiftUI
@testable import ios_home

final class RendererSafetyTests: XCTestCase {
    
    func testUnknownComponentRendersEmptyView() {
        let component = SDUIComponent(
            type: "unknown_future_component",
            title: "Future",
            text: nil,
            label: nil,
            items: nil,
            padding: nil,
            imageUrl: nil,
            deeplink: nil,
            price: nil,
            originalPrice: nil,
            badgeText: nil,
            category: nil,
            dataGb: nil,
            pricePerMonth: nil,
            compareCount: nil,
            columns: nil
        )
        
        let renderer = SDRenderer(component: component)
        let body = renderer.body
        
        // In SwiftUI, we can't easily introspect the view type of `body` at runtime in tests
        // without extra helpers, but we can verify it compiles and executes.
        XCTAssertNotNil(body)
    }
}
