import SwiftUI

struct ListView: View {
    let component: SDUIComponent
    
    var body: some View {
        VStack(spacing: 8) {
            if let items = component.items {
                ForEach(items.indices, id: \.self) { index in
                    SDRenderer(component: items[index])
                }
            }
        }
        .padding(component.padding?.edgeInsets ?? EdgeInsets())
    }
}
