import Foundation

@MainActor
class HomeViewModel: ObservableObject {
    @Published var widgets: [SDUIWidget] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var healthStatus: String?
    
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
            self.widgets = try await client.request(request)
        } catch {
            self.errorMessage = error.localizedDescription
        }
        isLoading = false
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
