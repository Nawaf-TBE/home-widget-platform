import SwiftUI

struct SavedDeal: Decodable, Identifiable {
    let id: String
    let title: String
    let price: Double?
    let image_url: String?
    let kind: String
}

struct SavedView: View {
    let jwt: String
    @State private var deals: [SavedDeal] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    
    private let endpoint = AppEnvironment.productBaseURL.appendingPathComponent("/v1/me/saved").absoluteString
    private let apiClient = APIClient()
    
    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading saved deals...")
            } else if let error = errorMessage {
                VStack {
                    Text("Error: \(error)")
                        .foregroundColor(.red)
                    Button("Retry") {
                        Task { await fetchDeals() }
                    }
                }
            } else if deals.isEmpty {
                Text("No saved deals yet.")
                    .foregroundColor(.secondary)
            } else {
                List(deals) { deal in
                    HStack {
                        if let urlStr = deal.image_url, let url = URL(string: urlStr) {
                            AsyncImage(url: url) { image in
                                image.resizable()
                                     .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color.gray.opacity(0.3)
                            }
                            .frame(width: 60, height: 60)
                            .cornerRadius(8)
                            .clipped()
                        }
                        
                        VStack(alignment: .leading) {
                            Text(deal.title)
                                .font(.headline)
                            Text(String(format: "€%.2f", deal.price))
                                .font(.subheadline)
                                .foregroundColor(.green)
                        }
                    }
                }
            }
        }
        .navigationTitle("Saved Deals")
        .task {
            await fetchDeals()
        }
    }
    
    private func fetchDeals() async {
        isLoading = true
        errorMessage = nil
        do {
            let allDeals: [SavedDeal] = try await apiClient.fetch(endpoint: endpoint, token: jwt)
            // Client-side filter
            deals = allDeals.filter { $0.kind == "deal" || $0.kind == "tariff" }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
