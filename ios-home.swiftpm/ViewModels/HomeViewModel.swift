import Foundation

struct Deal: Codable, Identifiable {
    let id: String
    let title: String
}

@MainActor
class HomeViewModel: ObservableObject {
    @Published var widgets: [SDUIWidget] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var healthStatus: String?
    @Published var actionStatus: String?
    
    private let client = APIClient()
    private let jwt: String
    
    init(jwt: String) {
        self.jwt = jwt
    }
    
    func fetchWidgets() async {
        isLoading = true
        errorMessage = nil
        
        var request = URLRequest(url: AppEnvironment.coreBaseURL.appendingPathComponent("/v1/home/widgets").appending(queryItems: [URLQueryItem(name: "platform", value: "ios")]))
        request.addValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        request.addValue("\(AppEnvironment.iOSVersion)", forHTTPHeaderField: "X-IOS-Version")
        
        do {
            let fetchedWidgets: [SDUIWidget] = try await client.request(request)
            
            // Sort widgets: User first, then by freshness
            self.widgets = fetchedWidgets.sorted { w1, w2 in
                if w1.audienceType == "user" && w2.audienceType != "user" { return true }
                if w1.audienceType != "user" && w2.audienceType == "user" { return false }
                
                let d1 = w1.widgetUpdatedAt ?? ""
                let d2 = w2.widgetUpdatedAt ?? ""
                return d1 > d2
            }
        } catch {
            self.errorMessage = error.localizedDescription
        }
        isLoading = false
    }
    
    func saveFirstDeal() async {
        actionStatus = "Saving first deal..."
        
        do {
            // Get deals list
            let dealsRequest = URLRequest(url: AppEnvironment.productBaseURL.appendingPathComponent("/v1/deals"))
            let deals: [Deal] = try await client.request(dealsRequest)
            
            guard let deal = deals.first else {
                actionStatus = "No deals available"
                return
            }
            
            // Save first deal
            var saveRequest = URLRequest(url: AppEnvironment.productBaseURL.appendingPathComponent("/v1/deals/\(deal.id)/save"))
            saveRequest.httpMethod = "POST"
            saveRequest.addValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
            
            let _ = try await client.requestData(saveRequest)
            actionStatus = "Saved: \(deal.title)"
            
            // Auto-refresh after 1s
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            await fetchWidgets()
        } catch {
            actionStatus = "Error: \(error.localizedDescription)"
        }
    }
    
    func unsaveLastSaved() async {
        actionStatus = "Unsaving last saved..."
        
        do {
            // Get saved deals
            var savedRequest = URLRequest(url: AppEnvironment.productBaseURL.appendingPathComponent("/v1/me/saved"))
            savedRequest.addValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
            let saved: [Deal] = try await client.request(savedRequest)
            
            guard let deal = saved.last else {
                actionStatus = "No saved deals"
                return
            }
            
            // Unsave last saved
            var unsaveRequest = URLRequest(url: AppEnvironment.productBaseURL.appendingPathComponent("/v1/deals/\(deal.id)/unsave"))
            unsaveRequest.httpMethod = "POST"
            unsaveRequest.addValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
            
            let _ = try await client.requestData(unsaveRequest)
            actionStatus = "Unsaved: \(deal.title)"
            
            // Auto-refresh after 1s
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            await fetchWidgets()
        } catch {
            actionStatus = "Error: \(error.localizedDescription)"
        }
    }
    
    func checkHealth() async {
        healthStatus = "Checking..."
        let request = URLRequest(url: AppEnvironment.coreBaseURL.appendingPathComponent("/health"))
        
        do {
            struct Health: Decodable { let status: String }
            let res: Health = try await client.request(request)
            healthStatus = "Core API: \(res.status)"
        } catch {
            healthStatus = "Health check failed: \(error.localizedDescription)"
        }
    }
}
