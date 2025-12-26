import Foundation
import OSLog

enum APIError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case serverError(Int)
    case unauthenticated
    case decodingError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .networkError(let e): return "Network error: \(e.localizedDescription)"
        case .serverError(let code): return "Server error (Code: \(code))"
        case .unauthenticated: return "Authentication failed"
        case .decodingError(let e): return "Data format error: \(e.localizedDescription)"
        }
    }
}

class APIClient {
    private let session: URLSession
    private let logger = Logger(subsystem: "com.check24.ios-home", category: "Networking")
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10.0
        self.session = URLSession(configuration: config)
    }
    
    func request<T: Decodable>(_ request: URLRequest, retries: Int = 3) async throws -> T {
        var lastError: Error?
        let backoffs = [0.5, 1.0, 2.0]
        
        for attempt in 0...retries {
            if attempt > 0 {
                let delay = backoffs[min(attempt - 1, backoffs.count - 1)]
                logger.debug("Retry attempt \(attempt) after \(delay)s delay")
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
            
            do {
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw APIError.networkError(NSError(domain: "Networking", code: -1))
                }
                
                // Stop retrying on 4xx (except 429)
                if (400...499).contains(httpResponse.statusCode) && httpResponse.statusCode != 429 {
                    if httpResponse.statusCode == 401 { throw APIError.unauthenticated }
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                // Retry on 5xx or 429
                if httpResponse.statusCode == 429 || (500...599).contains(httpResponse.statusCode) {
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                do {
                    return try JSONDecoder().decode(T.self, from: data)
                } catch {
                    throw APIError.decodingError(error)
                }
                
            } catch let error as APIError {
                lastError = error
                // If it's a non-retryable error, throw immediately
                if case .serverError(let code) = error, (400...499).contains(code), code != 429 {
                    throw error
                }
                if case .unauthenticated = error { throw error }
                if case .decodingError = error { throw error }
            } catch {
                lastError = APIError.networkError(error)
                logger.error("Request failure: \(error.localizedDescription)")
            }
        }
        
        throw lastError ?? APIError.networkError(NSError(domain: "Networking", code: -1))
    }
}
