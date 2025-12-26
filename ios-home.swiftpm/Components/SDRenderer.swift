import SwiftUI

struct SDRenderer: View {
    let component: SDUIComponent
    
    @ViewBuilder
    var body: some View {
        switch component.type {
        case "widget_container":
            VStack(alignment: .leading, spacing: 12) {
                if let title = component.title {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
                
                if let items = component.items {
                    ForEach(0..<items.count, id: \.self) { index in
                        SDRenderer(component: items[index])
                    }
                }
            }
            .padding()
            .background(Color(white: 0.1))
            .cornerRadius(12)
            
        case "text_row":
            if let text = component.text {
                Text(text)
                    .font(.body)
            }
            
        case "action_button":
            if let label = component.label {
                Button(action: {
                    handleDeeplink(component.deeplink)
                }) {
                    Text(label)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
            }
            
        default:
            EmptyView()
        }
    }
    
    private func handleDeeplink(_ deeplink: String?) {
        guard let deeplink = deeplink else { return }
        print("[DEEPLINK] \(deeplink)")
        
        if let url = URL(string: deeplink) {
            #if os(iOS)
            if url.scheme?.starts(with: "http") == true {
                UIApplication.shared.open(url)
            }
            #elseif os(macOS)
            NSWorkspace.shared.open(url)
            #endif
        }
    }
}
