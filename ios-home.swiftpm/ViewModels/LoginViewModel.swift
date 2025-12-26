import SwiftUI

@MainActor
class LoginViewModel: ObservableObject {
    @Published var userId = ""
    @Published var jwt: String?
    @Published var isLoading = false
    @Published var error: String?
    
    private let client = APIClient()
    
    func login() async {
        guard !userId.isEmpty else { return }
        isLoading = true
        error = nil
        
        var request = URLRequest(url: AppEnvironment.productBaseURL.appendingPathComponent("/v1/auth/login"))
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["userId": userId]
        request.httpBody = try? JSONEncoder().encode(body)
        
        do {
            struct LoginResponse: Decodable { let token: String }
            let res: LoginResponse = try await client.request(request)
            self.jwt = res.token
        } catch {
            self.error = "Login failed: \(error.localizedDescription)"
        }
        isLoading = false
    }
}
