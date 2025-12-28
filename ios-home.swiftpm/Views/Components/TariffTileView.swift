import SwiftUI

struct TariffTileView: View {
    let component: SDUIComponent
    
    var body: some View {
        Button(action: {
            if let deeplink = component.deeplink {
                print("Navigating to: \(deeplink)")
            }
        }) {
            HStack(spacing: 16) {
                // Data Circle
                if let dataGb = component.dataGb {
                    ZStack {
                        Circle()
                            .fill(Color(hex: "E6F0FF"))
                            .frame(width: 56, height: 56)
                            .overlay(
                                Circle()
                                    .stroke(Color(hex: "0055AA"), lineWidth: 2)
                            )
                        
                        VStack(spacing: 0) {
                            Text("\(dataGb)")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(Color(hex: "0055AA"))
                            Text("GB")
                                .font(.system(size: 10))
                                .textCase(.uppercase)
                                .foregroundColor(Color(hex: "0055AA"))
                        }
                    }
                }
                
                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text("Allnet Flat")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color.primary)
                    
                    if let count = component.compareCount {
                        Text("\(count) offers compared")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                    
                    if let badge = component.badgeText {
                        Text(badge)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(Color(hex: "E65100"))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(hex: "FFF3E0"))
                            .cornerRadius(4)
                    }
                }
                
                Spacer()
                
                // Price
                VStack(alignment: .trailing, spacing: 0) {
                    if let price = component.pricePerMonth {
                        HStack(alignment: .top, spacing: 2) {
                            Text("€")
                                .font(.system(size: 14, weight: .bold))
                                .padding(.top, 2)
                            Text(String(format: "%.2f", price))
                                .font(.system(size: 22, weight: .bold))
                        }
                        .foregroundColor(Color.primary)
                    }
                    Text("per month")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
                
                // Arrow
                Image(systemName: "chevron.right")
                    .foregroundColor(Color(hex: "CCCCCC"))
            }
            .padding(12)
            .background(Color.white) // Or dynamic color
            .cornerRadius(8)
            .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(PlainButtonStyle())
        .padding(component.padding?.edgeInsets ?? EdgeInsets())
    }
}
