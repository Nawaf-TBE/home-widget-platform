import SwiftUI

struct TariffDeal: Decodable, Identifiable {
    let id: String
    let data_gb: Double?
    let price_per_month: Double?
    let compare_count: Int?
    let badge_text: String?
}

struct TariffsView: View {
    @State private var tariffs: [TariffDeal] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    
    private let endpoint = AppEnvironment.productBaseURL.appendingPathComponent("/v1/tariffs").absoluteString
    private let apiClient = APIClient()
    
    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading tariffs...")
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red)
            } else {
                List(tariffs) { tariff in
                    HStack {
                        // Simple Tile Repr
                        Circle()
                            .fill(Color.blue.opacity(0.1))
                            .frame(width: 50, height: 50)
                            .overlay(Text("\(Int(tariff.data_gb ?? 0)) GB").font(.caption).bold())
                        
                        VStack(alignment: .leading) {
                            Text("Allnet Flat")
                                .font(.headline)
                            if let count = tariff.compare_count {
                                Text("\(count) offers compared")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing) {
                            Text(String(format: "€%.2f", tariff.price_per_month ?? 0))
                                .bold()
                            Text("per month")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Tariffs")
        .task {
            isLoading = true
            do {
                tariffs = try await apiClient.fetch(endpoint: endpoint, token: nil)
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
