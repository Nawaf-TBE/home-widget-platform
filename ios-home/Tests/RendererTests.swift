import XCTest
import SwiftUI
@testable import ios_home

final class RendererTests: XCTestCase {
    func testRendererHandlesUnknownComponentGracefully() throws {
        // 1. Setup a component with an unknown type
        let unknown = SDUIComponent(
            type: "mystery_component",
            title: nil,
            text: nil,
            label: nil,
            deeplink: nil,
            items: nil
        )
        
        // 2. Wrap in View and check it doesn't crash
        let view = SDRenderer(component: unknown)
        let _ = UIHostingController(rootView: view).view // Force layout/load
        
        // If we reach here without crash, test passes
        XCTAssertNotNil(view)
    }
    
    func testRendererRendersKnownComponent() throws {
        let textRow = SDUIComponent(
            type: "text_row",
            title: nil,
            text: "Hello SwiftUI",
            label: nil,
            deeplink: nil,
            items: nil
        )
        
        let view = SDRenderer(component: textRow)
        XCTAssertNotNil(view)
    }
}
