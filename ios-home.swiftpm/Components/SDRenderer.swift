import SwiftUI

struct SDRenderer: View {
    let component: SDUIComponent
    var onAction: ((String) -> Void)?
    
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
                        SDRenderer(component: items[index], onAction: onAction)
                    }
                }
            }
            .padding(edgeInsets(from: component.padding))
            .background(Color(white: 0.1))
            .cornerRadius(12)
            
        case "text_row":
            if let text = component.text {
                Text(text)
                    .font(.body)
                    .padding(edgeInsets(from: component.padding))
            }
            
        case "action_button":
            if let label = component.label {
                Button(action: {
                    print("[SDUI] action_button tapped label=\(label) deeplink=\(component.deeplink)")
                    handleDeeplink(component.deeplink)
                }) {
                    Text(label)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                .padding(edgeInsets(from: component.padding))
            }
            
        case "section_header":
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    if let icon = component.icon {
                        Text(icon)
                            .font(.title2)
                    }
                    if let title = component.title {
                        Text(title)
                            .font(.title3)
                            .fontWeight(.bold)
                    }
                }
                if let subtitle = component.subtitle {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            .padding(edgeInsets(from: component.padding))
            
        case "deal_card":
            DealCardView(component: component, onAction: onAction)
            
        case "horizontal_carousel":
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    if let items = component.items {
                        ForEach(0..<items.count, id: \.self) { index in
                            DealCardView(component: items[index], onAction: onAction)
                                .frame(width: 160)
                        }
                    }
                }
                .padding(.horizontal, 4)
            }
            .padding(edgeInsets(from: component.padding))
            
        case "grid":
            let columns = component.columns ?? 2
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: columns), spacing: 12) {
                if let items = component.items {
                    ForEach(0..<items.count, id: \.self) { index in
                        DealCardView(component: items[index], onAction: onAction)
                    }
                }
            }
            .padding(edgeInsets(from: component.padding))
            
        case "tariff_tile":
            TariffTileView(component: component)
            
        case "list":
            if let items = component.items {
                VStack(spacing: 8) {
                    ForEach(0..<items.count, id: \.self) { index in
                        SDRenderer(component: items[index], onAction: onAction)
                    }
                }
                .padding(edgeInsets(from: component.padding))
            }

        default:
            EmptyView()
        }
    }
    
    private func edgeInsets(from padding: SDUIPadding?) -> EdgeInsets {
        guard let p = padding else {
            return EdgeInsets()
        }
        return EdgeInsets(
            top: CGFloat(p.top ?? 0),
            leading: CGFloat(p.left ?? 0),
            bottom: CGFloat(p.bottom ?? 0),
            trailing: CGFloat(p.right ?? 0)
        )
    }
    
    private func handleDeeplink(_ deeplink: String?) {
        guard let deeplink = deeplink else { return }
        print("[DEEPLINK] \(deeplink)")
        onAction?(deeplink)
        
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

struct DealCardView: View {
    let component: SDUIComponent
    var onAction: ((String) -> Void)?
    
    var body: some View {
        Button(action: {
             if let link = component.deeplink {
                 onAction?(link)
             }
        }) {
            VStack(alignment: .leading, spacing: 0) {
                // Image with badge
                ZStack(alignment: .topLeading) {
                    if let imageUrl = component.imageUrl, let url = URL(string: imageUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .empty:
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            case .failure:
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                                    .overlay(
                                        Image(systemName: "photo")
                                            .foregroundColor(.gray)
                                    )
                            @unknown default:
                                EmptyView()
                            }
                        }
                        .frame(height: 120)
                        .clipped()
                    } else {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 120)
                    }
                    
                    if let badge = component.badgeText {
                        Text(badge)
                            .font(.caption2)
                            .fontWeight(.bold)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(
                                LinearGradient(
                                    colors: [Color.red, Color.pink],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundColor(.white)
                            .cornerRadius(4)
                            .padding(6)
                    }
                }
                
                // Info
                VStack(alignment: .leading, spacing: 4) {
                    if let category = component.category {
                        Text(category.uppercased())
                            .font(.caption2)
                            .foregroundColor(.blue)
                            .tracking(0.5)
                    }
                    
                    if let title = component.title {
                        Text(title)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .lineLimit(2)
                            .foregroundColor(.white)
                    }
                    
                    HStack(spacing: 6) {
                        if let price = component.price, price > 0 {
                            let currency = component.currency ?? "EUR"
                            let symbol = currency == "USD" ? "$" : "€"
                            Text(String(format: "\(symbol)%.2f", price))
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                        }
                        
                        if let originalPrice = component.originalPrice {
                            Text(String(format: "$%.2f", originalPrice))
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .strikethrough()
                        }
                    }
                }
                .padding(10)
            }
            .background(Color(white: 0.08))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .padding(component.padding?.edgeInsets ?? EdgeInsets())
    }
}
