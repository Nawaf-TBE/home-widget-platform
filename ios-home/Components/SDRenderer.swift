import SwiftUI

struct SDRenderer: View {
    let component: SDUIComponent
    
    var body: some View {
        render(component)
    }
    
    @ViewBuilder
    private func render(_ component: SDUIComponent) -> some View {
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
                        render(items[index])
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
            // Skip unknown components
            EmptyView()
        }
    }
    
    private func handleDeeplink(_ deeplink: String?) {
        guard let deeplink = deeplink else { return }
        print("[DEEPLINK] \(deeplink)")
        
        if let url = URL(string: deeplink), url.scheme?.starts(with: "http") == true {
            UIApplication.shared.open(url)
        }
    }
}
