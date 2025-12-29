import XCTest
@testable import HomeApp

class DeeplinkTests: XCTestCase {
    func testSavedDeeplink() {
        let dest = DeeplinkRouter.destination(for: "app://me/saved")
        XCTAssertEqual(dest, .saved)
    }
    
    func testTariffsDeeplink() {
        let dest = DeeplinkRouter.destination(for: "app://tariffs")
        XCTAssertEqual(dest, .tariffs)
    }
    
    func testInvalidScheme() {
        let dest = DeeplinkRouter.destination(for: "https://google.com")
        XCTAssertNil(dest)
    }
    
    func testUnknownPath() {
        let dest = DeeplinkRouter.destination(for: "app://unknown")
        XCTAssertNil(dest)
    }
}
